import { Button} from "@/components/ui/button"
import {Menu, Search, Bookmark} from "lucide-react"
import { Input } from "@/components/ui/input"

const Header = () => {
    return (
             <header className="h-20 bg-neutral-50/80 backdrop-blur-sm border-b border-neutral-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden rounded-lg border-neutral-200 bg-white">
              <Menu className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2">
                Good morning <span className="animate-bounce origin-bottom">👋</span>
              </h2>
              <p className="hidden sm:block text-sm text-neutral-500">Real news. AI analysis. Clear perspectives.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative w-44 sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input placeholder="Search news..." className="pl-9 bg-white border-neutral-200 shadow-sm rounded-lg text-sm" />
              <kbd className="hidden md:inline-block absolute right-3 top-2.5 text-[10px] font-sans font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">/</kbd>
            </div>
            <Button variant="outline" size="icon" className="hidden sm:flex rounded-lg border-neutral-200 bg-white shadow-sm text-neutral-600">
              <Bookmark className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 cursor-pointer">
              <img src="https://github.com/shadcn.png" alt="Profile" className="w-9 h-9 rounded-full border border-neutral-200 shadow-sm" />
            </div>
          </div>
        </header>
    )
}

export default Header