"use client"

import { motion, Variants } from "motion/react"
import LeftSideBar from "@/app/customComponents/left-side-bar"
import Link from "next/link"
import { 
  FileText, ChevronDown, 
  CheckCircle2, Calendar, Clock
} from "lucide-react"
import Header from "@/app/customComponents/header"
import { Button } from "@/components/ui/button"
import { BiasBadge } from "@/app/customComponents/bias-badge"
import NewsGrid from "@/app/customComponents/news-grid"
import BiasWidget from "@/app/customComponents/bias-widget"
import LatestLogs from "@/app/customComponents/latest-logs"
import { BiasRatingIndicator } from "@/app/customComponents/bias-rating"

// --- Animation Variants ---
const containerVariants: Variants = {
  closed: { opacity: 0 },
  open: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans">
      
      {/* --- LEFT SIDEBAR (Hidden on mobile, visible on lg screens) --- */}

      <LeftSideBar></LeftSideBar>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <Header />

        {/* Scrollable Dashboard Area */}
        <div className="flex-1 p-4 sm:p-8">
          <div className="flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto">
            
            {/* Center Column (News Feed) */}
            <motion.div 
              className="flex-1 flex flex-col gap-6 min-w-0"
              variants={containerVariants}
              initial="closed"
              animate="open"
            >
              {/* Category Pills */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide w-full">
                  {["All", "Politics", "Business", "Technology", "Science", "Environment"].map((cat, i) => (
                    <button 
                      key={cat}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        i === 0 
                          ? "bg-white border-2 border-[#2563EB] text-[#2563EB] shadow-sm" 
                          : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 shadow-sm"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="hidden sm:flex gap-2 bg-white shadow-sm border-neutral-200 text-neutral-700 flex-shrink-0">
                  Latest <ChevronDown className="w-4 h-4 text-neutral-400" />
                </Button>
              </div>

              {/* News Grid */}
              
           <NewsGrid></NewsGrid>

              <div className="flex justify-center pt-4 pb-8">
                <Button variant="outline" className="bg-[#F8FAFC] text-[#2563EB] border-[#DBEAFE] hover:bg-[#EFF6FF] px-8">
                  Load more
                </Button>
              </div>
              
              <footer className="text-center text-[11px] text-neutral-400 pb-4 flex flex-wrap justify-center gap-4">
                <span> {new Date().getFullYear() } All rights reserved.</span>
                <a href="#" className="hover:text-neutral-600">Privacy</a>
                <a href="#" className="hover:text-neutral-600">Terms</a>
                <a href="#" className="hover:text-neutral-600">Contact</a>
              </footer>
            </motion.div>

            {/* Right Sidebar (Widgets) */}
            <motion.div 
              className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6"
              variants={containerVariants}
              initial="closed"
              animate="open"
            >
              
              {/* Redesigned Bias Balance Widget */}
              <BiasWidget></BiasWidget>

              {/* Latest Logs Widget */}
          
              <LatestLogs></LatestLogs>

            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}