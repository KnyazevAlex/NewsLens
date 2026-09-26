import type { TableInsert, TableRow } from "@/lib/supabase/types"

export type ScrapingSource = Pick<
  TableRow<"sources">,
  "id" | "name" | "listing_url" | "parser_strategy"
>

export type ScrapedArticleInsert = Omit<TableInsert<"articles">, "source_id"> & {
  source_id: string
}

export type ScrapeStatus = "success" | "partial" | "failed"

export interface SourceScrapeSummary {
  sourceId: string
  sourceName: string
  candidatesFound: number
  articlesInserted: number
  error?: string
}

export interface ScrapeSummary {
  status: ScrapeStatus
  sourcesChecked: number
  candidatesFound: number
  candidatesRejected: number
  duplicatesSkipped: number
  detailPagesScraped: number
  articlesInserted: number
  articlesRejected: number
  articlesFailed: number
  totalDurationMs: number
  rejectionReasons: Record<string, number>
  sources: SourceScrapeSummary[]
}

export type ArticleParseResult =
  | { accepted: true; article: Omit<ScrapedArticleInsert, "source_id"> }
  | { accepted: false; reason: string }
