import "server-only"

const OXYLABS_REALTIME_ENDPOINT = "https://realtime.oxylabs.io/v1/queries"
const OXYLABS_TIMEOUT_MS = 180_000
const MAX_RESPONSE_CHARACTERS = 15_000_000

interface OxylabsResult {
  content?: unknown
  status_code?: unknown
}

interface OxylabsResponse {
  results?: unknown
}

export class OxylabsError extends Error {
  readonly kind: "configuration" | "provider"

  /** Create an Oxylabs error classified as a configuration or provider failure. */
  constructor(kind: "configuration" | "provider", message: string) {
    super(message)
    this.name = "OxylabsError"
    this.kind = kind
  }
}

/**
 * Read a required Oxylabs credential or throw a configuration error when absent.
 */
function requireCredential(name: "OXY_WSA_USERNAME" | "OXY_WSA_PASSWORD") {
  const value = process.env[name]
  if (!value) throw new OxylabsError("configuration", `Missing required server configuration: ${name}`)
  return value
}

/**
 * Verify both Oxylabs credentials are present, throwing a configuration error otherwise.
 */
export function assertOxylabsConfiguration() {
  requireCredential("OXY_WSA_USERNAME")
  requireCredential("OXY_WSA_PASSWORD")
}

/**
 * Fetch a page through Oxylabs Realtime with a timeout and response-size checks.
 * Return HTML from the first successful result. Missing credentials and invalid
 * provider responses raise OxylabsError; response-body read errors may propagate.
 */
export async function fetchHtmlThroughOxylabs(targetUrl: string) {
  const username = requireCredential("OXY_WSA_USERNAME")
  const password = requireCredential("OXY_WSA_PASSWORD")
  let response: Response

  try {
    response = await fetch(OXYLABS_REALTIME_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(OXYLABS_TIMEOUT_MS),
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "universal", url: targetUrl }),
    })
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Oxylabs request timed out"
      : "Oxylabs request failed"
    throw new OxylabsError("provider", message)
  }

  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_CHARACTERS) {
    throw new OxylabsError("provider", "Oxylabs response exceeded the allowed size")
  }

  const responseText = await response.text()
  if (responseText.length > MAX_RESPONSE_CHARACTERS) {
    throw new OxylabsError("provider", "Oxylabs response exceeded the allowed size")
  }

  if (!response.ok) {
    throw new OxylabsError("provider", `Oxylabs returned HTTP ${response.status}`)
  }

  let payload: OxylabsResponse
  try {
    payload = JSON.parse(responseText) as OxylabsResponse
  } catch {
    throw new OxylabsError("provider", "Oxylabs returned malformed JSON")
  }

  if (!Array.isArray(payload.results) || payload.results.length === 0) {
    throw new OxylabsError("provider", "Oxylabs returned no results")
  }

  const result = payload.results[0] as OxylabsResult
  if (typeof result.status_code !== "number" || result.status_code < 200 || result.status_code >= 300) {
    throw new OxylabsError("provider", "Oxylabs could not retrieve the target page")
  }
  if (typeof result.content !== "string" || !result.content.trim()) {
    throw new OxylabsError("provider", "Oxylabs returned no HTML content")
  }

  return result.content
}
