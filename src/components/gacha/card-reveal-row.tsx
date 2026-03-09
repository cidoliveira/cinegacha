"use client"

import { useEffect } from "react"
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
 * Horizontal row of cards with staggered entrance animation.
 *
 * Cards appear one at a time in draw order (~0.3s gaps) with a
 * subtle scale+translate pop-up entrance. Each card is wrapped in
 * CardRevealSlot for rarity-appropriate glow effects.
 *
 * Signals completion via onRevealComplete after all cards finish animating.
 */
export function CardRevealRow({
  cards,
  onCardClick,
  onRevealComplete,
}: CardRevealRowProps) {
  useEffect(() => {
    if (!onRevealComplete || cards.length === 0) return

    // Total reveal time + 50ms buffer
    const duration = computeRevealDuration(cards.length) * 1000 + 50
    const timer = setTimeout(onRevealComplete, duration)
    return () => clearTimeout(timer)
  }, [cards.length, onRevealComplete])

  return (
    <motion.div
      className="flex flex-wrap justify-center gap-4"
      variants={rowVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card) => (
        <motion.div
          key={card.card_id}
          className="w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)]"
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
  )
}
