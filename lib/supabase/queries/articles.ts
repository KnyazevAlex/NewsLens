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

function throwQueryError(context: string, error: { message: string; code?: string }) {
  console.error(`[Supabase] ${context}`, { code: error.code, message: error.message })
  throw new Error(`Unable to ${context.toLowerCase()}.`)
}

function toDescription(article: Pick<TableRow<"articles">, "description" | "raw_text">) {
  if (article.description?.trim()) return article.description

  const normalized = article.raw_text.replace(/\s+/g, " ").trim()
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized
}

function toReadTime(rawText: string) {
  const words = rawText.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

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
  }
}

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
        .select("article_id, bias_score, bias_label")
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
      imageUrl: article.image_url,
    }
  })
}

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
