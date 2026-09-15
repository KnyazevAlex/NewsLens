const REJECTED_PATH_SEGMENTS = new Set([
  "author", "authors", "category", "categories", "corporate", "game", "games", "live",
  "newsletter", "newsletters", "podcast", "podcasts", "product", "products", "program",
  "programs", "review", "reviews", "search", "section", "sections", "shop", "shopping",
  "show", "shows", "subscribe", "subscription", "support", "tag", "tags", "topic", "topics",
  "video", "videos",
])

const FILE_EXTENSION_PATTERN = /\.(?:7z|avi|css|csv|docx?|gif|ico|jpe?g|js|json|mov|mp3|mp4|pdf|png|pptx?|rar|rss|svg|webp|xlsx?|xml|zip)$/i
const DATE_PATH_PATTERN = /\/(?:19|20)\d{2}\/(?:0?[1-9]|1[0-2])(?:\/(?:0?[1-9]|[12]\d|3[01]))?(?:\/|$)/
const ARTICLE_MARKER_PATTERN = /\/(?:article|articles|news|story|stories)\//i
const ARTICLE_ID_PATTERN = /(?:^|[-_/])\d{6,}(?:[-_/]|$)/

function normalizedHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "")
}

export function normalizeHttpUrl(rawUrl: string, baseUrl?: string) {
  try {
    const url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl)
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null

    url.hash = ""
    url.hostname = url.hostname.toLowerCase()
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
      url.port = ""
    }
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "")
    return url.toString()
  } catch {
    return null
  }
}

export function hasSameSourceHostname(candidateUrl: string, sourceUrl: string) {
  try {
    return normalizedHostname(new URL(candidateUrl).hostname) === normalizedHostname(new URL(sourceUrl).hostname)
  } catch {
    return false
  }
}

export function isRejectedArticlePath(urlValue: string) {
  try {
    const url = new URL(urlValue)
    const segments = url.pathname.toLowerCase().split("/").filter(Boolean)
    if (FILE_EXTENSION_PATTERN.test(url.pathname)) return true
    if (segments.some((segment) => REJECTED_PATH_SEGMENTS.has(segment))) return true
    return /\/(?:about|contact|help|privacy|terms)(?:\/|$)/i.test(url.pathname)
  } catch {
    return true
  }
}

export function isLikelyArticleUrl(candidateUrl: string, sourceUrl: string) {
  const normalizedCandidate = normalizeHttpUrl(candidateUrl)
  const normalizedSource = normalizeHttpUrl(sourceUrl)
  if (!normalizedCandidate || !normalizedSource) return false
  if (!hasSameSourceHostname(normalizedCandidate, normalizedSource)) return false
  if (normalizedCandidate === normalizedSource || isRejectedArticlePath(normalizedCandidate)) return false

  const { pathname } = new URL(normalizedCandidate)
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return false

  const finalSegment = segments.at(-1) ?? ""
  let decodedFinalSegment = finalSegment
  try {
    decodedFinalSegment = decodeURIComponent(finalSegment)
  } catch {
    return false
  }
  const slugWords = decodedFinalSegment.split(/[-_]+/).filter((part) => /[a-z]/i.test(part))

  return DATE_PATH_PATTERN.test(pathname)
    || ARTICLE_MARKER_PATTERN.test(pathname)
    || ARTICLE_ID_PATTERN.test(pathname)
    || (segments.length >= 2 && (finalSegment.length >= 35 || slugWords.length >= 5))
}
