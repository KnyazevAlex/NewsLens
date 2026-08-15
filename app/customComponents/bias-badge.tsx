import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const biasBadgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        left: "bg-[#DBEAFE] text-[#2563EB]",
        neutral: "bg-[#E2E8F0] text-[#64748B]",
        right: "bg-[#FEE2E2] text-[#EF4444]",
        mixed: "bg-[#F3E8FF] text-[#8B5CF6]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface BiasBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof biasBadgeVariants> {}

export function BiasBadge({ className, variant, ...props }: BiasBadgeProps) {
  return (
    <div className={cn(biasBadgeVariants({ variant }), className)} {...props} />
  )
}
export {biasBadgeVariants}