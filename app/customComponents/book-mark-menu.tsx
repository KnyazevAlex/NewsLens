'use client'

import { Dialog } from "@base-ui/react/dialog"
import BookmarkCard from "./bookmarkCardRender"
import type { BookmarkRecord } from "@/lib/supabase/types"

interface BookmarkMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookmarks: BookmarkRecord[]
}

export default function BookMarkMenu({ open, onOpenChange, bookmarks }: BookmarkMenuProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[51] bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[52] max-h-[80vh] w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
          <Dialog.Title className="mb-4 text-lg font-bold text-neutral-900">
            Your bookmarks
          </Dialog.Title>

          {bookmarks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center">
              <p className="text-sm font-medium text-neutral-700">No bookmarks yet</p>
              <p className="mt-1 text-xs text-neutral-500">
                Save an article to find it here later.
              </p>
            </div>
          ) : (
            bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))
          )}

          <Dialog.Close className="mt-4 rounded-lg bg-neutral-100 px-4 py-2 text-sm hover:bg-neutral-200">
            Close
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
