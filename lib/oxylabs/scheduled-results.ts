import "server-only"

import {
  extractHtmlResult,
  getOxylabsJobResult,
  getOxylabsScheduleRuns,
} from "@/lib/oxylabs/scheduler-client"
import { runScheduledScrape } from "@/lib/scraping/pipeline"
import {
  listActiveStoredSchedules,
  listCompletedScheduleRunIds,
  saveScheduleRun,
  writeScheduleLog,
} from "@/lib/supabase/queries/schedules"
import type { Json } from "@/lib/supabase/types"

type RecordValue = Record<string, unknown>

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {}
}

function asId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null
}

function getRunId(run: unknown) {
  const item = asRecord(run)
  return asId(item.run_id) ?? asId(item.id)
}

function completedJobs(run: unknown) {
  const item = asRecord(run)
  const jobs = Array.isArray(item.jobs) ? item.jobs : Array.isArray(item.results) ? item.results : []
  const fromList = jobs.flatMap((job) => {
    const value = asRecord(job)
    if (value.result_status !== "done") return []
    const id = asId(value.job_id) ?? asId(value.id)
    return id ? [id] : []
  })
  if (fromList.length) return fromList
  if (item.result_status === "done") {
    const id = asId(item.job_id) ?? asId(item.id)
    return id ? [id] : []
  }
  return []
}

/** Fetch only completed job results, deduplicate processed runs, then reuse the scrape pipeline. */
export async function processScheduledResults(limitPerSource = 5) {
  const startedAt = Date.now()
  const [schedules, processedRuns] = await Promise.all([
    listActiveStoredSchedules(),
    listCompletedScheduleRunIds(),
  ])
  const homepageHtmlsBySource: Record<string, string[]> = {}
  const runRecords: Array<{ scheduleId: string; runId: string; sourceId: string; jobFailures: number }> = []
  let runsSeen = 0
  let jobsFetched = 0
  let jobsFailed = 0
  let scheduleFetchFailures = 0

  for (const schedule of schedules) {
    const oxylabsScheduleId = schedule.oxylabs_schedule_id
    if (!oxylabsScheduleId) continue
    const source = Array.isArray(schedule.sources) ? schedule.sources[0] : schedule.sources
    const sourceId = source?.id ?? schedule.source_id
    try {
      const runs = await getOxylabsScheduleRuns(oxylabsScheduleId)
      for (const run of runs) {
        const runId = getRunId(run)
        if (!runId || processedRuns.has(runId)) continue
        const jobIds = completedJobs(run)
        if (!jobIds.length) continue
        runsSeen += 1
        const runRecord = { scheduleId: schedule.id, runId, sourceId, jobFailures: 0 }
        runRecords.push(runRecord)
        await saveScheduleRun({ scheduleId: schedule.id, oxylabsRunId: runId, status: "running" })

        for (const jobId of jobIds) {
          try {
            const result = extractHtmlResult(await getOxylabsJobResult(jobId))
            if (!result) {
              jobsFailed += 1
              runRecord.jobFailures += 1
              continue
            }
            homepageHtmlsBySource[sourceId] ??= []
            homepageHtmlsBySource[sourceId].push(result)
            jobsFetched += 1
          } catch {
            jobsFailed += 1
            runRecord.jobFailures += 1
          }
        }
      }
    } catch (error) {
      scheduleFetchFailures += 1
      console.error("[Scheduler] Unable to read schedule runs", {
        sourceId,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      await writeScheduleLog({
        level: "error",
        event: "scheduler.runs.fetch_failed",
        message: "Unable to read Oxylabs schedule runs.",
        sourceId,
        metadata: { source_id: sourceId } as Json,
      })
    }
  }

  const scrape = await runScheduledScrape(homepageHtmlsBySource, limitPerSource)
  const summary = {
    status: (jobsFailed || scheduleFetchFailures) && scrape.status === "success" ? "partial" : scrape.status,
    schedulesChecked: schedules.length,
    runsSeen,
    jobsFetched,
    jobsFailed,
    scheduleFetchFailures,
    scrape,
    totalDurationMs: Date.now() - startedAt,
  }

  for (const run of runRecords) {
    await saveScheduleRun({
      scheduleId: run.scheduleId,
      oxylabsRunId: run.runId,
      status: run.jobFailures > 0 || summary.status === "failed" ? "failed" : "done",
      summary: summary as unknown as Json,
      completedAt: new Date().toISOString(),
      errorMessage: jobsFailed ? `${jobsFailed} scheduled result job(s) failed` : null,
    })
  }

  console.info("[Scheduler] Scheduled result processing completed", summary)
  await writeScheduleLog({
    level: summary.status === "success" ? "success" : summary.status === "partial" ? "warning" : "error",
    event: "scheduler.results.completed",
    message: `Scheduled result processing ${summary.status}.`,
    metadata: summary as unknown as Json,
  })
  return summary
}
