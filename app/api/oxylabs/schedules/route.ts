import { z } from "zod"

import { OxylabsError } from "@/lib/oxylabs/client"
import { createHomepageSchedule, listOxylabsSchedules, setOxylabsScheduleActive } from "@/lib/oxylabs/scheduler-client"
import { AdminSecretConfigurationError, isAuthorizedAdminRequest } from "@/lib/security/admin-secret"
import {
  listActiveScheduleSources,
  listStoredSchedules,
  setStoredScheduleState,
  upsertStoredSchedule,
} from "@/lib/supabase/queries/schedules"

export const runtime = "nodejs"
const scheduleRequestSchema = z.object({}).strict().optional()

export async function GET() {
  try {
    return Response.json({ schedules: await listStoredSchedules() })
  } catch (error) {
    console.error("[API] Unable to load Oxylabs schedules", error)
    return Response.json({ error: "Unable to load schedules." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdminRequest(request)) return Response.json({ error: "Unauthorized." }, { status: 401 })
    const rawBody = await request.text()
    if (rawBody.length > 1_000 || (rawBody.trim() && !scheduleRequestSchema.safeParse(JSON.parse(rawBody)).success)) {
      return Response.json({ error: "Invalid schedule sync request." }, { status: 400 })
    }

    const [sources, stored] = await Promise.all([listActiveScheduleSources(), listStoredSchedules()])
    const bySource = new Map(stored.map((schedule) => [schedule.source_id, schedule]))
    let created = 0
    let reactivated = 0
    let paused = 0

    for (const source of sources) {
      const existing = bySource.get(source.id)
      if (existing?.oxylabs_schedule_id && existing.is_active && existing.status === "active") continue
      if (existing?.oxylabs_schedule_id) {
        try {
          await setOxylabsScheduleActive(existing.oxylabs_schedule_id, true)
          await setStoredScheduleState(source.id, true, "active")
          reactivated += 1
          continue
        } catch {
          // Replace stale schedule IDs below; the orphan cleanup will deactivate the stale ID.
        }
      }
      const id = await createHomepageSchedule(source.listing_url)
      await upsertStoredSchedule({ sourceId: source.id, oxylabsScheduleId: id, expression: "0 * * * *" })
      created += 1
    }

    const activeIds = new Set(sources.map((source) => source.id))
    for (const schedule of stored) {
      if (activeIds.has(schedule.source_id) || !schedule.is_active || !schedule.oxylabs_schedule_id) continue
      await setOxylabsScheduleActive(schedule.oxylabs_schedule_id, false)
      await setStoredScheduleState(schedule.source_id, false, "paused")
      paused += 1
    }

    const [remoteIds, refreshed] = await Promise.all([listOxylabsSchedules(), listStoredSchedules()])
    const trackedIds = new Set(refreshed.flatMap((schedule) => schedule.oxylabs_schedule_id ? [schedule.oxylabs_schedule_id] : []))
    let orphaned = 0
    for (const remoteId of remoteIds) {
      if (trackedIds.has(remoteId)) continue
      await setOxylabsScheduleActive(remoteId, false)
      orphaned += 1
    }

    return Response.json({ status: "success", created, reactivated, paused, orphaned })
  } catch (error) {
    if (error instanceof AdminSecretConfigurationError) {
      return Response.json({ error: "Scheduler server configuration is incomplete." }, { status: 500 })
    }
    if (error instanceof SyntaxError) return Response.json({ error: "Request body must be valid JSON." }, { status: 400 })
    console.error("[API] Oxylabs schedule sync failed", error)
    const status = error instanceof OxylabsError && error.kind === "configuration" ? 500 : 502
    return Response.json({ error: "Unable to sync Oxylabs schedules." }, { status })
  }
}
