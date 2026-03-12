"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { openPack, getPackStatus, refillPacksAd } from "@/app/actions/gacha"
import { PackStatusBar } from "@/components/gacha/pack-status-bar"
import { PackVisual } from "@/components/gacha/pack-visual"
import { CardRevealRow } from "@/components/gacha/card-reveal-row"
import { CardDetailModal } from "@/components/card/card-detail-modal"
import type { PulledCard } from "@/lib/gacha/types"
import { useRewardedAd } from "@/hooks/use-rewarded-ad"

type PackState = "idle" | "tearing" | "revealing" | "revealed"

/**
 * Main pack opening orchestrator.
 *
 * State machine: idle -> tearing -> revealing -> revealed -> idle
 *
 * On mount, fetches pack status. In idle, shows pack count + open button.
 * In tearing, PackVisual plays the tear animation while openPack() runs
 * concurrently in the background. After tear completes and server responds,
 * cards are revealed one by one via CardRevealRow with staggered animation.
 * In revealed, all cards are visible and clickable for detail modal.
 * Dismissing returns to idle for the next pack.
 */
export function PackOpener() {
  const [state, setState] = useState<PackState>("idle")
  const [packsAvailable, setPacksAvailable] = useState<number>(0)
  const [pityCounter, setPityCounter] = useState<number>(0)
  const [nextPackAt, setNextPackAt] = useState<string | null>(null)
  const [cards, setCards] = useState<PulledCard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<PulledCard | null>(null)
  const rewardedAd = useRewardedAd()

  // Store the openPack promise so tear animation and network run concurrently
  const openPackPromiseRef = useRef<ReturnType<typeof openPack> | null>(null)

  // Fetch initial pack status on mount
  useEffect(() => {
    async function fetchStatus() {
      const result = await getPackStatus()
      if ("data" in result) {
        setPacksAvailable(result.data.packs_available)
        setPityCounter(result.data.pity_counter)
        setNextPackAt(result.data.next_pack_at)
      }
      setIsLoading(false)
    }
    fetchStatus()
  }, [])

  // Callback for when a pack regenerates (timer reaches zero)
  const handlePackReady = useCallback(async () => {
    const result = await getPackStatus()
    if ("data" in result) {
      setPacksAvailable(result.data.packs_available)
      setPityCounter(result.data.pity_counter)
      setNextPackAt(result.data.next_pack_at)
    }
  }, [])

  // Start the pack opening sequence: fire server action and enter tearing state
  function handleOpenPack() {
    if (packsAvailable <= 0) return

    setError(null)
    // Fire openPack() immediately -- do NOT await, let it run during tear animation
    openPackPromiseRef.current = openPack()
    setState("tearing")
  }

  // Called when PackVisual finishes the tear animation
  async function handleTearComplete() {
    const promise = openPackPromiseRef.current
    if (!promise) {
      setError("Pack opening failed unexpectedly")
      setState("idle")
      return
    }

    // Await the stored promise (likely already resolved during ~0.5s tear)
    const result = await promise
    openPackPromiseRef.current = null

    if ("error" in result) {
      if (result.code === "NO_PACKS") {
        setPacksAvailable(0)
      }
      setError(result.error)
      setState("idle")
      return
    }

    setCards(result.data.cards)
    setPacksAvailable(result.data.packs_remaining)
    setPityCounter(result.data.pity_counter)
    setNextPackAt(result.data.next_pack_at)
    setState("revealing")
  }

  // Called when CardRevealRow finishes staggering all cards
  function handleRevealComplete() {
    setState("revealed")
  }

  // Dismiss the reveal and return to idle
  function handleDismiss() {
    setCards([])
    setSelectedCard(null)
    setState("idle")
  }

  // Watch ad to refill packs to 10
  async function handleWatchAd() {
    try {
      await rewardedAd.show()
      // Ad completed — call server to refill
      const result = await refillPacksAd()
      if ("data" in result) {
        setPacksAvailable(result.data.packs_available)
        setPityCounter(result.data.pity_counter)
        setNextPackAt(result.data.next_pack_at)
      } else {
        setError(result.error)
      }
    } catch {
      // Ad was dismissed or failed — do nothing
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="h-0.5 w-16 animate-pulse rounded bg-text-muted/30" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
      {/* Pack status bar -- hidden during card reveal states */}
      {state === "idle" && (
        <PackStatusBar
          packsAvailable={packsAvailable}
          pityCounter={pityCounter}
          nextPackAt={nextPackAt}
          onPackReady={handlePackReady}
        />
      )}

      <AnimatePresence mode="wait">
        {/* Idle state: open pack button */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center gap-6 py-12"
          >
            <button
              onClick={handleOpenPack}
              disabled={packsAvailable <= 0}
              className={`rounded border px-8 py-3 text-sm font-medium transition-colors ${
                packsAvailable > 0
                  ? "border-accent text-accent hover:bg-accent hover:text-text-primary cursor-pointer"
                  : "border-border text-text-muted cursor-not-allowed"
              }`}
            >
              Open pack
            </button>

            {packsAvailable <= 0 && (
              <button
                onClick={handleWatchAd}
                disabled={rewardedAd.isShowing || !rewardedAd.isLoaded}
                className="cursor-pointer border-b border-text-muted pb-0.5 text-sm text-text-secondary transition-colors hover:border-text-primary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rewardedAd.isShowing ? "Watching ad…" : "Watch ad for 10 packs"}
              </button>
            )}

            {error && (
              <p className="text-sm text-accent">{error}</p>
            )}
          </motion.div>
        )}

        {/* Tearing state: pack visual with tear animation */}
        {state === "tearing" && (
          <motion.div
            key="tearing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-1 flex-col items-center justify-center overflow-hidden py-4"
          >
            <PackVisual onTearComplete={handleTearComplete} />
          </motion.div>
        )}

        {/* Revealing + Revealed states: card reveal row */}
        {(state === "revealing" || state === "revealed") && (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="flex flex-1 flex-col items-center gap-8 py-8"
          >
            <CardRevealRow
              cards={cards}
              onCardClick={setSelectedCard}
              onRevealComplete={handleRevealComplete}
            />

            {state === "revealed" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={handleDismiss}
                  className="cursor-pointer border-b border-text-muted pb-0.5 text-sm text-text-secondary transition-colors hover:border-text-primary hover:text-text-primary"
                >
                  Continue
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card detail modal -- renders regardless of state */}
      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  )
}
