import "server-only"

import {
  analyzeArticle,
  assertAnalysisConfiguration,
  embedArticle,
  getEmbeddingModelName,
  getAnalysisModelName,
} from "@/lib/ai/article-analysis"
import type { AnalysisFailure, AnalysisRunSummary } from "@/lib/ai/types"
import {
  getPendingArticlesSnapshot,
  saveArticleAnalysis,
  saveArticleEmbedding,
  writeAnalysisLog,
} from "@/lib/supabase/queries/analysis"

const DEFAULT_BATCH_SIZE = 5
const MINIMUM_ARTICLE_CHARACTERS = 200

export interface RunAnalysisOptions {
  articleIds?: string[]
  limit?: number
  batchSize?: number
}

/**
 * Read ANALYSIS_BATCH_SIZE as an integer from 1 to 10, defaulting to five.
 */
function configuredBatchSize() {
  const configured = Number.parseInt(process.env.ANALYSIS_BATCH_SIZE ?? "", 10)
  return Number.isInteger(configured) && configured >= 1 && configured <= 10
    ? configured
    : DEFAULT_BATCH_SIZE
}

/**
 * Classify a run from newly analyzed and failed counts; zero failures means success.
 */
function getStatus(analyzed: number, failed: number): AnalysisRunSummary["status"] {
  if (failed === 0) return "success"
  return analyzed > 0 ? "partial" : "failed"
}

/**
 * Process a pending-article snapshot sequentially in batches and return run counts.
 * Generate missing analyses, backfill missing embeddings, skip insufficient content,
 * and persist progress logs. Configuration, snapshot, or logging errors can propagate.
 */
export async function runArticleAnalysis(options: RunAnalysisOptions): Promise<AnalysisRunSummary> {
  assertAnalysisConfiguration()

  const startedAt = Date.now()
  const model = getAnalysisModelName()
  const batchSize = options.batchSize ?? configuredBatchSize()
  const snapshot = await getPendingArticlesSnapshot(options)
  const selected = snapshot.articles
  const failures: AnalysisFailure[] = []
  let analyzed = 0
  let embedded = 0
  let backfilled = 0
  let skipped = 0
  let batches = 0

  console.info("[Analysis] Run started", {
    pending: snapshot.pending,
    selected: selected.length,
    batchSize,
    model,
    embeddingModel: getEmbeddingModelName(),
  })
  await writeAnalysisLog({
    level: "info",
    event: "analysis_started",
    message: `AI analysis started for ${selected.length} article${selected.length === 1 ? "" : "s"}.`,
    metadata: { pending: snapshot.pending, selected: selected.length, batch_size: batchSize, model },
  })

  for (let index = 0; index < selected.length; index += batchSize) {
    const batch = selected.slice(index, index + batchSize)
    batches += 1
    console.info("[Analysis] Batch started", { batch: batches, articles: batch.length })

    for (const article of batch) {
      if (!article.title.trim() || article.rawText.trim().length < MINIMUM_ARTICLE_CHARACTERS) {
        skipped += 1
        console.warn("[Analysis] Article skipped", { articleId: article.id, reason: "invalid_content" })
        await writeAnalysisLog({
          level: "warning",
          event: "analysis_skipped",
          message: "Article skipped because it did not contain enough valid content.",
          metadata: { reason: "invalid_content" },
          articleId: article.id,
        })
        continue
      }

      if (article.existingAnalysis) {
        try {
          const embedding = await embedArticle({
            title: article.title,
            summary: article.existingAnalysis.summary,
            rawText: article.rawText,
          })
          await saveArticleEmbedding(article.id, embedding, false)
          embedded += 1
          backfilled += 1
          console.info("[Analysis] Article embedding backfilled", { articleId: article.id })
          await writeAnalysisLog({
            level: "success",
            event: "analysis_embedding_backfilled",
            message: "Article embedding backfilled without rerunning analysis.",
            metadata: { embedding_model: getEmbeddingModelName() },
            articleId: article.id,
          })
        } catch {
          failures.push({ articleId: article.id, reason: "embedding_failed" })
          console.error("[Analysis] Article embedding backfill failed", { articleId: article.id })
          await writeAnalysisLog({
            level: "error",
            event: "analysis_failed",
            message: "Article embedding backfill could not be completed.",
            metadata: { reason: "embedding_failed", embedding_model: getEmbeddingModelName() },
            articleId: article.id,
          })
        }
        continue
      }

      try {
        const analysis = await analyzeArticle({ title: article.title, rawText: article.rawText })
        try {
          await saveArticleAnalysis(article.id, analysis)
          const embedding = await embedArticle({
            title: article.title,
            summary: analysis.summary,
            rawText: article.rawText,
          })
          await saveArticleEmbedding(article.id, embedding, true)
        } catch {
          failures.push({ articleId: article.id, reason: "embedding_failed" })
          console.error("[Analysis] Article analysis or embedding persistence failed", { articleId: article.id })
          await writeAnalysisLog({
            level: "error",
            event: "analysis_failed",
            message: "A valid AI analysis or its embedding could not be saved.",
            metadata: { reason: "embedding_failed", embedding_model: getEmbeddingModelName() },
            articleId: article.id,
          })
          continue
        }

        analyzed += 1
        embedded += 1
        console.info("[Analysis] Article analyzed", { articleId: article.id })
        await writeAnalysisLog({
          level: "success",
          event: "analysis_completed_article",
          message: "Article analysis completed.",
          metadata: { model, embedding_model: getEmbeddingModelName() },
          articleId: article.id,
        })
      } catch {
        failures.push({ articleId: article.id, reason: "generation_failed" })
        console.error("[Analysis] Article generation failed", { articleId: article.id })
        await writeAnalysisLog({
          level: "error",
          event: "analysis_failed",
          message: "Gemini did not return a valid article analysis after retrying.",
          metadata: { reason: "generation_failed", model },
          articleId: article.id,
        })
      }
    }
  }

  const summary: AnalysisRunSummary = {
    status: getStatus(analyzed, failures.length),
    pending: snapshot.pending,
    selected: selected.length,
    analyzed,
    embedded,
    backfilled,
    skipped,
    failed: failures.length,
    batches,
    totalDurationMs: Date.now() - startedAt,
    model,
    failures,
  }

  console.info("[Analysis] Run completed", summary)
  await writeAnalysisLog({
    level: summary.status === "success" ? "success" : summary.status === "partial" ? "warning" : "error",
    event: "analysis_completed",
    message: `AI analysis completed with ${analyzed} analyzed, ${skipped} skipped, and ${failures.length} failed.`,
    metadata: {
      status: summary.status,
      pending: summary.pending,
      selected: summary.selected,
      analyzed: summary.analyzed,
      embedded: summary.embedded,
      backfilled: summary.backfilled,
      skipped: summary.skipped,
      failed: summary.failed,
      batches: summary.batches,
      total_duration_ms: summary.totalDurationMs,
      model,
    },
  })

  return summary
}
