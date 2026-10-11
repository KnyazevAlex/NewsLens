import Link from "next/link"
import {
  Home,
  TrendingUp,
  Layers,
  Bookmark,
  History,
  Filter,
  Search,
  FileText,
  Menu,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

const primaryLinks = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "#",
    label: "Trending",
    icon: TrendingUp,
  },
  {
    href: "#",
    label: "Sources",
    icon: Layers,
  },
  {
    href: "#",
    label: "Bookmarks",
    icon: Bookmark,
  },
  {
    href: "#",
    label: "History",
    icon: History,
  },
]

const utilityLinks = [
  {
    href: "#",
    label: "Filter",
    icon: Filter,
  },
  {
    href: "#",
    label: "Search",
    icon: Search,
  },
  {
    href: "/logs",
    label: "Logs",
    icon: FileText,
  },
]

function MobileMenu({
  onNavigate,
}: {
  onNavigate: () => void
}) {
  return (
    <motion.div
      className="
        lg:hidden
        overflow-hidden
        border-t
        border-neutral-200
        bg-white
        shadow-lg
      "
      initial={{
        opacity: 0,
        height: 0,
      }}
      animate={{
        opacity: 1,
        height: "auto",
      }}
      exit={{
        opacity: 0,
        height: 0,
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
    >
      <nav className="p-3">
        {/* Main navigation */}
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {primaryLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              className="
                flex
                items-center
                gap-3
                rounded-xl
                px-3
                py-3
                text-sm
                font-medium
                text-neutral-600
                transition-colors
                hover:bg-neutral-50
                active:bg-neutral-100
              "
            >
              <span
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-neutral-50
                  text-neutral-500
                "
              >
                <Icon className="h-4 w-4" />
              </span>

              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div className="my-2 h-px bg-neutral-100" />

        {/* Utility navigation */}
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {utilityLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              className="
                flex
                items-center
                gap-3
                rounded-xl
                px-3
                py-3
                text-sm
                font-medium
                text-neutral-600
                transition-colors
                hover:bg-neutral-50
                active:bg-neutral-100
              "
            >
              <span
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-neutral-50
                  text-neutral-500
                "
              >
                <Icon className="h-4 w-4" />
              </span>

              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </motion.div>
  )
}

export default MobileMenu