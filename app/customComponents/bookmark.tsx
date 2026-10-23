'use client'

import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import { addBookmark } from "@/lib/supabase/queries/manageBookMarks"
import { title } from "process"

interface bookmarkProps {
    url: string,
    title: string
}
const BookmarkComponent = ({url, title} : bookmarkProps) => {

return(
    
    <Button
     variant="ghost" size="icon"
     onClick={async() => {

    const result = await addBookmark(url, title)

    if(result?.success){
    console.log('Bookmark added!')
    }
    }}
    className="h-8 w-8 hover:text-neutral-900" aria-label="Bookmark article">

    <Bookmark className="h-4 w-4" />
    
    </Button>
)
}

export default BookmarkComponent