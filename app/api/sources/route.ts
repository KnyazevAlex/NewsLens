import { listActiveScrapingSources } from "@/lib/supabase/queries/scraping"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
