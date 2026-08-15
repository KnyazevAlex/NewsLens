import { Bookmark, MoreHorizontal, X, HelpCircle } from "lucide-react"
import { BiasRatingIndicator } from "./bias-rating"
import { BiasBadge } from "./bias-badge"

export interface NewsCardProps {
  source: string
  timeAgo: string
  title: string
  description?: string
  category: string
  biasValue: number
  biasLabel?: "left" | "neutral" | "right" | "mixed"
  imageUrl?: string
}

/** List View News Card */
export function NewsCardList({
  source,
  timeAgo,
  title,
  description,
  category,
  biasValue,
  imageUrl = "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80",
}: NewsCardProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 flex gap-4 max-w-2xl shadow-xs">
      <img
        src={imageUrl}
        alt={title}
        className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
      />
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-700">{source}</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-400">
              <button className="hover:text-neutral-600"><Bookmark className="w-4 h-4" /></button>
              <button className="hover:text-neutral-600"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          </div>
          <h3 className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-2 mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-neutral-500 line-clamp-2 mb-2">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <span className="inline-block bg-[#DBEAFE] text-[#2563EB] px-2.5 py-0.5 rounded-full text-[11px] font-medium">
            {category}
          </span>
          <div className="w-28">
            <BiasRatingIndicator value={biasValue} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Detailed/Expanded View News Card */
export function NewsCardExpanded({
  source,
  timeAgo,
  title,
  biasValue,
  biasLabel = "neutral",
  imageUrl = "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80",
}: NewsCardProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 max-w-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-700">{source}</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400">
          <button className="hover:text-neutral-600"><Bookmark className="w-4 h-4" /></button>
          <button className="hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <h2 className="text-lg font-bold text-neutral-900 leading-tight">
        {title}
      </h2>

      {/* Embedded Tabs standard mockup */}
      <div className="border-b border-neutral-200 flex gap-6 text-xs font-medium text-neutral-500 pb-2">
        <button className="text-primary-main font-semibold border-b-2 border-primary-main pb-2 -mb-2">Overview</button>
        <button className="hover:text-neutral-800">Key Points</button>
        <button className="hover:text-neutral-800">Weak Points</button>
        <button className="hover:text-neutral-800">Sources</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-40 object-cover rounded-lg"
        />
        <div className="space-y-3">
          <div className="text-xs text-neutral-500">
            Bias Rating: <span className="font-semibold text-neutral-900 capitalize">{biasLabel}</span>
          </div>
          <BiasRatingIndicator value={biasValue} />
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <span>Why?</span>
            <HelpCircle className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  )
}