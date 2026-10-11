import { Home, TrendingUp, Layers, Bookmark, History, Filter, Search, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Render the desktop sidebar with news navigation and filter controls.
 */
const LeftSideBar = () => {
    return (
           <aside className="hidden lg:flex w-64 bg-white border-r border-neutral-200 flex-col justify-between flex-shrink-0 sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <div className="h-20 flex items-center px-6 gap-3">
            <Link href="/" className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white font-bold text-lg">
              N
            </Link>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight leading-none">NewsLens</h1>
              <span className="text-[11px] text-neutral-500">Clear perspectives</span>
            </div>
          </div>

          {/* Main Nav */}
          <div className="flex nav-container flex-col h-screen">

          <nav className="px-4 space-y-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5  text-[#2563EB] rounded-lg font-medium text-sm">
              <Home className="w-4 h-4" /> Home
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <TrendingUp className="w-4 h-4" /> Trending
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Layers className="w-4 h-4" /> Sources
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Bookmark className="w-4 h-4" /> Bookmarks
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <History className="w-4 h-4" /> History
            </Link>
          </nav>

          <div className="my-6 mx-4 border-t border-neutral-100" />

          {/* Secondary Nav */}
          <nav className="px-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Filter className="w-4 h-4" /> Filter
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Search className="w-4 h-4" /> Search
            </a>
            <a href="/logs" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <FileText className="w-4 h-4" /> Logs
            </a>
          </nav>
        </div>

        </div>

     
       
      </aside>

    )
}

export default LeftSideBar