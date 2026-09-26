import { z } from "zod"

import { runArticleAnalysis } from "@/lib/analysis/pipeline"
import { AnalysisConfigurationError } from "@/lib/ai/article-analysis"
import { AdminSecretConfigurationError, isAuthorizedAdminRequest } from "@/lib/security/admin-secret"

export const runtime = "nodejs"
export const maxDuration = 300

const MAX_REQUEST_CHARACTERS = 10_000
const analyzeRequestSchema = z.object({
  articleIds: z.array(z.uuid()).min(1).max(100).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  batchSize: z.number().int().min(1).max(10).optional(),
}).strict()

/**
 * Parse JSON or return an empty object for a blank body.
 * @throws {SyntaxError} If the body exceeds 10,000 characters or contains invalid JSON.
 */
async function readRequestBody(request: Request) {
  const rawBody = await request.text()
  if (rawBody.length > MAX_REQUEST_CHARACTERS) throw new SyntaxError("Request body is too large")
  if (!rawBody.trim()) return {}
  return JSON.parse(rawBody) as unknown
}

/**
 * Authorize an admin request, validate analysis options, and return the run summary.
 * Returns 401 for unauthorized requests, 400 for invalid input, or 500 on failure.
 */
export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdminRequest(request)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 })
    }

    const body = await readRequestBody(request)
    const parsed = analyzeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: "Invalid analysis request.",
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      }, { status: 400 })
    }

    const summary = await runArticleAnalysis(parsed.data)
    return Response.json(summary)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Request body must be valid JSON and under 10 KB." }, { status: 400 })
    }
    if (error instanceof AdminSecretConfigurationError || error instanceof AnalysisConfigurationError) {
      console.error("[API] Analysis configuration error", { errorType: error.name })
      return Response.json({ error: "Analysis server configuration is incomplete." }, { status: 500 })
    }

    console.error("[API] Article analysis failed", error)
    return Response.json({ error: "Unable to complete article analysis." }, { status: 500 })
  }
}

