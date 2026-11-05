import "server-only"

import { assertOxylabsConfiguration, fetchHtmlThroughOxylabs, OxylabsError } from "@/lib/oxylabs/client"
import { extractHomepageCandidates, parseArticlePage } from "@/lib/scraping/parser"
import type { ScrapeSummary, ScrapingSource, SourceScrapeSummary } from "@/lib/scraping/types"
import {
  findExistingArticleUrls,
  insertScrapedArticle,
  listActiveScrapingSources,
  writeScrapeLog,
} from "@/lib/supabase/queries/scraping"
import type { Json } from "@/lib/supabase/types"

const MAX_CANDIDATES_PER_SOURCE = 80

export class SourceSelectionError extends Error {
  /** Create an error explaining why selected sources cannot be scraped. */
  constructor(message: string) {
    super(message)
    this.name = "SourceSelectionError"
  }
}

interface RunScrapeInput {
  sourceIds?: string[]
  limitPerSource: number
  homepageHtmlsBySource?: Record<string, string[]>
  label?: "Manual" | "Scheduled"
}

/**
 * Add an occurrence count to a rejection reason in the mutable run summary.
 */
function incrementReason(summary: ScrapeSummary, reason: string, amount = 1) {
  summary.rejectionReasons[reason] = (summary.rejectionReasons[reason] ?? 0) + amount
}

/**
 * Accumulate extraction rejection counts into the mutable run summary.
 */
function mergeReasons(summary: ScrapeSummary, reasons: Record<string, number>) {
  for (const [reason, count] of Object.entries(reasons)) incrementReason(summary, reason, count)
}

/**
 * Write a scrape event and its metadata to the informational console log.
 */
function logConsole(event: string, metadata: Record<string, unknown> = {}) {
  console.info(`[Scrape] ${event}`, metadata)
}

/**
 * Write an event to the console and attempt database logging without propagating logging failures.
 */
