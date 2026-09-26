import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { TableRow } from "@/lib/supabase/types"

export type BiasLabel = TableRow<"article_analyses">["bias_label"]

export interface NewsCardData {
  id: string
  source: string
  publishedAt: string
  title: string
  description: string
  categories: string[]
  biasValue: number
  biasLabel: BiasLabel | null
  sentimentLabel: TableRow<"article_analyses">["sentiment_label"] | null
  leftPercentage: number | null
  centerPercentage: number | null
  rightPercentage: number | null
  confidence: number | null
  imageUrl: string
}

export interface BiasOverviewData {
  left: number
  center: number
  right: number
  analyzedCount: number
}

export interface ArticleAnalysisData {
  summary: string
  sentimentScore: number
  sentimentLabel: TableRow<"article_analyses">["sentiment_label"]
  biasScore: number
  biasLabel: BiasLabel
  leftPercentage: number
  centerPercentage: number
  rightPercentage: number
  confidence: number
  framingNotes: string[]
  loadedTerms: string[]
  disclaimer: string
  model: string
  embedding: number[] | null
}

export interface RelatedArticleData {
  id: string
  title: string
  description: string
  imageUrl: string
  publishedAt: string
  source: string
  sourceLogoUrl: string | null
  similarity: number
}

export interface ArticleDetailsData {
  id: string
  source: string
  originalUrl: string
  title: string
  description: string
  imageUrl: string
  publishedAt: string
  paragraphs: string[]
  categories: string[]
  region: string | null
  author: string | null
  readTimeMinutes: number
  analysis: ArticleAnalysisData | null
}

/**
 * Log database error details and throw a generic error describing the failed operation.
 */
function throwQueryError(context: string, error: { message: string; code?: string }) {
  console.error(`[Supabase] ${context}`, { code: error.code, message: error.message })
  throw new Error(`Unable to ${context.toLowerCase()}.`)
}

/**
 * Use the stored description when nonblank, otherwise build a body excerpt of at most 180 characters.
 */
function toDescription(article: Pick<TableRow<"articles">, "description" | "raw_text">) {
  if (article.description?.trim()) return article.description

  const normalized = article.raw_text.replace(/\s+/g, " ").trim()
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized
}

/**
 * Estimate reading time at 220 words per minute, rounded up to at least one minute.
 */
