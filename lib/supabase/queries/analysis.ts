import "server-only"

import type { GeneratedArticleAnalysis, PendingArticle } from "@/lib/ai/types"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/types"

const PAGE_SIZE = 500

function toEmbedding(value: unknown): number[] | null {
  const candidate = typeof value === "string"
    ? (() => {
        try {
          return JSON.parse(value) as unknown
        } catch {
          return null
        }
      })()
    : value

  return Array.isArray(candidate) && candidate.length > 0 && candidate.every((item) => typeof item === "number" && Number.isFinite(item))
    ? candidate
    : null
}

function throwQueryError(context: string, error: { message: string; code?: string }) {
  console.error(`[Supabase] ${context}`, { code: error.code, message: error.message })
  throw new Error(`Unable to ${context.toLowerCase()}.`)
}

export async function getPendingArticlesSnapshot(options: {
  articleIds?: string[]
  limit?: number
}): Promise<{ pending: number; articles: PendingArticle[] }> {
  const supabase = createServerSupabaseClient()
  const pending: PendingArticle[] = []
  let offset = 0

  while (true) {
    let query = supabase
      .from("articles")
      .select("id, title, raw_text, article_analyses(summary, embedding)")
      .order("published_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (options.articleIds?.length) query = query.in("id", options.articleIds)

    const { data, error } = await query
    if (error) throwQueryError("load pending articles", error)

    const rows = data ?? []
    for (const article of rows) {
      const existingAnalysis = article.article_analyses
      const embedding = existingAnalysis ? toEmbedding(existingAnalysis.embedding) : null
      if (!existingAnalysis || !embedding) {
        pending.push({
          id: article.id,
          title: article.title,
          rawText: article.raw_text,
          existingAnalysis: existingAnalysis
            ? { summary: existingAnalysis.summary, embedding }
            : null,
        })
      }
    }

    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return {
    pending: pending.length,
    articles: options.limit === undefined ? pending : pending.slice(0, options.limit),
  }
}

export async function saveArticleAnalysis(articleId: string, analysis: GeneratedArticleAnalysis) {
  const supabase = createServerSupabaseClient()
  const { error: analysisError } = await supabase.from("article_analyses").upsert({
    article_id: articleId,
    summary: analysis.summary,
    sentiment_score: analysis.sentimentScore,
    sentiment_label: analysis.sentimentLabel,
    bias_score: analysis.biasScore,
    bias_label: analysis.biasLabel,
    left_percentage: analysis.leftPercentage,
    center_percentage: analysis.centerPercentage,
    right_percentage: analysis.rightPercentage,
    confidence: analysis.confidence,
    framing_notes: analysis.framingNotes,
    loaded_terms: analysis.loadedTerms,
    disclaimer: analysis.disclaimer,
    model: analysis.model,
    updated_at: new Date().toISOString(),
  }, { onConflict: "article_id" })

  if (analysisError) throwQueryError("save article analysis", analysisError)

}

export async function saveArticleEmbedding(articleId: string, embedding: number[], markArticleAnalyzed: boolean) {
  const supabase = createServerSupabaseClient()
  const { error: embeddingError } = await supabase
    .from("article_analyses")
    .update({ embedding, updated_at: new Date().toISOString() })
    .eq("article_id", articleId)

  if (embeddingError) throwQueryError("save article embedding", embeddingError)
  if (!markArticleAnalyzed) return

  const { error: articleError } = await supabase
    .from("articles")
    .update({ analyzed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", articleId)

  if (articleError) throwQueryError("mark article analyzed", articleError)
}

export async function writeAnalysisLog(input: {
  level: "debug" | "info" | "warning" | "error" | "success"
  event: string
  message: string
  metadata?: Json
  articleId?: string
}) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("logs").insert({
    level: input.level,
    event: input.event,
    message: input.message,
    metadata: input.metadata ?? {},
    article_id: input.articleId ?? null,
  })

  if (error) console.warn("[Analysis] Unable to persist log", { event: input.event, code: error.code })
}
