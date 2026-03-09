"use client"

import { MotionConfig } from "motion/react"
import { useGuestSession } from "@/hooks/use-guest-session"
import { PackOpener } from "@/components/gacha/pack-opener"

/**
 * Gacha page route.
 *
 * Ensures an anonymous session exists before rendering the pack opener.
 * Zero signup friction -- a first-time visitor opens their first pack
 * within seconds of landing.
 */
export default function GachaPage() {
  const { isReady } = useGuestSession()

  if (!isReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <h1 className="font-display text-4xl tracking-wider text-accent sm:text-5xl">
          CineGacha
        </h1>
        <div className="mt-6 h-0.5 w-16 animate-pulse rounded bg-accent-muted" />
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <PackOpener />
    </MotionConfig>
  )
}
