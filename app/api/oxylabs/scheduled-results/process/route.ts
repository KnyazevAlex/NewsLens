import { z } from "zod"

import { processScheduledResults } from "@/lib/oxylabs/scheduled-results"
import { AdminSecretConfigurationError, isAuthorizedAdminRequest } from "@/lib/security/admin-secret"

export const runtime = "nodejs"
export const maxDuration = 300

const requestSchema = z.object({ limitPerSource: z.number().int().min(1).max(20).default(5) }).strict()

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdminRequest(request)) return Response.json({ error: "Unauthorized." }, { status: 401 })
    const raw = await request.text()
    if (raw.length > 1_000) return Response.json({ error: "Request body is too large." }, { status: 400 })
    const parsed = requestSchema.safeParse(raw.trim() ? JSON.parse(raw) : {})
    if (!parsed.success) return Response.json({ error: "Invalid scheduled processing request." }, { status: 400 })
    return Response.json(await processScheduledResults(parsed.data.limitPerSource))
  } catch (error) {
    if (error instanceof AdminSecretConfigurationError) {
      return Response.json({ error: "Scheduler server configuration is incomplete." }, { status: 500 })
    }
    if (error instanceof SyntaxError) return Response.json({ error: "Request body must be valid JSON." }, { status: 400 })
    console.error("[API] Scheduled result processing failed", error)
    return Response.json({ error: "Unable to process scheduled results." }, { status: 500 })
  }
}
