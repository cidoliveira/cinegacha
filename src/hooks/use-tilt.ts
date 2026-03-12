"use client"

import { useCallback } from "react"

/**
 * Bridges pointer events to CSS custom properties for foil position tracking.
 *
 * Sets on the element:
 *   --tilt-x   rotateX degrees (inverted Y) -- used by .foil-card CSS class
 *   --tilt-y   rotateY degrees -- used by .foil-card CSS class
 *   --foil-x   0-100 percentage for radial gradient horizontal position
 *   --foil-y   0-100 percentage for radial gradient vertical position
 *
 * Does NOT use requestAnimationFrame -- CSS custom properties only trigger
 * compositing, not layout or paint, so direct setting is fast enough.
 */
export function useTilt(ref: React.RefObject<HTMLDivElement | null>) {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width // 0 to 1
      const y = (e.clientY - rect.top) / rect.height // 0 to 1

      // Normalized -1 to 1
      const nx = x * 2 - 1
      const ny = y * 2 - 1

      // Tilt: max 12 degrees, rotateX inverts Y (pointer at top tilts card back)
      const tiltX = -ny * 12
      const tiltY = nx * 12

      el.style.setProperty("--tilt-x", String(tiltX))
      el.style.setProperty("--tilt-y", String(tiltY))
      el.style.setProperty("--foil-x", String(Math.round(x * 100)))
      el.style.setProperty("--foil-y", String(Math.round(y * 100)))
    },
    [ref],
  )

  const handlePointerLeave = useCallback(() => {
    const el = ref.current
    if (!el) return

    el.style.setProperty("--tilt-x", "0")
    el.style.setProperty("--tilt-y", "0")
    el.style.setProperty("--foil-x", "50")
    el.style.setProperty("--foil-y", "50")
  }, [ref])

  return { handlePointerMove, handlePointerLeave }
}
