'use client'

import {useState, useOptimistic, useTransition} from "react"
import { useRouter } from "next/navigation"
import { SignInButton, useUser } from "@clerk/nextjs"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addBookmark } from "@/lib/supabase/queries/manageBookMarks"

interface BookmarkButtonProps {
  url: string
  title: string
  isBookmarked?: boolean
  compact?: boolean
}

export default function BookmarkComponent({
  url,
  title,
  isBookmarked = false,
  compact = false,
}: BookmarkButtonProps) {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()
  const [saved, setSaved] = useOptimistic(isBookmarked)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")

  function handleBookmark() {
    if (saved || isPending) return

    setMessage("")

    startTransition(async () => {
      setSaved(true)

      try {
        const result = await addBookmark(url, title)
        if (!result.success) {
          setMessage(result.error)
          return
        }

        setMessage(result.alreadyBookmarked ? "Already bookmarked" : "Saved")
        router.refresh()
      } catch {
        setMessage("Could not save this bookmark.")
      }
    })
  }

  const button = (
    <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={isSignedIn ? handleBookmark : undefined}
        disabled={!isLoaded || (Boolean(isSignedIn) && (isPending || saved))}
        aria-label={saved ? "Article bookmarked" : "Bookmark article"}
        aria-pressed={saved}
        title={saved ? "Bookmarked" : isSignedIn ? "Bookmark article" : "Sign in to bookmark"}
        className={compact ? "h-8 w-8" : "h-9 w-9"}
      >
        <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
    </Button>
  )

  return (
    <span className="inline-flex items-center gap-1">
      {isLoaded && !isSignedIn ? (
        <SignInButton mode="modal">{button}</SignInButton>
      ) : button}
      {message && (
        <span role="status" className="text-xs text-neutral-600">
          {message}
        </span>
      )}
    </span>
  )
}
