import "server-only"

import { load } from "cheerio"

import type { ArticleParseResult } from "@/lib/scraping/types"
import {
  hasSameSourceHostname,
  isLikelyArticleUrl,
  isRejectedArticlePath,
  normalizeHttpUrl,
} from "@/lib/scraping/url"

const CARD_SELECTOR = [
  "article",
  "[role='article']",
  "[class*='story-card']",
  "[class*='story_card']",
  "[class*='article-card']",
  "[class*='article_card']",
  "[class*='news-card']",
  "[class*='headline']",
].join(",")

const HIDDEN_OR_UTILITY_SELECTOR = [
  "[hidden]", "[aria-hidden='true']", "nav", "footer", "script", "style", "template", "form", "svg",
  "[class*='advert']", "[class*='newsletter']", "[class*='subscription']", "[class*='related']",
  "[class*='most-viewed']", "[class*='mostViewed']", "[class*='social']", "[class*='share']",
  "[class*='recommend']", "[class*='promo']", "[id*='advert']", "[id*='newsletter']", "[id*='related']",
].join(",")

const GENERIC_TITLE_PATTERN = /^(?:home|homepage|news|latest news|live|video|videos|podcast|podcasts|search|subscribe|subscription|support|reviews?|shopping)$/i
const BOILERPLATE_PATTERN = /^(?:advertisement|read more|load more|share this|sign up|subscribe|most viewed|related (?:content|stories)|all rights reserved)$/i

interface JsonRecord { [key: string]: unknown }

interface ArticleMetadata {
  headline?: unknown
  description?: unknown
  image?: unknown
  datePublished?: unknown
  author?: unknown
  articleSection?: unknown
  articleBody?: unknown
  mainEntityOfPage?: unknown
  url?: unknown
}

/**
 * Collapse whitespace, including nonbreaking spaces, and trim; return empty text for nullish input.
 */
function cleanText(value: string | null | undefined) {
  return value?.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim() ?? ""
}

/**
 * Return the first nonempty content attribute found in selector order, or an empty string.
 */
function metaContent($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr("content"))
    if (value) return value
  }
  return ""
}

/**
 * Append article records found recursively in JSON-LD arrays and @graph entries to results.
 */
function collectJsonLdArticles(value: unknown, results: JsonRecord[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdArticles(item, results)
    return
  }
  if (!value || typeof value !== "object") return

  const record = value as JsonRecord
  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]]
  if (types.some((type) => typeof type === "string" && /^(?:NewsArticle|Article|ReportageNewsArticle)$/i.test(type))) {
    results.push(record)
  }
  if (record["@graph"]) collectJsonLdArticles(record["@graph"], results)
}

/**
 * Return the first article record from valid JSON-LD scripts, ignoring malformed scripts.
 */
function readArticleMetadata($: ReturnType<typeof load>): ArticleMetadata {
  const records: JsonRecord[] = []
  $("script[type='application/ld+json']").each((_, element) => {
    try {
      collectJsonLdArticles(JSON.parse($(element).text()), records)
    } catch {
      // Invalid JSON-LD is common and should not invalidate otherwise useful HTML.
    }
  })
  return (records[0] ?? {}) as ArticleMetadata
}

/**
 * Normalize string metadata values and return an empty string for other types.
 */
function stringValue(value: unknown) {
  return typeof value === "string" ? cleanText(value) : ""
}

/**
 * Extract an image URL from a string, the first array item, or a URL-bearing object.
 */
function imageValue(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return imageValue(value[0])
  if (value && typeof value === "object") {
    const record = value as JsonRecord
    return stringValue(record.url) || stringValue(record.contentUrl)
  }
  return ""
}

/**
 * Extract author names from strings or objects, joining author arrays with commas.
 */
function authorValue(value: unknown): string {
  if (typeof value === "string") return cleanText(value)
  if (Array.isArray(value)) return value.map(authorValue).filter(Boolean).join(", ")
  if (value && typeof value === "object") return stringValue((value as JsonRecord).name)
  return ""
}

/**
 * Normalize array or comma-separated categories, deduplicate them, and retain at most ten.
 */
function categoryValues(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : []
  return [...new Set(values.map((item) => stringValue(item)).filter(Boolean))].slice(0, 10)
}

/**
 * Normalize paragraphs and remove short, boilerplate, or case-insensitive duplicate text.
 */
