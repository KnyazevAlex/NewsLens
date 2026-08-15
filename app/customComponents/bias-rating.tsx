interface BiasRatingProps {
  value: number // Value between -100 (Left) and 100 (Right), 0 is Neutral
  label?: string
}

export function BiasRatingIndicator({ value, label }: BiasRatingProps) {
  // Map value (-100 to 100) to percentage (0% to 100%)
  const positionPercent = Math.min(Math.max(((value + 100) / 200) * 100, 0), 100)

  return (
    <div className="w-full space-y-2">
      {label && <div className="text-sm font-medium text-neutral-900">{label}</div>}
      <div className="relative flex items-center h-4 w-full">
        {/* Track Line */}
        <div className="h-1 w-full bg-neutral-200 rounded-full" />
        
        {/* Point Markers */}
        <div className="absolute left-0 h-1.5 w-1.5 rounded-full bg-neutral-400" />
        <div className="absolute left-[25%] h-1.5 w-1.5 rounded-full bg-neutral-400" />
        <div className="absolute left-[50%] h-1.5 w-1.5 rounded-full bg-neutral-400" />
        <div className="absolute left-[75%] h-1.5 w-1.5 rounded-full bg-neutral-400" />
        <div className="absolute right-0 h-1.5 w-1.5 rounded-full bg-neutral-400" />

        {/* Active Value Dot */}
        <div
          className="absolute h-3.5 w-3.5 rounded-full bg-[#2563EB] border-2 border-white shadow-sm -translate-x-1/2 transition-all"
          style={{ left: `${positionPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-neutral-500 font-medium">
        <span>Left</span>
        <span>Center</span>
        <span>Right</span>
      </div>
    </div>
  )
}
export default BiasRatingIndicator