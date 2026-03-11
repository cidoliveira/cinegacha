"use client"

import { useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"

export function UserMenu({
  user,
  onSignOut,
}: {
  user: User
  onSignOut: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Click-outside-to-close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [])

  const displayName =
    user.email ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "Account"

  const provider = user.app_metadata?.provider as string | undefined

  return (
    <div ref={wrapperRef} className="relative">
      {/* Toggle button -- user silhouette icon with green dot */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open user menu"
        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-elevated text-text-secondary transition-colors hover:text-text-primary"
      >
        {/* User silhouette SVG */}
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z"
            clipRule="evenodd"
          />
        </svg>
        {/* Green signed-in dot */}
        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-surface p-3 shadow-lg">
          {/* User identity */}
          <div className="px-2 py-1">
            <p className="truncate text-sm text-text-primary">{displayName}</p>
            {provider && (
              <p className="text-xs text-text-muted capitalize">{provider}</p>
            )}
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-border" />

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onSignOut()
            }}
            className="w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
