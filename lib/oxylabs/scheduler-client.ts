import "server-only"

import { OxylabsError } from "@/lib/oxylabs/client"

const OXYLABS_API = "https://data.oxylabs.io/v1"
const OXYLABS_TIMEOUT_MS = 180_000

type JsonRecord = Record<string, unknown>

function credentials() {
  const username = process.env.OXY_WSA_USERNAME
  const password = process.env.OXY_WSA_PASSWORD
  if (!username || !password) {
    throw new OxylabsError("configuration", "Missing Oxylabs Scheduler credentials")
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}

/** Preserve Oxylabs 64-bit identifiers before JSON.parse can round them. */
function parseOxylabsJson(raw: string): unknown {
  const safeJson = raw.replace(
    /("(?:schedule_id|run_id|job_id|id)"\s*:\s*)(\d{16,})(?=\s*[,}])/g,
    '$1"$2"',
  )
  try {
    return JSON.parse(safeJson) as unknown
  } catch {
    throw new OxylabsError("provider", "Oxylabs Scheduler returned malformed JSON")
  }
}

async function request(path: string, init: RequestInit = {}) {
  const authorization = credentials()
  let response: Response
  try {
    response = await fetch(`${OXYLABS_API}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(OXYLABS_TIMEOUT_MS),
      headers: {
        Authorization: authorization,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new OxylabsError("provider", "Oxylabs Scheduler request failed")
  }
  const raw = await response.text()
  if (!response.ok) {
    throw new OxylabsError("provider", `Oxylabs Scheduler returned HTTP ${response.status}`)
  }
  return raw ? parseOxylabsJson(raw) : null
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

export async function createHomepageSchedule(url: string) {
  const end = new Date()
  end.setUTCFullYear(end.getUTCFullYear() + 10)
  const payload = await request("/schedules", {
    method: "POST",
    body: JSON.stringify({
      cron: "0 * * * *",
      items: [{ source: "universal", url, render: "html" }],
      end_time: end.toISOString().replace("T", " ").slice(0, 19),
    }),
  })
  const scheduleId = record(payload).schedule_id
  if (typeof scheduleId !== "string" && typeof scheduleId !== "number") {
    throw new OxylabsError("provider", "Oxylabs Scheduler did not return a schedule ID")
  }
  return String(scheduleId)
}

export async function listOxylabsSchedules(): Promise<string[]> {
  const payload = await request("/schedules")
  const root = record(payload)
  const schedules = Array.isArray(payload)
    ? payload
    : Array.isArray(root.schedules)
      ? root.schedules
      : Array.isArray(root.schedule_ids)
        ? root.schedule_ids
        : []
  return schedules.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") return [String(item)]
    const id = record(item).schedule_id ?? record(item).id
    return typeof id === "string" || typeof id === "number" ? [String(id)] : []
  })
}

export async function setOxylabsScheduleActive(scheduleId: string, active: boolean) {
  await request(`/schedules/${encodeURIComponent(scheduleId)}/state`, {
    method: "PUT",
    body: JSON.stringify({ active }),
  })
}

export async function getOxylabsScheduleRuns(scheduleId: string) {
  const payload = await request(`/schedules/${encodeURIComponent(scheduleId)}/runs`)
  const root = record(payload)
  return Array.isArray(payload)
    ? payload
    : Array.isArray(root.runs)
      ? root.runs
      : Array.isArray(root.data)
        ? root.data
        : []
}

export async function getOxylabsJobResult(jobId: string) {
  return request(`/queries/${encodeURIComponent(jobId)}`)
}

export function extractHtmlResult(payload: unknown): string | null {
  const root = record(payload)
  const results = Array.isArray(root.results) ? root.results : []
  for (const item of results) {
    const candidate = record(item).content
    if (typeof candidate === "string" && candidate.trim()) return candidate
  }
  const content = root.content
  return typeof content === "string" && content.trim() ? content : null
}
