"use client"

import { motion } from "motion/react"

import type { BiasOverviewData } from "@/lib/supabase/queries/articles"

interface BiasWidgetProps {
  overview: BiasOverviewData
}
/**
 * Render average framing percentages and an empty state when no analyses exist.
 */
export default function BiasWidget({ overview }: BiasWidgetProps) {
  const stats = [
    { label: "Left", value: overview.left, color: "bg-blue-600" },
    { label: "Center / Neutral", value: overview.center, color: "bg-neutral-700" },
    { label: "Right", value: overview.right, color: "bg-red-500" },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">Bias Balance</h2>
        <div className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-200 font-serif text-[10px] text-neutral-400">i</div>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        {overview.analyzedCount
          ? `Average across ${overview.analyzedCount} analyzed articles`
          : "No analyzed articles yet"}
      </p>

      {overview.analyzedCount > 0 ? (
        <>
          <div className="mb-5 flex justify-center">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <path className="text-neutral-100" strokeWidth="3.8" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#2563EB]" strokeDasharray={`${overview.center}, 100`} strokeWidth="3.8" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold leading-none text-neutral-900">{overview.center}%</span>
                <span className="mt-0.5 text-[10px] font-medium text-neutral-500">Center</span>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 border-t border-neutral-100 pt-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <span className="w-28 truncate text-[11px] font-medium text-neutral-600">{stat.label}</span>
                <div className="relative h-1.5 flex-1 rounded-full bg-neutral-100">
                  <div className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-xs ${stat.color}`} style={{ left: `${stat.value}%` }} />
                </div>
                <span className="w-8 text-right text-[10px] font-bold text-neutral-700">{stat.value}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center text-xs text-neutral-400">
          Bias metrics will appear after an article analysis is saved.
        </div>
      )}
    </motion.section>
  )
}