async function logEvent(input: {
  level?: "debug" | "info" | "warning" | "error" | "success"
  event: string
  message: string
  metadata?: Json
  sourceId?: string
  articleId?: string
}) {
  logConsole(input.event, input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
    ? input.metadata as Record<string, unknown>
    : {})
  try {
    await writeScrapeLog({ ...input, level: input.level ?? "info" })
  } catch (error) {
    console.warn("[Scrape] Unable to persist operational log", {
      event: input.event,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * Return an Oxylabs error message or a generic message for other failures.
 */
function safeFailureMessage(error: unknown) {
  if (error instanceof OxylabsError) return error.message
  return "Scraping operation failed"
}

/**
 * Load selected active sources, or all active sources when no IDs are supplied.
 * @throws {SourceSelectionError} If any requested source is missing or inactive.
 */
async function resolveSources(sourceIds?: string[]) {
  const sources = await listActiveScrapingSources(sourceIds)
  if (!sourceIds?.length) return sources

  const foundIds = new Set(sources.map((source) => source.id))
  const unmatched = sourceIds.filter((id) => !foundIds.has(id))
  if (unmatched.length) {
    throw new SourceSelectionError(`Some selected sources are missing or inactive: ${unmatched.join(", ")}`)
  }
  return sources
}

/**
 * Fetch a source homepage and insert valid, unique articles up to the source limit.
 * Update the shared run counters and return source counts with completion status.
 */
async function processSource(
  source: ScrapingSource,
  limitPerSource: number,
  summary: ScrapeSummary,
  scheduledHomepages?: string[],
): Promise<{ sourceSummary: SourceScrapeSummary; completed: boolean }> {
  const sourceSummary: SourceScrapeSummary = {
    sourceId: source.id,
    sourceName: source.name,
    candidatesFound: 0,
    articlesInserted: 0,
  }

  await logEvent({
    event: "scrape.source.started",
    message: `Scraping ${source.name}`,
    metadata: { source_name: source.name, parser_strategy: source.parser_strategy },
    sourceId: source.id,
  })

  const candidateBudget = Math.min(MAX_CANDIDATES_PER_SOURCE, Math.max(20, limitPerSource * 8))
  let homepageHtmls = scheduledHomepages
  if (!homepageHtmls) {
    try {
      homepageHtmls = [await fetchHtmlThroughOxylabs(source.listing_url)]
      await logEvent({
        event: "scrape.homepage.fetched",
        message: `Fetched ${source.name} homepage`,
        metadata: { source_name: source.name },
        sourceId: source.id,
      })
    } catch (error) {
      if (error instanceof OxylabsError && error.kind === "configuration") throw error
      const message = safeFailureMessage(error)
      sourceSummary.error = message
      incrementReason(summary, "homepage_fetch_failed")
      await logEvent({
        level: "error",
        event: "scrape.source.failed",
        message: `Unable to scrape ${source.name}`,
        metadata: { source_name: source.name, reason: message },
        sourceId: source.id,
      })
      return { sourceSummary, completed: false }
    }
  }

  if (!homepageHtmls.length) {
    sourceSummary.error = "No completed Oxylabs homepage results were available"
    incrementReason(summary, "scheduled_homepage_missing")
    return { sourceSummary, completed: false }
  }

  const urls = new Set<string>()
  for (const html of homepageHtmls) {
    const extraction = extractHomepageCandidates(html, source.listing_url, candidateBudget)
    for (const url of extraction.urls) urls.add(url)
    summary.candidatesRejected += extraction.rejected
    mergeReasons(summary, extraction.rejectionReasons)
  }
  const candidateUrls = [...urls].slice(0, candidateBudget)
  sourceSummary.candidatesFound = candidateUrls.length
  summary.candidatesFound += candidateUrls.length

  await logEvent({
    event: "scrape.candidates.extracted",
    message: `Found ${candidateUrls.length} candidate articles for ${source.name}`,
    metadata: {
      source_name: source.name,
      candidates_found: candidateUrls.length,
      homepage_results: homepageHtmls.length,
    },
    sourceId: source.id,
  })

  const existingUrls = await findExistingArticleUrls(candidateUrls)
  const candidates = candidateUrls.filter((url) => {
    if (!existingUrls.has(url)) return true
    summary.duplicatesSkipped += 1
    return false
  })

  for (const candidateUrl of candidates) {
    if (sourceSummary.articlesInserted >= limitPerSource) break

    let detailHtml: string
    try {
      detailHtml = await fetchHtmlThroughOxylabs(candidateUrl)
      summary.detailPagesScraped += 1
    } catch (error) {
      summary.articlesFailed += 1
      incrementReason(summary, "detail_fetch_failed")
      console.error("[Scrape] scrape.article.fetch_failed", {
        sourceName: source.name,
        targetUrl: candidateUrl,
        reason: safeFailureMessage(error),
      })
      continue
    }

    const parsed = parseArticlePage(detailHtml, candidateUrl, source.listing_url)
    if (!parsed.accepted) {
      summary.articlesRejected += 1
      incrementReason(summary, parsed.reason)
      logConsole("scrape.article.rejected", { sourceName: source.name, targetUrl: candidateUrl, reason: parsed.reason })
      continue
    }

    try {
      const detailDuplicates = await findExistingArticleUrls([
        parsed.article.original_url,
        parsed.article.canonical_url ?? "",
      ])
      if (detailDuplicates.size) {
        summary.duplicatesSkipped += 1
        continue
      }

      const result = await insertScrapedArticle({ ...parsed.article, source_id: source.id })
      if (!result.inserted) {
        summary.duplicatesSkipped += 1
        continue
      }

      summary.articlesInserted += 1
      sourceSummary.articlesInserted += 1
      await logEvent({
        level: "success",
        event: "scrape.article.inserted",
        message: "Article scraped and inserted",
        metadata: { source_name: source.name, article_title: parsed.article.title },
        sourceId: source.id,
        articleId: result.articleId,
      })
    } catch (error) {
      summary.articlesFailed += 1
      incrementReason(summary, "article_insert_failed")
      console.error("[Scrape] scrape.article.insert_failed", {
        sourceName: source.name,
        targetUrl: candidateUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  await logEvent({
    level: "success",
    event: "scrape.source.completed",
    message: `Completed scraping ${source.name}`,
    metadata: {
      source_name: source.name,
      candidates_found: sourceSummary.candidatesFound,
      articles_inserted: sourceSummary.articlesInserted,
    },
    sourceId: source.id,
  })
  return { sourceSummary, completed: true }
}

/**
 * Scrape selected active sources sequentially and return aggregate counts and status.
 * Persist operational logs and collect source and article failures in the summary.
 * Configuration errors and source-selection errors propagate to the caller.
 */
async function runScrape(input: RunScrapeInput): Promise<ScrapeSummary> {
  const startedAt = Date.now()
  if (!input.homepageHtmlsBySource) assertOxylabsConfiguration()
  const sources = await resolveSources(input.sourceIds)
  const label = input.label ?? "Manual"
  const summary: ScrapeSummary = {
    status: "success",
    sourcesChecked: 0,
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
    totalDurationMs: 0,
    rejectionReasons: {},
    sources: [],
  }

  await logEvent({
    event: "scrape.run.started",
    message: `${label} scrape started`,
    metadata: {
      selected_sources: sources.map((source) => source.name),
      limit_per_source: input.limitPerSource,
    },
  })

  let completedSources = 0
  for (const source of sources) {
    summary.sourcesChecked += 1
    try {
      const result = await processSource(
        source,
        input.limitPerSource,
        summary,
        input.homepageHtmlsBySource?.[source.id],
      )
      summary.sources.push(result.sourceSummary)
      if (result.completed) completedSources += 1
    } catch (error) {
      if (error instanceof OxylabsError && error.kind === "configuration") throw error
      const message = safeFailureMessage(error)
      incrementReason(summary, "source_pipeline_failed")
      summary.sources.push({
        sourceId: source.id,
        sourceName: source.name,
        candidatesFound: 0,
        articlesInserted: 0,
        error: message,
      })
      console.error("[Scrape] scrape.source.pipeline_failed", {
        sourceName: source.name,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const hasFailures = completedSources < sources.length || summary.articlesFailed > 0
  summary.status = sources.length > 0 && completedSources === 0 ? "failed" : hasFailures ? "partial" : "success"
  summary.totalDurationMs = Date.now() - startedAt

  await logEvent({
    level: summary.status === "success" ? "success" : summary.status === "partial" ? "warning" : "error",
    event: `scrape.run.${summary.status}`,
    message: `${label} scrape ${summary.status}`,
    metadata: {
      status: summary.status,
      sources_checked: summary.sourcesChecked,
      candidates_found: summary.candidatesFound,
      candidates_rejected: summary.candidatesRejected,
      duplicates_skipped: summary.duplicatesSkipped,
      detail_pages_scraped: summary.detailPagesScraped,
      articles_inserted: summary.articlesInserted,
      articles_rejected: summary.articlesRejected,
      articles_failed: summary.articlesFailed,
      total_duration_ms: summary.totalDurationMs,
      rejection_reasons: summary.rejectionReasons,
    },
  })

  return summary
}

export async function runManualScrape(input: Omit<RunScrapeInput, "homepageHtmlsBySource" | "label">) {
  return runScrape(input)
}

export async function runScheduledScrape(homepageHtmlsBySource: Record<string, string[]>, limitPerSource = 5) {
  const sourceIds = Object.entries(homepageHtmlsBySource)
    .filter(([, htmls]) => htmls.length > 0)
    .map(([sourceId]) => sourceId)
  if (!sourceIds.length) {
    return {
      status: "success" as const,
      sourcesChecked: 0,
      candidatesFound: 0,
      candidatesRejected: 0,
      duplicatesSkipped: 0,
      detailPagesScraped: 0,
      articlesInserted: 0,
      articlesRejected: 0,
      articlesFailed: 0,
      totalDurationMs: 0,
      rejectionReasons: {},
      sources: [],
    } satisfies ScrapeSummary
  }
  return runScrape({ sourceIds, limitPerSource, homepageHtmlsBySource, label: "Scheduled" })
}
