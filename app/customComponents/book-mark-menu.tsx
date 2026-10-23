'use client'

import { Dialog } from '@base-ui/react/dialog';
import BookmarkCard from './bookmarkCardRender';
import { BookMarkType } from './header'; // doesnt work for some reason



const BookMarkMenu = ({open, onOpenChange, bookmarks} : {open: boolean, onOpenChange: (open: boolean) => void, bookmarks: any[] | null }) => {
 

return(
    
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
    

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed z-[51] inset-0 bg-black/50" />
        <Dialog.Popup className="fixed z-52 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-[480px] max-h-[80vh] overflow-y-auto">

          {!bookmarks &&
            <div className='noBookmarks'>
                <h1>No bookmarks yet...</h1>
            </div>
          }
          { bookmarks && bookmarks.map((bookmark) => {

            return(
              <BookmarkCard
              bookmark={bookmark}
               />
            )
          })

          }

          <Dialog.Close className="mt-4 rounded-lg bg-neutral-100 px-4 py-2 text-sm hover:bg-neutral-200">
            Close
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>

)
   
}
export default BookMarkMenu;