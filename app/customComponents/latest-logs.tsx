"use client"

import { AlertCircle, Calendar, CheckCircle2, Clock, FileText } from "lucide-react"
import { motion } from "motion/react"

import type { LogItemData } from "@/lib/supabase/queries/logs"

interface LatestLogsProps {
  logs: LogItemData[]
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
})

/**
 * Choose a log icon by severity first, then by schedule or article event type.
 */
function LogIcon({ log }: { log: LogItemData }) {
  if (log.level === "error") return <AlertCircle className="h-4 w-4 text-red-500" />
  if (log.level === "success") return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (log.event.includes("schedule")) return <Calendar className="h-4 w-4 text-purple-500" />
  if (log.event.includes("article")) return <FileText className="h-4 w-4 text-blue-500" />
  return <Clock className="h-4 w-4 text-orange-500" />
}

/**
 * Render recent pipeline activity with UTC timestamps, or an empty state.
 */
export default function LatestLogs({ logs }: LatestLogsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.06 }}
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">Latest Logs</h2>
      </div>

      {logs.length ? (
        <div className="space-y-5">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3">
              <div className="mt-0.5"><LogIcon log={log} /></div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-900">{log.message}</span>
                  <time dateTime={log.createdAt} className="shrink-0 text-[9px] text-neutral-400">
                    {dateFormatter.format(new Date(log.createdAt))}
                  </time>
                </div>
                {log.detail && <p className="truncate text-[11px] text-neutral-500">{log.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center text-xs text-neutral-400">
          Pipeline activity will appear here.
        </div>
      )}
    </motion.section>
  )
}
