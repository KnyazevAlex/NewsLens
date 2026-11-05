import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Json, TableRow } from "@/lib/supabase/types"

export type StoredSchedule = TableRow<"oxylabs_schedules">

function fail(operation: string, error: { message: string; code?: string }): never {
  console.error(`[Supabase] ${operation}`, { code: error.code, message: error.message })
  throw new Error(`Unable to ${operation}.`)
}

export async function listActiveScheduleSources() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("sources")
    .select("id, name, listing_url").eq("is_active", true).order("name")
  if (error) fail("load active schedule sources", error)
  return data ?? []
}

export async function upsertStoredSchedule(input: {
  sourceId: string
  oxylabsScheduleId: string
  expression: string
}) {
  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from("oxylabs_schedules").upsert({
    source_id: input.sourceId,
    oxylabs_schedule_id: input.oxylabsScheduleId,
    status: "active",
    is_active: true,
    schedule_expression: input.expression,
    last_synced_at: now,
    updated_at: now,
  }, { onConflict: "source_id" })
  if (error) fail("save Oxylabs schedule", error)
}

export async function setStoredScheduleState(sourceId: string, active: boolean, status: "active" | "paused" | "error") {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("oxylabs_schedules").update({
    is_active: active,
    status,
    updated_at: new Date().toISOString(),
  }).eq("source_id", sourceId)
  if (error) fail("update Oxylabs schedule state", error)
}

export async function listStoredSchedules() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("oxylabs_schedules")
    .select("*, sources(name, listing_url)").order("created_at", { ascending: true })
  if (error) fail("load Oxylabs schedules", error)
  return data ?? []
}

export async function listActiveStoredSchedules() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("oxylabs_schedules")
    .select("id, source_id, oxylabs_schedule_id, sources(id, name, listing_url)")
    .eq("is_active", true).not("oxylabs_schedule_id", "is", null)
  if (error) fail("load active Oxylabs schedules", error)
  return (data ?? []).filter((row) => row.oxylabs_schedule_id)
}

export async function saveScheduleRun(input: {
  scheduleId: string
  oxylabsRunId: string
  status: "running" | "done" | "failed"
  summary?: Json
  errorMessage?: string | null
  startedAt?: string | null
  completedAt?: string | null
}) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("oxylabs_schedule_runs").upsert({
    schedule_id: input.scheduleId,
    oxylabs_run_id: input.oxylabsRunId,
    result_status: input.status,
    summary: input.summary ?? {},
    error_message: input.errorMessage ?? null,
    started_at: input.startedAt ?? null,
    completed_at: input.completedAt ?? null,
  }, { onConflict: "oxylabs_run_id" })
  if (error) fail("save Oxylabs schedule run", error)
}

export async function listCompletedScheduleRunIds() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("oxylabs_schedule_runs")
    .select("oxylabs_run_id").eq("result_status", "done").not("oxylabs_run_id", "is", null)
  if (error) fail("load processed Oxylabs runs", error)
  return new Set((data ?? []).flatMap((row) => row.oxylabs_run_id ? [row.oxylabs_run_id] : []))
}

export async function listScheduleRuns(limit = 100) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("oxylabs_schedule_runs")
    .select("*, oxylabs_schedules(source_id, sources(name))")
    .order("created_at", { ascending: false }).limit(limit)
  if (error) fail("load Oxylabs schedule runs", error)
  return data ?? []
}

export async function writeScheduleLog(input: {
  level: "info" | "warning" | "error" | "success"
  event: string
  message: string
  metadata?: Json
  sourceId?: string
}) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("logs").insert({
    level: input.level,
    event: input.event,
    message: input.message,
    metadata: input.metadata ?? {},
    source_id: input.sourceId ?? null,
  })
  if (error) console.warn("[Scheduler] Unable to persist log", { event: input.event, code: error.code })
}
