import { ChevronDown } from "lucide-react"
import { connection } from "next/server"

import BiasWidget from "@/app/customComponents/bias-widget"
import Header from "@/app/customComponents/header"
import LatestLogs from "@/app/customComponents/latest-logs"
import LeftSideBar from "@/app/customComponents/left-side-bar"
import NewsGrid from "@/app/customComponents/news-grid"
import { Button } from "@/components/ui/button"
import { getBiasOverview, getRecentArticles } from "@/lib/supabase/queries/articles"
import { getRecentLogs } from "@/lib/supabase/queries/logs"

export default async function HomePage() {
  await connection()

  const [articles, biasOverview, logs] = await Promise.all([
    getRecentArticles(),
    getBiasOverview(),
    getRecentLogs(),
  ])

  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans">
      <LeftSideBar />

      <main className="flex min-w-0 flex-1 flex-col">
        <Header />

        <div className="flex-1 p-4 sm:p-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-8 lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto pb-1">
                  {["All", "Politics", "Business", "Technology", "Science", "Environment"].map((category, index) => (
                    <button
                      key={category}
                      type="button"
                      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition-colors ${
                        index === 0
                          ? "border-2 border-[#2563EB] bg-white text-[#2563EB]"
                          : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="hidden shrink-0 gap-2 border-neutral-200 bg-white text-neutral-700 shadow-sm sm:flex">
                  Latest <ChevronDown className="h-4 w-4 text-neutral-400" />
                </Button>
              </div>

              <NewsGrid articles={articles} />

              <footer className="flex flex-wrap justify-center gap-4 pb-4 pt-4 text-center text-[11px] text-neutral-400">
                <span>{new Date().getFullYear()} All rights reserved.</span>
                <a href="#" className="hover:text-neutral-600">Privacy</a>
                <a href="#" className="hover:text-neutral-600">Terms</a>
                <a href="#" className="hover:text-neutral-600">Contact</a>
              </footer>
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80">
              <BiasWidget overview={biasOverview} />
              <LatestLogs logs={logs} />
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
