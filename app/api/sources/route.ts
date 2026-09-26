import { listActiveScrapingSources } from "@/lib/supabase/queries/scraping"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Return active source IDs and names, or a 500 response if loading fails.
 */
export async function GET() {
  try {
    const sources = await listActiveScrapingSources()
    return Response.json({
      sources: sources.map((source) => ({ id: source.id, name: source.name })),
    })
  } catch (error) {
    console.error("[API] Unable to list active sources", error)
    return Response.json({ error: "Unable to load active sources." }, { status: 500 })
  }
}
