import "server-only"

import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/types"

/**
 * Read a required server environment value, throwing if it is missing or empty.
 */
function requireServerEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required server configuration: ${name}`)
  }

  return value
}

/**
 * Create a typed server-only service-role client with session persistence and refresh disabled.
 * Throw if the Supabase URL or service-role key is missing.
 */
export function createServerSupabaseClient() {
  return createClient<Database>(
    requireServerEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requireServerEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  )
}

