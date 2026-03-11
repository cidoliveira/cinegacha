"use server"

import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Types (exported for consumption by collection UI components)
// ---------------------------------------------------------------------------

export type CollectionSortKey = "rarity" | "name" | "atk" | "def" | "date"
export type CardTypeFilter = "movie" | "actor" | "director"
export type RarityFilter = "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR"

export interface CollectionCard {
  card_id: string
  name: string
  card_type: "movie" | "actor" | "director"
  image_path: string | null
  rarity: "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR"
  atk: number
  def: number
  stars: number
  is_new: false
  obtained_at: string
}

export interface CollectionFilters {
  types: CardTypeFilter[]
  rarities: RarityFilter[]
  sort: CollectionSortKey
}

export interface AlbumWithProgress {
  id: string
  name: string
  genre_id: number | null
  card_ids: string[]
  collected_ids: string[]
  completion_pct: number
  is_completed: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// getCollectionPage
// ---------------------------------------------------------------------------

/**
 * Returns a paginated, filtered, sorted page of cards from the user's collection.
 *
 * Joins user_cards with card_pool using !inner modifier so PostgREST properly
 * filters on card_pool columns instead of returning parent rows with null children.
 */
export async function getCollectionPage(
  page: number,
  filters: CollectionFilters
): Promise<{ cards: CollectionCard[]; hasMore: boolean } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  // Query FROM card_pool with !inner join on user_cards so we can sort
  // directly on card_pool columns (referencedTable ordering is unreliable)
  let query = supabase
    .from("card_pool")
    .select(
      "id, name, card_type, image_path, rarity, atk, def, rarity_score, user_cards!inner(stars, obtained_at, user_id)"
    )
    .eq("user_cards.user_id", user.id)

  // Type filter
  if (filters.types.length > 0 && filters.types.length < 3) {
    query = query.in("card_type", filters.types)
  }

  // Rarity filter
  if (filters.rarities.length > 0 && filters.rarities.length < 7) {
    query = query.in("rarity", filters.rarities)
  }

  // Sort -- direct columns on card_pool, no referencedTable needed
  switch (filters.sort) {
    case "rarity":
      query = query.order("rarity_score", { ascending: false })
      break
    case "name":
      query = query.order("name", { ascending: true })
      break
    case "atk":
      query = query.order("atk", { ascending: false })
      break
    case "def":
      query = query.order("def", { ascending: false })
      break
    case "date":
      query = query.order("obtained_at", {
        referencedTable: "user_cards",
        ascending: false,
      })
      break
    default:
      query = query.order("rarity_score", { ascending: false })
  }

  // Pagination
  query = query.range(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE - 1
  )

  const { data, error } = await query

  if (error) {
    return { error: error.message }
  }

  // Flatten the join result
  const cards: CollectionCard[] = (data ?? []).map((row) => {
    const uc = row.user_cards as unknown as Array<{
      stars: number
      obtained_at: string
      user_id: string
    }>
    const userCard = Array.isArray(uc) ? uc[0] : (uc as unknown as { stars: number; obtained_at: string })

    return {
      card_id: row.id,
      name: row.name,
      card_type: row.card_type as "movie" | "actor" | "director",
      image_path: row.image_path,
      rarity: row.rarity as "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR",
      atk: row.atk,
      def: row.def,
      stars: userCard?.stars ?? 0,
      is_new: false as const,
      obtained_at: userCard?.obtained_at ?? "",
    }
  })

  return {
    cards,
    hasMore: cards.length === PAGE_SIZE,
  }
}

// ---------------------------------------------------------------------------
// getCollectionProgress
// ---------------------------------------------------------------------------

/**
 * Returns the user's collection progress: unique cards collected vs total pool,
 * with a breakdown by card type.
 */
export async function getCollectionProgress(): Promise<
  | { collected: number; total: number; byType: { movie: number; actor: number; director: number } }
  | { error: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  // Total pool size (count only, no rows fetched)
  const { count: totalCount, error: totalError } = await supabase
    .from("card_pool")
    .select("*", { count: "exact", head: true })

  if (totalError) {
    return { error: totalError.message }
  }

  // Collected count (count only, no rows fetched)
  const { count: collectedCount, error: collectedError } = await supabase
    .from("user_cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  if (collectedError) {
    return { error: collectedError.message }
  }

  // Type breakdown: fetch card_type for all user cards via !inner join
  const { data: typeRows, error: typeError } = await supabase
    .from("user_cards")
    .select("card_pool!inner(card_type)")
    .eq("user_id", user.id)

  if (typeError) {
    return { error: typeError.message }
  }

  const byType = { movie: 0, actor: 0, director: 0 }

  for (const row of typeRows ?? []) {
    const pool = row.card_pool as unknown as { card_type: "movie" | "actor" | "director" }
    if (pool?.card_type === "movie") byType.movie++
    else if (pool?.card_type === "actor") byType.actor++
    else if (pool?.card_type === "director") byType.director++
  }

  return {
    collected: collectedCount ?? 0,
    total: totalCount ?? 0,
    byType,
  }
}

// ---------------------------------------------------------------------------
// getAlbumsWithProgress
// ---------------------------------------------------------------------------

/**
 * Returns all albums with the authenticated user's per-album completion data.
 *
 * Fetches all albums + user's collected card IDs, then computes collected_ids
 * and completion_pct for each album client-side (max ~800 user card rows).
 */
export async function getAlbumsWithProgress(): Promise<
  AlbumWithProgress[] | { error: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  // Fetch all albums ordered alphabetically
  const { data: albums, error: albumsError } = await supabase
    .from("albums")
    .select("id, name, genre_id, card_ids")
    .order("name", { ascending: true })

  if (albumsError) {
    return { error: albumsError.message }
  }

  // Fetch all user card IDs
  const { data: userCards, error: userCardsError } = await supabase
    .from("user_cards")
    .select("card_id")
    .eq("user_id", user.id)

  if (userCardsError) {
    return { error: userCardsError.message }
  }

  const collectedSet = new Set((userCards ?? []).map((r) => r.card_id))

  // Map albums to AlbumWithProgress
  return (albums ?? []).map((album) => {
    const cardIds = album.card_ids ?? []
    const collectedIds = cardIds.filter((id) => collectedSet.has(id))
    const completionPct =
      cardIds.length > 0
        ? Math.round((collectedIds.length / cardIds.length) * 100)
        : 0

    return {
      id: album.id,
      name: album.name,
      genre_id: album.genre_id,
      card_ids: cardIds,
      collected_ids: collectedIds,
      completion_pct: completionPct,
      is_completed: collectedIds.length === cardIds.length && cardIds.length > 0,
    }
  })
}
