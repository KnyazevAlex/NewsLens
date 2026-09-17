import type { TableRow } from "@/lib/supabase/types"

export type SentimentLabel = TableRow<"article_analyses">["sentiment_label"]
export type BiasLabel = TableRow<"article_analyses">["bias_label"]

export interface GeneratedArticleAnalysis {
  summary: string
  sentimentScore: number
  sentimentLabel: SentimentLabel
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

export interface PendingArticle {
  id: string
  title: string
  rawText: string
}

export interface AnalysisFailure {
  articleId: string
  reason: "generation_failed" | "persistence_failed"
}

export interface AnalysisRunSummary {
  status: "success" | "partial" | "failed"
  pending: number
  selected: number
  analyzed: number
  skipped: number
  failed: number
  batches: number
  totalDurationMs: number
  model: string
  failures: AnalysisFailure[]
}

