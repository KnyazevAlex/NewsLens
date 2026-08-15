"use client"

import { motion, Variants } from "motion/react"
import { BiasBadge } from "@/app/customComponents/bias-badge"
import { BiasRatingIndicator } from "@/app/customComponents/bias-rating"
import { NewsCardList, NewsCardExpanded } from "@/app/customComponents/news-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Home, TrendingUp, LayoutGrid, Globe, Bookmark, History, Share2 } from "lucide-react"

const containerVariants : Variants = {
  closed: { opacity: 0 },
  open: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants : Variants = {
  closed: { opacity: 0, y: 20 },
  open: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
}

export default function DesignSystemPage() {
  return (
    <motion.div 
      className="min-h-screen bg-neutral-50 p-8 space-y-12"
      variants={containerVariants}
      initial="closed"
      animate="open"
    >
      <motion.header variants={itemVariants} initial="closed" animate="open" className="border-b border-neutral-200 pb-4">
        <h1 className="text-3xl font-bold text-neutral-900">NewsLens</h1>
        <p className="text-sm text-neutral-500">Design System v1.0 Preview</p>
      </motion.header>

      {/* 03 Components — Bias Badges & Rating */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">03 Components — Bias Badges</h2>
          <div className="flex flex-wrap gap-3">
            <BiasBadge variant="left">Left</BiasBadge>
            <BiasBadge variant="neutral">Neutral</BiasBadge>
            <BiasBadge variant="right">Right</BiasBadge>
            <BiasBadge variant="mixed">Mixed</BiasBadge>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Bias Rating Indicator</h2>
          <BiasRatingIndicator value={0} label="Neutral Analysis" />
          <BiasRatingIndicator value={75} label="Right-Leaning Framing" />
        </div>
      </motion.section>

      {/* 04 Buttons */}
      <motion.section variants={itemVariants} className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">04 Buttons</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button className="bg-[#2563EB] text-white hover:bg-[#2563EB]/90">Read Full Article →</Button>
          <Button variant="outline">Save Article</Button>
          <Button variant="ghost" size="icon"><Bookmark className="w-4 h-4" /></Button>
          <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> Filters</Button>
        </div>
      </motion.section>

      {/* 05 Card Designs */}
      <motion.section variants={itemVariants} className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
        <h2 className="text-lg font-bold text-neutral-900">05 Card Designs</h2>
        
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500">News Card (List View)</h3>
          <NewsCardList
            source="Reuters"
            timeAgo="2m ago"
            title="NASA successfully launches Artemis II mission to the Moon"
            description="The Orion spacecraft launched from Kennedy Space Center, aiming to pave the way for future lunar exploration."
            category="Science"
            biasValue={0}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-500">News Card (Detailed/Expanded View)</h3>
          <NewsCardExpanded
            source="Reuters"
            timeAgo="2m ago"
            title="NASA successfully launches Artemis II mission to the Moon"
            category="Science"
            biasValue={0}
            biasLabel="neutral"
          />
        </div>
      </motion.section>

      {/* 06 Input & Controls */}
      <motion.section variants={itemVariants} className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
        <h2 className="text-lg font-bold text-neutral-900">06 Input & Controls</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input placeholder="Search news, topics, sources..." className="pl-9" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Checkbox id="saved" />
            <label htmlFor="saved" className="text-sm font-medium text-neutral-900">Show only saved</label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="realtime" />
            <label htmlFor="realtime" className="text-sm font-medium text-neutral-900">Real-time updates</label>
          </div>
        </div>
      </motion.section>

      {/* 08 Icons */}
      <motion.section variants={itemVariants} className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">08 Outline Icons</h2>
        <div className="flex items-center gap-6 text-neutral-600">
          <div className="flex flex-col items-center gap-1"><Home className="w-5 h-5" /><span className="text-xs">Home</span></div>
          <div className="flex flex-col items-center gap-1"><TrendingUp className="w-5 h-5" /><span className="text-xs">Trending</span></div>
          <div className="flex flex-col items-center gap-1"><LayoutGrid className="w-5 h-5" /><span className="text-xs">Categories</span></div>
          <div className="flex flex-col items-center gap-1"><Globe className="w-5 h-5" /><span className="text-xs">Sources</span></div>
          <div className="flex flex-col items-center gap-1"><Bookmark className="w-5 h-5" /><span className="text-xs">Bookmarks</span></div>
          <div className="flex flex-col items-center gap-1"><History className="w-5 h-5" /><span className="text-xs">History</span></div>
          <div className="flex flex-col items-center gap-1"><Share2 className="w-5 h-5" /><span className="text-xs">Share</span></div>
        </div>
      </motion.section>
    </motion.div>
  )
}