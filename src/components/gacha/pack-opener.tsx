"use client"

import { useCallback, useEffect, useState } from "react"
import { openPack, getPackStatus } from "@/app/actions/gacha"
import { PackStatusBar } from "@/components/gacha/pack-status-bar"
import { CardResult } from "@/components/gacha/card-result"
import type { PulledCard } from "@/lib/gacha/types"

type PackState = "idle" | "opening" | "reveal"

/**
 * Main pack opening orchestrator.
 *
 * State machine: idle -> opening -> reveal -> idle
 *
 * On mount, fetches pack status. In idle, shows pack count + open button.
 * In opening, calls the openPack server action. In reveal, displays cards
 * until dismissed. Each pack must be dismissed before opening the next.
 */
export function PackOpener() {
  const [state, setState] = useState<PackState>("idle")
  const [packsAvailable, setPacksAvailable] = useState<number>(0)
  const [pityCounter, setPityCounter] = useState<number>(0)
  const [nextPackAt, setNextPackAt] = useState<string | null>(null)
  const [cards, setCards] = useState<PulledCard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  // Open a pack
  async function handleOpenPack() {
    if (packsAvailable <= 0) return

    setState("opening")
    setError(null)

    const result = await openPack()

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
    setState("reveal")
  }

  // Dismiss the reveal and return to idle
  function handleDismiss() {
    setCards([])
    setState("idle")
  }

  if (isLoading) {
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
      {/* Pack status bar -- always visible in idle */}
      {state !== "reveal" && (
        <PackStatusBar
          packsAvailable={packsAvailable}
          pityCounter={pityCounter}
          nextPackAt={nextPackAt}
          onPackReady={handlePackReady}
        />
      )}

      {/* Idle state: open pack button */}
      {state === "idle" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
          <button
            onClick={handleOpenPack}
            disabled={packsAvailable <= 0}
            className={`font-display rounded-lg px-12 py-4 text-2xl tracking-wider transition-colors sm:text-3xl ${
              packsAvailable > 0
                ? "bg-accent text-text-primary hover:bg-accent-hover cursor-pointer"
                : "bg-surface-elevated text-text-muted cursor-not-allowed"
            }`}
          >
            Open Pack
          </button>

          {packsAvailable <= 0 && (
            <p className="text-sm text-text-muted">
              Browse your collection while you wait
            </p>
          )}

          {error && (
            <p className="text-sm text-accent">{error}</p>
          )}
        </div>
      )}

      {/* Opening state: loading */}
      {state === "opening" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
          <button
            disabled
            className="font-display cursor-not-allowed rounded-lg bg-surface-elevated px-12 py-4 text-2xl tracking-wider text-text-muted sm:text-3xl"
          >
            Opening...
          </button>
        </div>
      )}

      {/* Reveal state: show cards */}
      {state === "reveal" && (
        <div className="flex flex-1 flex-col items-center gap-8 py-8">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((card) => (
              <CardResult key={card.card_id} card={card} />
            ))}
          </div>

          <button
            onClick={handleDismiss}
            className="font-display cursor-pointer rounded-lg border border-border bg-surface px-8 py-3 text-lg tracking-wider text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}
