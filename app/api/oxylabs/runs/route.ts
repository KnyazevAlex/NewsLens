import { z } from "zod"

import { listScheduleRuns } from "@/lib/supabase/queries/schedules"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limitInput = url.searchParams.get("limit") ?? "100"
  const parsed = z.coerce.number().int().min(1).max(500).safeParse(limitInput)
  if (!parsed.success) return Response.json({ error: "Invalid limit." }, { status: 400 })
  try {
    return Response.json({ runs: await listScheduleRuns(parsed.data) })
  } catch (error) {
    console.error("[API] Unable to load Oxylabs runs", error)
    return Response.json({ error: "Unable to load schedule runs." }, { status: 500 })
  }
}
