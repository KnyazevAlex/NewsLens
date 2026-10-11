import { cn } from "@/lib/utils"

interface FramingDistributionProps {
  left: number
  center: number
  right: number
  compact?: boolean
  className?: string
}

/**
 * Render supplied framing percentages as an accessible bar with optional compact sizing.
 */
export function FramingDistribution({
  left,
  center,
  right,
  compact = false,
  className,
}: FramingDistributionProps) {
  const description = `AI-estimated framing distribution: ${left}% left, ${center}% center, ${right}% right.`

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn("flex w-full overflow-hidden rounded-full bg-neutral-100", compact ? "h-1.5" : "h-2")}
        role="img"
        aria-label={description}
      >
        <span className="bg-blue-600" style={{ width: `${left}%` }} />
        <span className="bg-neutral-500" style={{ width: `${center}%` }} />
        <span className="bg-red-500" style={{ width: `${right}%` }} />
      </div>
      <div className={cn("grid grid-cols-3 gap-2 font-medium", compact ? "text-[10px]" : "text-xs")}>
        <span className="text-blue-700">Left {left}%</span>
        <span className="text-center text-neutral-600">Center {center}%</span>
        <span className="text-right text-red-600">Right {right}%</span>
      </div>
    </div>
  )
}

