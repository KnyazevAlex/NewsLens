"use client"

import { motion } from "motion/react"
import Link from "next/link"
import posthog from "posthog-js"
import BookmarkComponent from "@/app/customComponents/bookmark"
import { BiasBadge } from "@/app/customComponents/bias-badge"
import { FramingDistribution } from "@/app/customComponents/framing-distribution"
import type { NewsCardData } from "@/lib/supabase/queries/articles"
import type { BookmarkRecord } from "@/lib/supabase/types"

interface NewsGridProps {
  articles: NewsCardData[]
  bookmarks?: BookmarkRecord[]
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

function formatSentimentLabel(label: NewsCardData["sentimentLabel"]) {
  if (!label) return "Pending"
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function trackArticleOpen(article: NewsCardData) {
  posthog.capture("article_opened", {
    article_id: article.id,
    source: article.source,
    analysis_available: Boolean(article.biasLabel),
  })
}

export default function NewsGrid({ articles, bookmarks = [] }: NewsGridProps) {
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
      {articles.map((article, index) => {
        const articlePath = `/news/${article.id}`
        const isBookmarked = bookmarks.some((bookmark) => bookmark.url === articlePath)

        return (
          <motion.article
            key={article.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.04 }}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <Link
              href={articlePath}
              onClick={() => trackArticleOpen(article)}
              aria-label={`Read ${article.title}`}
              className="relative block h-44 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-neutral-500">
                  <span className="truncate font-bold text-neutral-900">{article.source}</span>
                  <span aria-hidden="true">•</span>
                  <time className="shrink-0" dateTime={article.publishedAt}>
                    {dateFormatter.format(new Date(article.publishedAt))}
                  </time>
                </div>
                <BookmarkComponent
                  url={articlePath}
                  title={article.title}
                  isBookmarked={isBookmarked}
                  compact
                />
              </div>

              <Link
                href={articlePath}
                onClick={() => trackArticleOpen(article)}
                className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-neutral-900 hover:text-blue-700"
              >
                {article.title}
              </Link>
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

              {article.biasLabel
                && article.leftPercentage !== null
                && article.centerPercentage !== null
                && article.rightPercentage !== null
                && article.confidence !== null ? (
                  <div className="space-y-3 border-t border-neutral-100 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                          AI-estimated framing
                        </span>
                        <BiasBadge variant={article.biasLabel} className="px-2 py-0.5 text-[10px]">
                          {formatBiasLabel(article.biasLabel)}
                        </BiasBadge>
                      </div>
                      <span className="text-[10px] font-medium text-neutral-500">
                        {Math.round(article.confidence * 100)}% confidence
                      </span>
                    </div>
                    <FramingDistribution
                      left={article.leftPercentage}
                      center={article.centerPercentage}
                      right={article.rightPercentage}
                      compact
                    />
                    <div className="text-[10px] text-neutral-500">
                      Sentiment: <span className="font-semibold text-neutral-700">{formatSentimentLabel(article.sentimentLabel)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-neutral-100 pt-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    Analysis pending
                  </div>
                )}
            </div>
          </motion.article>
        )
      })}
    </div>
  )
}
