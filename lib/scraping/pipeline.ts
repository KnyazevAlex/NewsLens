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
  constructor(message: string) {
    super(message)
    this.name = "SourceSelectionError"
  }
}

interface RunScrapeInput {
  sourceIds?: string[]
  limitPerSource: number
}

function incrementReason(summary: ScrapeSummary, reason: string, amount = 1) {
  summary.rejectionReasons[reason] = (summary.rejectionReasons[reason] ?? 0) + amount
}

function mergeReasons(summary: ScrapeSummary, reasons: Record<string, number>) {
  for (const [reason, count] of Object.entries(reasons)) incrementReason(summary, reason, count)
}

function logConsole(event: string, metadata: Record<string, unknown> = {}) {
  console.info(`[Scrape] ${event}`, metadata)
}

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

function safeFailureMessage(error: unknown) {
  if (error instanceof OxylabsError) return error.message
  return "Scraping operation failed"
}

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

async function processSource(
  source: ScrapingSource,
  limitPerSource: number,
  summary: ScrapeSummary,
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

  let homepageHtml: string
  try {
    homepageHtml = await fetchHtmlThroughOxylabs(source.listing_url)
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

  const candidateBudget = Math.min(MAX_CANDIDATES_PER_SOURCE, Math.max(20, limitPerSource * 8))
  const extraction = extractHomepageCandidates(homepageHtml, source.listing_url, candidateBudget)
  sourceSummary.candidatesFound = extraction.urls.length
  summary.candidatesFound += extraction.urls.length
  summary.candidatesRejected += extraction.rejected
  mergeReasons(summary, extraction.rejectionReasons)

  await logEvent({
    event: "scrape.candidates.extracted",
    message: `Found ${extraction.urls.length} candidate articles for ${source.name}`,
    metadata: {
      source_name: source.name,
      candidates_found: extraction.urls.length,
      candidates_rejected: extraction.rejected,
    },
    sourceId: source.id,
  })

  const existingUrls = await findExistingArticleUrls(extraction.urls)
  const candidates = extraction.urls.filter((url) => {
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

export async function runManualScrape(input: RunScrapeInput): Promise<ScrapeSummary> {
  const startedAt = Date.now()
  assertOxylabsConfiguration()
  const sources = await resolveSources(input.sourceIds)
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
    message: "Manual scrape started",
    metadata: {
      selected_sources: sources.map((source) => source.name),
      limit_per_source: input.limitPerSource,
    },
  })

  let completedSources = 0
  for (const source of sources) {
    summary.sourcesChecked += 1
    try {
      const result = await processSource(source, input.limitPerSource, summary)
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
    message: `Manual scrape ${summary.status}`,
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