function toReadTime(rawText: string) {
  const words = rawText.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

/**
 * Read a nonempty array of finite numbers from a vector value or JSON string; otherwise return null.
 */
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

/**
 * Map a stored analysis to display fields, normalizing numeric values and its optional embedding.
 */
function mapAnalysis(analysis: TableRow<"article_analyses">): ArticleAnalysisData {
  return {
    summary: analysis.summary,
    sentimentScore: Number(analysis.sentiment_score),
    sentimentLabel: analysis.sentiment_label,
    biasScore: Number(analysis.bias_score),
    biasLabel: analysis.bias_label,
    leftPercentage: analysis.left_percentage,
    centerPercentage: analysis.center_percentage,
    rightPercentage: analysis.right_percentage,
    confidence: Number(analysis.confidence),
    framingNotes: analysis.framing_notes,
    loadedTerms: analysis.loaded_terms,
    disclaimer: analysis.disclaimer,
    model: analysis.model,
    embedding: toEmbedding(analysis.embedding),
  }
}

/**
 * Call the related-articles RPC with an article ID and vector and map its results for display.
 * Throw a generic query error when the RPC fails.
 */
export async function getRelatedArticles(articleId: string, embedding: number[]): Promise<RelatedArticleData[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.rpc("get_related_articles", {
    query_article_id: articleId,
    query_embedding: embedding,
  })

  if (error) throwQueryError("load related articles", error)

  return (data ?? []).map((article) => ({
    id: article.article_id,
    title: article.title,
    description: article.description?.trim() ?? "",
    imageUrl: article.image_url,
    publishedAt: article.published_at,
    source: article.source_name,
    sourceLogoUrl: article.source_logo_url,
    similarity: Number(article.similarity),
  }))
}

/**
 * Load the newest articles up to the limit and attach source names and optional analysis metrics.
 * Return an empty list when no articles exist; database query errors throw.
 */
export async function getRecentArticles(limit = 24): Promise<NewsCardData[]> {
  const supabase = createServerSupabaseClient()
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, source_id, title, description, raw_text, image_url, published_at, categories")
    .order("published_at", { ascending: false })
    .limit(limit)

  if (error) throwQueryError("load recent articles", error)
  const articleRows = articles ?? []
  if (!articleRows.length) return []

  const sourceIds = [...new Set(articleRows.map((article) => article.source_id))]
  const articleIds = articleRows.map((article) => article.id)
  const [{ data: sources, error: sourcesError }, { data: analyses, error: analysesError }] =
    await Promise.all([
      supabase.from("sources").select("id, name").in("id", sourceIds),
      supabase
        .from("article_analyses")
        .select("article_id, bias_score, bias_label, sentiment_label, left_percentage, center_percentage, right_percentage, confidence")
        .in("article_id", articleIds),
    ])

  if (sourcesError) throwQueryError("load article sources", sourcesError)
  if (analysesError) throwQueryError("load article analyses", analysesError)

  const sourcesById = new Map((sources ?? []).map((source) => [source.id, source.name]))
  const analysesByArticleId = new Map((analyses ?? []).map((analysis) => [analysis.article_id, analysis]))

  return articleRows.map((article) => {
    const analysis = analysesByArticleId.get(article.id)

    return {
      id: article.id,
      source: sourcesById.get(article.source_id) ?? "Unknown source",
      publishedAt: article.published_at,
      title: article.title,
      description: toDescription(article),
      categories: article.categories,
      biasValue: analysis ? Math.round(Number(analysis.bias_score) * 100) : 0,
      biasLabel: analysis?.bias_label ?? null,
      sentimentLabel: analysis?.sentiment_label ?? null,
      leftPercentage: analysis?.left_percentage ?? null,
      centerPercentage: analysis?.center_percentage ?? null,
      rightPercentage: analysis?.right_percentage ?? null,
      confidence: analysis ? Number(analysis.confidence) : null,
      imageUrl: article.image_url,
    }
  })
}

/**
 * Average framing percentages across returned analyses, rounding each percentage independently.
 * Return zero counts and percentages when no analyses are available; query errors throw.
 */
export async function getBiasOverview(): Promise<BiasOverviewData> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("article_analyses")
    .select("left_percentage, center_percentage, right_percentage")

  if (error) throwQueryError("load bias overview", error)
  const analyses = data ?? []
  if (!analyses.length) return { left: 0, center: 0, right: 0, analyzedCount: 0 }

  const totals = analyses.reduce(
    (result, analysis) => ({
      left: result.left + analysis.left_percentage,
      center: result.center + analysis.center_percentage,
      right: result.right + analysis.right_percentage,
    }),
    { left: 0, center: 0, right: 0 },
  )

  return {
    left: Math.round(totals.left / analyses.length),
    center: Math.round(totals.center / analyses.length),
    right: Math.round(totals.right / analyses.length),
    analyzedCount: analyses.length,
  }
}

/**
 * Load article details with source information and optional analysis.
 * Return null when the article is absent; query errors or a missing source throw.
 */
export async function getArticleById(id: string): Promise<ArticleDetailsData | null> {
  const supabase = createServerSupabaseClient()
  const { data: article, error } = await supabase
    .from("articles")
    .select("id, source_id, original_url, title, description, image_url, published_at, raw_text, categories, region, author")
    .eq("id", id)
    .maybeSingle()

  if (error) throwQueryError("load article", error)
  if (!article) return null

  const [{ data: source, error: sourceError }, { data: analysis, error: analysisError }] =
    await Promise.all([
      supabase.from("sources").select("name").eq("id", article.source_id).single(),
      supabase.from("article_analyses").select("*").eq("article_id", article.id).maybeSingle(),
    ])

  if (sourceError) throwQueryError("load article source", sourceError)
  if (analysisError) throwQueryError("load article analysis", analysisError)
  if (!source) throw new Error("Unable to load article source.")

  return {
    id: article.id,
    source: source.name,
    originalUrl: article.original_url,
    title: article.title,
    description: toDescription(article),
    imageUrl: article.image_url,
    publishedAt: article.published_at,
    paragraphs: article.raw_text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    categories: article.categories,
    region: article.region,
    author: article.author,
    readTimeMinutes: toReadTime(article.raw_text),
    analysis: analysis ? mapAnalysis(analysis) : null,
  }
}
