"use client"

import { Bookmark } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"

import BiasRatingIndicator from "@/app/customComponents/bias-rating"
import type { NewsCardData } from "@/lib/supabase/queries/articles"

interface NewsGridProps {
  articles: NewsCardData[]
}
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

function formatBiasLabel(label: NewsCardData["biasLabel"]) {
  if (!label) return "Not analyzed"
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function biasLabelColor(label: NewsCardData["biasLabel"]) {
  if (label === "left") return "text-blue-600"
  if (label === "right") return "text-red-500"
  if (label === "mixed") return "text-purple-600"
  return "text-neutral-600"
}

export default function NewsGrid({ articles }: NewsGridProps) {
  if (!articles.length) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
        <h2 className="text-sm font-bold text-neutral-900">No articles yet</h2>
        <p className="mt-2 text-xs text-neutral-500">
          Apply the Supabase seed file or run the article pipeline to populate this feed.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {articles.map((article, index) => (
        <Link href={`/news/${article.id}`} key={article.id} className="block">
          <motion.article
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.04 }}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-44 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-500">
                  <span className="font-bold text-neutral-900">{article.source}</span>
                  <span>•</span>
                  <time dateTime={article.publishedAt}>
                    {dateFormatter.format(new Date(article.publishedAt))}
                  </time>
                </div>
                <Bookmark className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              </div>

              <h2 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-neutral-900">
                {article.title}
              </h2>
              <p className="mb-4 line-clamp-3 flex-1 text-xs text-neutral-500">
                {article.description}
              </p>

              {article.categories.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {article.categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-md border border-blue-100 bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-medium text-neutral-500">AI framing</span>
                  <span className={`font-bold ${biasLabelColor(article.biasLabel)}`}>
                    {formatBiasLabel(article.biasLabel)}
                  </span>
                </div>
                {article.biasLabel && (
                  <div className="w-24">
                    <BiasRatingIndicator value={article.biasValue} />
                  </div>
                )}
              </div>
            </div>
          </motion.article>
        </Link>
      ))}
    </div>
  )
}
