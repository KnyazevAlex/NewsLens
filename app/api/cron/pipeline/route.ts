import { timingSafeEqual } from "node:crypto"

import { flushAiObservability, flushPostHogLogs } from "@/instrumentation"
import { processScheduledResults } from "@/lib/oxylabs/scheduled-results"
import { runArticleAnalysis } from "@/lib/analysis/pipeline"
import { writeScheduleLog } from "@/lib/supabase/queries/schedules"

export const runtime = "nodejs"
export const maxDuration = 300

function authorizedCronRequest(request: Request) {
  if (process.env.NODE_ENV === "development") return true
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get("authorization")
  if (!secret || !authorization?.startsWith("Bearer ")) return false
  const supplied = Buffer.from(authorization.slice("Bearer ".length))
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function hasNonSuccessStatus(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const status = (value as Record<string, unknown>).status
  return status === "partial" || status === "failed"
}

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return Response.json({ error: "Unauthorized." }, { status: 401 })

  let scheduledResults: unknown = null
  let scheduledError: string | null = null
  let analysis: unknown = null
  let analysisError: string | null = null

  try {
    console.info("[Cron] Scheduled result processing started")
    scheduledResults = await processScheduledResults()
  } catch (error) {
    scheduledError = error instanceof Error ? error.message : "Scheduled result processing failed"
    console.error("[Cron] Scheduled result processing failed", error)
  }

  try {
    console.info("[Cron] Pending article analysis started")
    analysis = await runArticleAnalysis({})
  } catch (error) {
    analysisError = error instanceof Error ? error.message : "Article analysis failed"
    console.error("[Cron] Pending article analysis failed", error)
  } finally {
    await Promise.all([flushAiObservability(), flushPostHogLogs()])
  }

  const result = {
    status: scheduledError || analysisError || hasNonSuccessStatus(scheduledResults) || hasNonSuccessStatus(analysis)
      ? "partial"
      : "success",
    scheduledResults,
    scheduledError,
    analysis,
    analysisError,
  }
  await writeScheduleLog({
    level: result.status === "success" ? "success" : "error",
    event: "cron.pipeline.completed",
    message: `Cron pipeline ${result.status}.`,
    metadata: result as unknown as import("@/lib/supabase/types").Json,
  })
  console.info("[Cron] Pipeline completed", result)
  return Response.json(result, { status: result.status === "success" ? 200 : 500 })
}
