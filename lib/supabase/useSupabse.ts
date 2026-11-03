import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"


export default async function supabaseActivation() {


  const { getToken } = await auth()
  const token = await getToken()

  if(!token) throw new Error('No active session!')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  return supabase
}   