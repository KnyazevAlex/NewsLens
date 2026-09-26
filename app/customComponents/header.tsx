import Link from "next/link"
import { Search, Bookmark, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Show, SignInButton, UserButton } from "@clerk/nextjs" // Updated import[cite: 7]

/**
 * Render the news toolbar with search controls and Clerk sign-in or account controls.
 */
export default function Header() {
  return (
    <header className="h-20 bg-neutral-50/80 backdrop-blur-sm border-b border-neutral-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="lg:hidden rounded-lg border-neutral-200 bg-white">
          <Menu className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative w-44 sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input placeholder="Search news, topics, sources..." className="pl-9 bg-white border-neutral-200 shadow-sm rounded-lg text-sm" />
          <kbd className="hidden md:inline-block absolute right-3 top-2.5 text-[10px] font-sans font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">/</kbd>
        </div>
        <Button variant="outline" size="icon" className="hidden sm:flex rounded-lg border-neutral-200 bg-white shadow-sm text-neutral-600">
          <Bookmark className="w-4 h-4" />
        </Button>
        
        {/* Clerk Auth Components */}
        <div className="flex items-center gap-2">
          
          {/* v7 Show Component for signed out state[cite: 7] */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="default" size="sm" className="bg-[#2563EB] hover:bg-blue-700 text-white font-medium shadow-sm">
                Sign In
              </Button>
            </SignInButton>
          </Show>

          {/* v7 Show Component for signed in state[cite: 7] */}
          <Show when="signed-in">
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-9 h-9 border border-neutral-200 shadow-sm"
                }
              }}
            />
          </Show>
          
        </div>
      </div>
    </header>
  )
}