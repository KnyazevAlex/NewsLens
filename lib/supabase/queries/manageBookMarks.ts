'use server'

import supabaseActivation from "../useSupabse";
import { revalidatePath } from "next/cache"


export const addBookmark = async (url : string,  title : string) => {

const supabase = await supabaseActivation()


const {error} = await supabase.from('bookmarks').insert([{url, title, }])

if(error) console.error(`An error occured while adding the bookmark to the profile: ${error}`)

else{

revalidatePath('/')

return {
  success: true
}

}

}

export const fetchBookmarks = async () => {

const supabase = await supabaseActivation()
console.log(supabase)

const {data, error} = await supabase.from('bookmarks').select('*')

if(error) console.error(`An error occured while fetching bookmarks: ${error}`)

else{


return data


}

}

export const deleteBookmark = async (id : string) => {

const supabase = await supabaseActivation()

  const { data, error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Error deleting bookmark:", error.message)
    return { success: false, error: "Failed to delete bookmark." }
  }

  if (!data) {
    return { success: false, error: "Bookmark not found." }
  }

  revalidatePath("/")

  return { success: true }
}
