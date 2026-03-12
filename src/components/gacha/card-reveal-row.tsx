"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import type { PulledCard } from "@/lib/gacha/types"
import { GachaCard } from "@/components/card/gacha-card"
import { CardRevealSlot } from "@/components/gacha/card-reveal-slot"

interface CardRevealRowProps {
  cards: PulledCard[]
  onCardClick?: (card: PulledCard) => void
  onRevealComplete?: () => void
}

/**
 * Parent variants: stagger children with 0.3s gaps.
 * delayChildren adds a brief pause after the pack tears away.
 */
const rowVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.15,
    },
  },
}

/**
 * Child variants: subtle "pop up" entrance.
 * Starts slightly scaled down and offset below, then snaps into place.
 */
const cardVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
}

/** Total animation duration: delayChildren + (count - 1) * stagger + card duration */
function computeRevealDuration(cardCount: number): number {
  const delay = 0.15
  const stagger = 0.3
  const cardDuration = 0.3
  return delay + (cardCount - 1) * stagger + cardDuration
}

/**
 * Stagger offset in ms for a specific card index.
 * Matches the Motion stagger timing so the pulse fires when the LR card appears.
 */
function computeCardAppearDelay(cardIndex: number): number {
  const delayMs = 150 // delayChildren 0.15s
  const staggerMs = 300 // staggerChildren 0.3s
  return delayMs + cardIndex * staggerMs
}

/**
 * Horizontal row of cards with staggered entrance animation.
 *
 * Cards appear one at a time in draw order (~0.3s gaps) with a
 * subtle scale+translate pop-up entrance. Each card is wrapped in
 * CardRevealSlot for rarity-appropriate glow and foil effects.
 *
 * If any card is LR rarity, a brief white screen pulse fires when
 * that card enters the reveal sequence.
 *
 * Signals completion via onRevealComplete after all cards finish animating.
 */
export function CardRevealRow({
  cards,
  onCardClick,
  onRevealComplete,
}: CardRevealRowProps) {
  const hasLR = cards.some((c) => c.rarity === "LR")
  const [showPulse, setShowPulse] = useState(false)
  const pulseFiredRef = useRef(false)

  // Fire onRevealComplete after all cards finish animating
  useEffect(() => {
    if (!onRevealComplete || cards.length === 0) return

    // Total reveal time + 50ms buffer
    const duration = computeRevealDuration(cards.length) * 1000 + 50
    const timer = setTimeout(onRevealComplete, duration)
    return () => clearTimeout(timer)
  }, [cards.length, onRevealComplete])

  // Fire LR screen pulse timed to when the LR card appears, once only
  useEffect(() => {
    if (!hasLR || pulseFiredRef.current) return

    const lrIndex = cards.findIndex((c) => c.rarity === "LR")
    if (lrIndex === -1) return

    pulseFiredRef.current = true
    const delay = computeCardAppearDelay(lrIndex)

    const timer = setTimeout(() => {
      setShowPulse(true)
      // Remove from DOM after animation completes (0.4s + small buffer)
      setTimeout(() => setShowPulse(false), 500)
    }, delay)

    return () => clearTimeout(timer)
  }, [hasLR, cards])

  return (
    <>
      {/* LR screen pulse -- full-viewport white flash */}
      {showPulse && (
        <div
          aria-hidden="true"
          className="animate-screen-pulse"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "white",
            pointerEvents: "none",
          }}
        />
      )}

      <motion.div
        className="flex flex-wrap justify-center gap-5"
        variants={rowVariants}
        initial="hidden"
        animate="visible"
      >
        {cards.map((card) => (
          <motion.div
            key={card.card_id}
            className="w-[calc(50%-10px)] sm:w-[calc(33.333%-14px)] lg:w-[calc(20%-16px)] lg:min-w-[180px]"
            variants={cardVariants}
          >
            <CardRevealSlot card={card}>
              <GachaCard
                card={card}
                size="md"
                onClick={
                  onCardClick ? () => onCardClick(card) : undefined
                }
              />
            </CardRevealSlot>
          </motion.div>
        ))}
      </motion.div>
    </>
  )
}
