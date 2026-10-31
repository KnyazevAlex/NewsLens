'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, CalendarDays, Fingerprint, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteBookmark } from "@/lib/supabase/queries/manageBookMarks"
import type { BookmarkRecord } from "@/lib/supabase/types"

export default function BookmarkCard({ bookmark }: { bookmark: BookmarkRecord }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const formattedDate = new Date(bookmark.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  async function handleDelete() {
    if (pending) return
    setPending(true)
    setMessage("")
    try {
      const result = await deleteBookmark(bookmark.id)
      if (!result.success) {
        setMessage(result.error)
        return
      }
      router.refresh()
    } catch {
      setMessage("Could not remove this bookmark.")
    } finally {
      setPending(false)
    }
  }

  const articleHref = getArticleHref(bookmark.url)

  return (
    <article className="my-2 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Bookmark
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={pending}
          aria-label={`Remove bookmark for ${bookmark.title}`}
          title="Remove bookmark"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
          <CalendarDays className="h-4 w-4" />
          {formattedDate}
        </span>
      </div>

      <h2 className="mb-4 text-lg font-semibold leading-snug text-neutral-900">
        {bookmark.title}
      </h2>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-neutral-50 p-3">
        <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium text-neutral-500">Bookmark ID</p>
          <p className="break-all font-mono text-xs text-neutral-700">{bookmark.id}</p>
        </div>
      </div>

      {message && <p role="status" className="mb-3 text-xs text-red-600">{message}</p>}

      <a
        href={articleHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
      >
        View article
        <ExternalLink className="h-4 w-4" />
      </a>
    </article>
  )
}

/** Keep historical localhost detail links usable when deployed elsewhere. */
function getArticleHref(url: string) {
  try {
    const parsed = new URL(url)
    if (["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.pathname.startsWith("/news/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // Relative paths are expected for all newly-created bookmarks.
  }
  return url
}
