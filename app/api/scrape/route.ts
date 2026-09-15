import { z } from "zod"

import { OxylabsError } from "@/lib/oxylabs/client"
import { runManualScrape, SourceSelectionError } from "@/lib/scraping/pipeline"
import { AdminSecretConfigurationError, isAuthorizedAdminRequest } from "@/lib/security/admin-secret"

export const runtime = "nodejs"
export const maxDuration = 300

const MAX_REQUEST_CHARACTERS = 10_000
const scrapeRequestSchema = z.object({
  sourceIds: z.array(z.uuid()).max(50).optional(),
  limitPerSource: z.number().int().min(1).max(20).default(5),
}).strict()

async function readRequestBody(request: Request) {
  const rawBody = await request.text()
  if (rawBody.length > MAX_REQUEST_CHARACTERS) throw new SyntaxError("Request body is too large")
  if (!rawBody.trim()) return {}
  return JSON.parse(rawBody) as unknown
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdminRequest(request)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 })
    }

    const body = await readRequestBody(request)
    const parsed = scrapeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: "Invalid scrape request.",
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      }, { status: 400 })
    }

    const summary = await runManualScrape(parsed.data)
    return Response.json(summary)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Request body must be valid JSON and under 10 KB." }, { status: 400 })
    }
    if (error instanceof SourceSelectionError) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof AdminSecretConfigurationError
      || (error instanceof OxylabsError && error.kind === "configuration")) {
      console.error("[API] Scraper configuration error", error.message)
      return Response.json({ error: "Scraper server configuration is incomplete." }, { status: 500 })
    }

    console.error("[API] Manual scrape failed", error)
    return Response.json({ error: "Unable to complete the scrape." }, { status: 500 })
  }
}
