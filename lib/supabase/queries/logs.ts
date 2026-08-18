import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Json, TableRow } from "@/lib/supabase/types"

export interface LogItemData {
  id: string
  level: TableRow<"logs">["level"]
  event: string
  message: string
  detail: string | null
  createdAt: string
}

function metadataDetail(metadata: Json): string | null {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") return null

  for (const key of ["article_title", "source_name", "summary"]) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value
  }

  const count = metadata.article_count
  return typeof count === "number" ? `${count} articles` : null
}

export async function getRecentLogs(limit = 5): Promise<LogItemData[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("logs")
    .select("id, level, event, message, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[Supabase] load recent logs", { code: error.code, message: error.message })
    throw new Error("Unable to load recent logs.")
  }

  return (data ?? []).map((log) => ({
    id: log.id,
    level: log.level,
    event: log.event,
    message: log.message,
    detail: metadataDetail(log.metadata),
    createdAt: log.created_at,
  }))
}
