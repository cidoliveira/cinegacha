import PQueue from "p-queue"

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

/**
 * Separate queue for TMDB image CDN requests.
 * The CDN (image.tmdb.org) has different rate limits from the API (api.themoviedb.org),
 * so they must not share a queue.
 */
const imageQueue = new PQueue({
  intervalCap: 50,
  interval: 1000,
  carryoverConcurrencyCount: true,
})

export async function validateImageUrl(
  imagePath: string,
  size: string = "w185",
): Promise<boolean> {
  return imageQueue.add(
    async () => {
      try {
        const response = await fetch(
          `${TMDB_IMAGE_BASE}/${size}${imagePath}`,
          { method: "HEAD" },
        )
        return response.ok
      } catch {
        return false
      }
    },
  ) as Promise<boolean>
}

export async function filterValidImages<
  T extends { imagePath: string | null },
>(items: T[], size?: string): Promise<T[]> {
  console.log(`[validate] Validating ${items.length} images...`)

  const validFlags = await Promise.all(
    items.map(async (item) => {
      if (item.imagePath === null) return false
      return validateImageUrl(item.imagePath, size)
    }),
  )

  const valid = items.filter((_, i) => validFlags[i])
  console.log(`[validate] ${valid.length}/${items.length} images valid`)
  return valid
}
