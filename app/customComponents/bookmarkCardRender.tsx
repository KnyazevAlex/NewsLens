import { ExternalLink, CalendarDays, Fingerprint, TrashIcon} from "lucide-react"

import { deleteBookmark } from "@/lib/supabase/queries/manageBookMarks"

export default function BookmarkCard({ bookmark} : any) {
  const formattedDate = new Date(bookmark.created_at).toLocaleString(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  )

  return (
    <article className="rounded-xl border my-2 border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md" key={bookmark.id} >
      <div className="relative mb-4 flex items-center justify-between gap-3">

        <span className=" rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Bookmark
        </span>

        <span 
        className="absolute left-24 hover:scale-105 cursor-pointer"
        onClick={async() => {
            console.log(1)
            return(
                deleteBookmark(bookmark.id)
               
            )
        }}
        >
            <TrashIcon fill="grey " />
        </span>

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
          <p className="mb-1 text-xs font-medium text-neutral-500">
            Bookmark ID
          </p>
          <p className="break-all font-mono text-xs text-neutral-700">
            {bookmark.id}
          </p>
        </div>
      </div>

      <a
        href={bookmark.url}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
      >
        View article
        <ExternalLink className="h-4 w-4" />
      </a>
    </article>
  )
}
