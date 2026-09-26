import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ScrapedArticleInsert, ScrapingSource } from "@/lib/scraping/types"
import type { Json } from "@/lib/supabase/types"

const URL_QUERY_CHUNK_SIZE = 15

/**
 * Split values into ordered batches. The caller must supply a positive size.
 */
function chunks<T>(values: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

/**
 * Log database error details and throw a generic error describing the failed operation.
 */
function throwQueryError(context: string, error: { message: string; code?: string }) {
  console.error(`[Supabase] ${context}`, { code: error.code, message: error.message })
  throw new Error(`Unable to ${context.toLowerCase()}.`)
}

/**
 * Load active sources alphabetically, optionally restricted to supplied IDs; throw on query errors.
 */
export async function listActiveScrapingSources(sourceIds?: string[]): Promise<ScrapingSource[]> {
  const supabase = createServerSupabaseClient()
  let query = supabase
    .from("sources")
    .select("id, name, listing_url, parser_strategy")
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (sourceIds?.length) query = query.in("id", sourceIds)

  const { data, error } = await query
  if (error) throwQueryError("load active scraping sources", error)
  return data ?? []
}

/**
 * Find stored original and canonical URLs using query batches of at most 15 input URLs.
 * Return both URL forms for matching rows in a set; throw on query errors.
 */
export async function findExistingArticleUrls(urls: string[]) {
  const uniqueUrls = [...new Set(urls)].filter(Boolean)
  const existing = new Set<string>()
  if (!uniqueUrls.length) return existing

  const supabase = createServerSupabaseClient()
  for (const urlChunk of chunks(uniqueUrls, URL_QUERY_CHUNK_SIZE)) {
    const [{ data: originals, error: originalsError }, { data: canonicals, error: canonicalsError }] =
      await Promise.all([
        supabase.from("articles").select("original_url, canonical_url").in("original_url", urlChunk),
        supabase.from("articles").select("original_url, canonical_url").in("canonical_url", urlChunk),
      ])

    if (originalsError) throwQueryError("check original article URLs", originalsError)
    if (canonicalsError) throwQueryError("check canonical article URLs", canonicalsError)

    for (const article of [...(originals ?? []), ...(canonicals ?? [])]) {
      existing.add(article.original_url)
      if (article.canonical_url) existing.add(article.canonical_url)
    }
  }
[]
  return existing
}

/**
 * Insert a scraped article and return its ID, or report a duplicate on a uniqueness violation.
 * Throw for other database errors or a missing inserted row.
 */
export async function insertScrapedArticle(article: ScrapedArticleInsert) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("articles").insert(article).select("id").single()

  if (error?.code === "23505") return { inserted: false as const, duplicate: true as const }
  if (error) throwQueryError("insert scraped article", error)
  if (!data) throw new Error("Unable to insert scraped article.")
  return { inserted: true as const, duplicate: false as const, articleId: data.id }
}

/**
 * Insert a scrape log with optional source and article links; warn on returned database errors.
 */
export async function writeScrapeLog(input: {
  level: "debug" | "info" | "warning" | "error" | "success"
  event: string
  message: string
  metadata?: Json
  sourceId?: string
  articleId?: string
}) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("logs").insert({
    level: input.level,
    event: input.event,
    message: input.message,
    metadata: input.metadata ?? {},
    source_id: input.sourceId ?? null,
    article_id: input.articleId ?? null,
  })

  if (error) console.warn("[Scrape] Unable to persist log", { event: input.event, code: error.code })
}
