import Link from "next/link"
import { 
  Home, TrendingUp, Layers, Bookmark, History, 
  Filter, Search, FileText, ChevronRight, ChevronDown, 
  Share2, ArrowLeft, CheckCircle2, Globe, Calendar, Clock, BookOpen, Menu
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {UserProfile} from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { BiasRatingIndicator } from "@/app/customComponents/bias-rating"
import { getArticleById } from "@/app/data/data/mock-news"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function NewsDetailsPage({ params }: PageProps) {
  const resolvedParams = await params
  const article = getArticleById(resolvedParams.id)

  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans">
      
      {/* --- LEFT SIDEBAR --- */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-neutral-200 flex-col justify-between flex-shrink-0 sticky top-0 h-screen">
        <div>
          <div className="h-20 flex items-center px-6 gap-3">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white font-bold text-lg">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight leading-none">biasly</h1>
              <span className="text-[11px] text-neutral-500">Clear perspectives</span>
            </div>
          </div>

          <nav className="px-4 space-y-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Home className="w-4 h-4" /> Home
            </Link>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <TrendingUp className="w-4 h-4" /> Trending
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Layers className="w-4 h-4" /> Sources
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Bookmark className="w-4 h-4" /> Bookmarks
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <History className="w-4 h-4" /> History
            </a>
          </nav>

          <div className="my-6 mx-4 border-t border-neutral-100" />

          <nav className="px-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Filter className="w-4 h-4" /> Filter
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <Search className="w-4 h-4" /> Search
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-sm transition-colors">
              <FileText className="w-4 h-4" /> Logs
            </a>
          </nav>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2 cursor-pointer hover:bg-neutral-50 p-2 rounded-lg transition-colors">
          </div>

          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <h4 className="text-sm font-semibold text-neutral-900 mb-1">Free Plan</h4>
            <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
              AI summaries & basic analysis for everyday news.
            </p>
            <div className="w-full h-1.5 bg-neutral-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-[#2563EB] w-[60%] rounded-full" />
            </div>
            <p className="text-[11px] text-neutral-500 font-medium mb-3">12 / 20 summaries used</p>
            <Button className="w-full bg-white text-[#2563EB] border border-[#2563EB]/20 hover:bg-blue-50 h-8 text-xs font-semibold">
              Upgrade
            </Button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-20 bg-neutral-50/80 backdrop-blur-sm border-b border-neutral-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden rounded-lg border-neutral-200 bg-white">
              <Menu className="w-4 h-4" />
            </Button>
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
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
            <div className="flex items-center gap-2 cursor-pointer">
              <img src="https://github.com/shadcn.png" alt="Profile" className="w-9 h-9 rounded-full border border-neutral-200 shadow-sm" />
            </div>
          </div>
        </header>

        {/* Scrollable Details Area */}
        <div className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto">
            
            {/* Left/Center Column: Article Reader */}
            <div className="flex-1 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6">
              
              {/* Meta & Title */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                    <span className="font-bold text-neutral-900">{article.source}</span>
                    <span>•</span>
                    <span>{article.timeAgo}</span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-neutral-900"><Bookmark className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-neutral-900"><Share2 className="w-4 h-4" /></Button>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 leading-tight">
                  {article.title}
                </h1>

                <p className="text-sm text-neutral-600 leading-relaxed">
                  {article.description}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {article.categories.map(cat => (
                    <span key={cat} className="px-3 py-1 bg-[#EEF2FF] text-[#2563EB] rounded-md text-xs font-semibold">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Featured Image */}
              <div className="relative rounded-xl overflow-hidden shadow-sm h-72 sm:h-96">
                <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
              </div>

              {/* Article Content Paragraphs */}
              <div className="space-y-4 text-neutral-800 text-sm sm:text-base leading-relaxed pt-2">
                {article.content.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              {/* Related Articles Section */}
              <div className="pt-8 border-t border-neutral-200 space-y-4">
                <h3 className="font-bold text-neutral-900 text-base">Related Articles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {article.relatedArticles.map((rel) => (
                    <Link key={rel.id} href={`/news/${rel.id}`} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex flex-col justify-between hover:border-blue-300 transition-colors group">
                      <div className="space-y-2">
                        <img src={rel.imageUrl} alt={rel.title} className="w-full h-24 object-cover rounded-lg group-hover:scale-105 transition-transform" />
                        <h4 className="font-semibold text-neutral-900 text-xs line-clamp-2 leading-snug">{rel.title}</h4>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-3">
                        <span className="font-medium text-neutral-700">{rel.source}</span>
                        <span>{rel.timeAgo}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: AI Analysis Widgets */}
            <div className="w-full xl:w-96 flex-shrink-0 flex flex-col gap-6">
              
              {/* Bias Rating Widget */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-neutral-900 text-sm">Bias Rating</h3>
                  <div className="w-4 h-4 rounded-full border border-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 font-serif">i</div>
                </div>
                <div>
                  <span className="text-xl font-extrabold text-[#2563EB]">{article.biasLabel}</span>
                </div>
                <BiasRatingIndicator value={article.biasValue} />
                <p className="text-xs text-neutral-500 leading-normal pt-1">
                  {article.biasDescription}
                </p>
              </div>

              {/* Bias Distribution Widget */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-neutral-900 text-sm">Bias Distribution</h3>
                  <div className="w-4 h-4 rounded-full border border-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 font-serif">i</div>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { label: "Left", val: `${article.biasDistribution.left}%`, color: "bg-blue-600", pos: "left-[32%]" },
                    { label: "Center / Neutral", val: `${article.biasDistribution.neutral}%`, color: "bg-neutral-600", pos: "left-[64%]" },
                    { label: "Right", val: `${article.biasDistribution.right}%`, color: "bg-red-500", pos: "left-[25%]" },
                    { label: "Mixed", val: `${article.biasDistribution.mixed}%`, color: "bg-purple-500", pos: "left-[28%]" },
                  ].map((row) => (
                    <div key={row.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-neutral-600">{row.label}</span>
                        <span className="text-neutral-900 font-bold">{row.val}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full relative flex items-center">
                        <div className={`absolute h-3 w-3 rounded-full ${row.color} border-2 border-white shadow-xs ${row.pos} -translate-x-1/2`} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 pt-1">Percentages may overlap.</p>
              </div>

              {/* Key Points Widget */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-neutral-900 text-sm">Key Points</h3>
                <div className="space-y-3">
                  {article.keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-neutral-700 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources Widget */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-neutral-900 text-sm">Sources</h3>
                <div className="space-y-2.5">
                  {article.sourcesList.map((src, index) => (
                    <div key={index} className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100 last:border-0">
                      <span className="font-medium text-neutral-800">{src.name}</span>
                      <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">{src.type}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full text-xs text-[#2563EB] border-blue-100 bg-[#EEF2FF]/50 hover:bg-[#EEF2FF]">
                  View all sources ({article.sourcesList.length})
                </Button>
              </div>

              {/* Article Details Widget */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
                <h3 className="font-bold text-neutral-900 text-sm mb-4">Article Details</h3>
                <div className="flex items-center justify-between text-neutral-600">
                  <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-neutral-400" /> Published</span>
                  <span className="font-medium text-neutral-900">{article.publishedAt}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-neutral-400" /> Category</span>
                  <span className="font-medium text-neutral-900">{article.categories.join(", ")}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-neutral-400" /> Region</span>
                  <span className="font-medium text-neutral-900">{article.region}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-neutral-400" /> Read time</span>
                  <span className="font-medium text-neutral-900">{article.readTime}</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  )
}