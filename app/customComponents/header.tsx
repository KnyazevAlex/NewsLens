"use client"

import {
  Bookmark,
  Search,
  Menu,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import MobileMenu from "./mobileMenu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import posthog from "posthog-js"
import { useEffect, useRef, useState } from "react"


function SearchBar() {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />

      <Input
        placeholder="Search news, topics, sources..."
        className="
          h-10
          w-full
          pl-9
          bg-white
          border-neutral-200
          shadow-sm
          rounded-lg
          text-sm
        "
      />
    </div>
  )
}



export default function Header() {
  const { isLoaded, user } = useUser()

  const previousUserId = useRef<string | null>(null)

  const [menuExpanded, setMenuExpanded] = useState(false)

  const userId = user?.id
  const email = user?.primaryEmailAddress?.emailAddress
  const name = user?.fullName

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      if (previousUserId.current) {
        posthog.reset()
        previousUserId.current = null
      }

      return
    }

    if (
      previousUserId.current &&
      previousUserId.current !== userId
    ) {
      posthog.reset()
    }

    posthog.identify(userId, {
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    })

    previousUserId.current = userId
  }, [email, isLoaded, name, userId])

  const toggleMenu = () => {
    setMenuExpanded((current) => !current)
  }

  const closeMenu = () => {
    setMenuExpanded(false)
  }

  return (
    <header
      className="
        sticky
        top-0
        z-50
        shrink-0
        border-b
        border-neutral-200
        bg-neutral-50/95
        backdrop-blur-sm
      "
    >
      {/* =====================================================
          MAIN HEADER
      ====================================================== */}

      <div
        className="
          flex
          h-20
          items-center
          gap-3
          px-4
          sm:px-8
        "
      >
        {/* ===================================================
            MOBILE MENU BUTTON
        ==================================================== */}

        <Button
          onClick={toggleMenu}
          variant="outline"
          size="icon"
          aria-label={
            menuExpanded
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuExpanded}
          className="
            lg:hidden
            h-10
            w-10
            shrink-0
            rounded-lg
            border-neutral-200
            bg-white
            shadow-sm
          "
        >
          <AnimatePresence
            mode="wait"
            initial={false}
          >
            {menuExpanded ? (
              <motion.div
                key="close"
                initial={{
                  opacity: 0,
                  rotate: -90,
                  scale: 0.8,
                }}
                animate={{
                  opacity: 1,
                  rotate: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  rotate: 90,
                  scale: 0.8,
                }}
                transition={{
                  duration: 0.15,
                }}
              >
                <X className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{
                  opacity: 0,
                  rotate: 90,
                  scale: 0.8,
                }}
                animate={{
                  opacity: 1,
                  rotate: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  rotate: -90,
                  scale: 0.8,
                }}
                transition={{
                  duration: 0.15,
                }}
              >
                <Menu className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* ===================================================
            DESKTOP SEARCH
        ==================================================== */}

        <div className="hidden lg:block ml-auto w-80">
          <SearchBar />
        </div>

        {/* ===================================================
            MOBILE SEARCH
        ==================================================== */}

        <div className="lg:hidden min-w-0 flex-1">
          <SearchBar />
        </div>

        {/* ===================================================
            DESKTOP BOOKMARK BUTTON
        ==================================================== */}

        <Button
          variant="outline"
          size="icon"
          aria-label="Bookmarks"
          className="
            hidden
            sm:flex
            h-10
            w-10
            shrink-0
            rounded-lg
            border-neutral-200
            bg-white
            shadow-sm
            text-neutral-600
          "
        >
          <Bookmark className="h-4 w-4" />
        </Button>

        {/* ===================================================
            CLERK AUTH
        ==================================================== */}

        <div className="flex shrink-0 items-center">
          {/* Signed out */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="default"
                size="sm"
                className="
                  bg-[#2563EB]
                  hover:bg-blue-700
                  text-white
                  font-medium
                  shadow-sm
                "
                onClick={() =>
                  posthog.capture("sign_in_initiated")
                }
              >
                Sign In
              </Button>
            </SignInButton>
          </Show>

          {/* Signed in */}
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "w-9 h-9 border border-neutral-200 shadow-sm",
                },
              }}
            />
          </Show>
        </div>
      </div>

      {/* =====================================================
          MOBILE NAVIGATION DROPDOWN
      ====================================================== */}

      <AnimatePresence>
        {menuExpanded && (
          <MobileMenu onNavigate={closeMenu} />
        )}
      </AnimatePresence>
    </header>
  )
}