function meaningfulParagraphs(rawValues: string[]) {
  const seen = new Set<string>()
  return rawValues.map(cleanText).filter((text) => {
    if (text.length < 40 || text.split(/\s+/).length < 8 || BOILERPLATE_PATTERN.test(text)) return false
    const key = text.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Group sentences into roughly paragraph-sized chunks, retaining text with fewer than three sentences.
 */
function splitLargeParagraph(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g)?.map(cleanText).filter(Boolean) ?? []
  if (sentences.length < 3) return [text]

  const paragraphs: string[] = []
  let buffer = ""
  for (const sentence of sentences) {
    buffer = cleanText(`${buffer} ${sentence}`)
    if (buffer.length >= 220) {
      paragraphs.push(buffer)
      buffer = ""
    }
  }
  if (buffer) paragraphs.push(buffer)
  return paragraphs
}

/**
 * Extract meaningful paragraphs from article containers, falling back to the JSON-LD body.
 */
function extractBody($: ReturnType<typeof load>, metadata: ArticleMetadata) {
  const metadataBody = stringValue(metadata.articleBody)
  const selectors = ["[itemprop='articleBody']", "[data-testid*='article-body']", "[class*='article-body']", "article", "main"]

  for (const selector of selectors) {
    const container = $(selector).first().clone()
    if (!container.length) continue
    container.find(HIDDEN_OR_UTILITY_SELECTOR).remove()
    let paragraphs = meaningfulParagraphs(container.find("p").map((_, element) => $(element).text()).get())
    if (paragraphs.length === 1 && paragraphs[0].length >= 900) paragraphs = splitLargeParagraph(paragraphs[0])
    if (paragraphs.length >= 3 || paragraphs.join(" ").length >= 900) return paragraphs
  }

  if (metadataBody) return meaningfulParagraphs(splitLargeParagraph(metadataBody))
  return []
}

export interface CandidateExtraction {
  urls: string[]
  rejected: number
  rejectionReasons: Record<string, number>
}

/**
 * Collect unique article-like links from visible story-card markup up to the maximum.
 * Return accepted URLs plus counts of rejected and duplicate candidate links.
 */
export function extractHomepageCandidates(html: string, sourceUrl: string, maximum: number): CandidateExtraction {
  const $ = load(html)
  const urls: string[] = []
  const seen = new Set<string>()
  const rejectionReasons: Record<string, number> = {}

  /**
   * Increment the local rejection count for a candidate exclusion reason.
   */
  function reject(reason: string) {
    rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1
  }

  $(CARD_SELECTOR).each((_, card) => {
    if (urls.length >= maximum) return false
    const element = $(card)
    if (element.is(HIDDEN_OR_UTILITY_SELECTOR) || element.parents(HIDDEN_OR_UTILITY_SELECTOR).length) return

    element.find("a[href]").each((__, anchor) => {
      if (urls.length >= maximum) return false
      const link = $(anchor)
      if (link.is(HIDDEN_OR_UTILITY_SELECTOR) || link.parents(HIDDEN_OR_UTILITY_SELECTOR).length) return

      const normalized = normalizeHttpUrl(link.attr("href") ?? "", sourceUrl)
      if (!normalized || !isLikelyArticleUrl(normalized, sourceUrl)) {
        reject("candidate_not_article_like")
        return
      }
      if (seen.has(normalized)) {
        reject("duplicate_candidate")
        return
      }
      seen.add(normalized)
      urls.push(normalized)
    })
  })

  return {
    urls,
    rejected: Object.values(rejectionReasons).reduce((total, count) => total + count, 0),
    rejectionReasons,
  }
}

/**
 * Parse article metadata and body, returning accepted fields or a rejection reason.
 * Require a meaningful title and body, a valid date and image, and an article-like
 * canonical URL on the source hostname.
 */
export function parseArticlePage(html: string, requestedUrl: string, sourceUrl: string): ArticleParseResult {
  const $ = load(html)
  const metadata = readArticleMetadata($)

  const title = stringValue(metadata.headline)
    || metaContent($, ["meta[property='og:title']", "meta[name='twitter:title']"])
    || cleanText($("h1").first().text())
  if (!title || title.length < 15 || GENERIC_TITLE_PATTERN.test(title)) {
    return { accepted: false, reason: "invalid_title" }
  }

  const canonicalCandidate = stringValue(metadata.url)
    || stringValue(typeof metadata.mainEntityOfPage === "object" && metadata.mainEntityOfPage
      ? (metadata.mainEntityOfPage as JsonRecord)["@id"]
      : metadata.mainEntityOfPage)
    || $("link[rel='canonical']").first().attr("href")
    || metaContent($, ["meta[property='og:url']"])
    || requestedUrl
  const canonicalUrl = normalizeHttpUrl(canonicalCandidate, requestedUrl)
  if (!canonicalUrl || !hasSameSourceHostname(canonicalUrl, sourceUrl) || isRejectedArticlePath(canonicalUrl)
    || !isLikelyArticleUrl(canonicalUrl, sourceUrl)) {
    return { accepted: false, reason: "invalid_canonical_url" }
  }

  const publishedValue = stringValue(metadata.datePublished) || metaContent($, [
    "meta[property='article:published_time']",
    "meta[name='article:published_time']",
    "meta[name='date']",
    "meta[name='pubdate']",
    "meta[itemprop='datePublished']",
  ])
  const publishedDate = new Date(publishedValue)
  if (!publishedValue || Number.isNaN(publishedDate.getTime())) {
    return { accepted: false, reason: "missing_or_invalid_published_date" }
  }

  const rawImage = imageValue(metadata.image) || metaContent($, [
    "meta[property='og:image']",
    "meta[name='twitter:image']",
    "meta[itemprop='image']",
  ])
  const imageUrl = normalizeHttpUrl(rawImage, requestedUrl)
  if (!imageUrl) return { accepted: false, reason: "missing_or_invalid_image" }

  const paragraphs = extractBody($, metadata)
  const rawText = paragraphs.join("\n\n")
  if (paragraphs.length < 3 && rawText.length < 900) {
    return { accepted: false, reason: "insufficient_article_body" }
  }

  const description = stringValue(metadata.description) || metaContent($, [
    "meta[property='og:description']",
    "meta[name='description']",
  ])
  const author = authorValue(metadata.author) || metaContent($, [
    "meta[name='author']",
    "meta[property='article:author']",
  ])
  const categories = categoryValues(metadata.articleSection)
  const originalUrl = normalizeHttpUrl(requestedUrl)
  if (!originalUrl) return { accepted: false, reason: "invalid_original_url" }

  return {
    accepted: true,
    article: {
      original_url: originalUrl,
      canonical_url: canonicalUrl,
      title,
      description: description || null,
      image_url: imageUrl,
      published_at: publishedDate.toISOString(),
      raw_text: rawText,
      categories,
      region: null,
      author: author || null,
      scraped_at: new Date().toISOString(),
      analyzed_at: null,
    },
  }
}
