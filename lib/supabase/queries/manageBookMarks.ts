'use server'

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import supabaseActivation from "../useSupabse"
import type { BookmarkRecord } from "../types"

type BookmarkActionResult =
  | { success: true; alreadyBookmarked?: boolean }
  | { success: false; error: string }

/** Save one stable article route per authenticated Clerk user. */
export async function addBookmark(url: string, title: string): Promise<BookmarkActionResult> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "Sign in to save bookmarks." }

  const normalizedUrl = normalizeBookmarkUrl(url)
  if (!normalizedUrl || !title.trim()) {
    return { success: false, error: "Article details are missing." }
  }

  try {
    const supabase = await supabaseActivation()
    const { data, error } = await supabase
      .from("bookmarks")
      .upsert(
        { user_id: userId, url: normalizedUrl, title: title.trim() },
        { onConflict: "user_id,url", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle()

    if (error) {
      console.error("Error adding bookmark:", error.message)
      return { success: false, error: "Could not save this bookmark." }
    }

    revalidatePath("/")
    revalidatePath("/news/[id]", "page")
    return { success: true, alreadyBookmarked: !data }
  } catch (error) {
    console.error("Error adding bookmark:", error)
    return { success: false, error: "Could not save this bookmark." }
  }
}

/** Return only the current user's bookmarks; RLS remains the database boundary. */
export async function fetchBookmarks(): Promise<BookmarkRecord[]> {
  const { userId } = await auth()
  if (!userId) return []

  const supabase = await supabaseActivation()
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id, user_id, url, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bookmarks:", error.message)
    return []
  }

  return (data ?? []) as BookmarkRecord[]
}

/** Delete a bookmark owned by the current user. */
export async function deleteBookmark(id: string): Promise<BookmarkActionResult> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "Sign in to manage bookmarks." }

  const supabase = await supabaseActivation()
  const { data, error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Error deleting bookmark:", error.message)
    return { success: false, error: "Could not remove this bookmark." }
  }

  if (!data) return { success: false, error: "Bookmark not found." }

  revalidatePath("/")
  revalidatePath("/news/[id]", "page")
  return { success: true }
}

/** Store internal article routes independent of the current host/environment. */
function normalizeBookmarkUrl(url: string) {
  const value = url.trim()
  if (value.startsWith("/news/")) return value.split(/[?#]/, 1)[0]

  try {
    const parsed = new URL(value)
    return parsed.pathname.startsWith("/news/")
      ? parsed.pathname
      : null
  } catch {
    return null
  }
}
