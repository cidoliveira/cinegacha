"use server"

import { createClient } from "@/lib/supabase/server"
import type { CardDisplayData, CardMetadata } from "@/lib/card/types"

/**
 * Fetch full card detail for a card owned by the authenticated user.
 *
 * Queries user_cards joined with card_pool to get all card data including
 * stars, metadata, and obtained_at. The user ID is extracted from the
 * server-side session -- never accepted as a parameter.
 */
export async function getCardDetail(
  cardId: string
): Promise<{ data: CardDisplayData } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("user_cards")
    .select(
      "stars, obtained_at, card_pool(id, name, card_type, image_path, rarity, atk, def, metadata)"
    )
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .single()

  if (error || !data) {
    return { error: "Card not found" }
  }

  // Flatten the join: card_pool fields become top-level
  const pool = data.card_pool as unknown as {
    id: string
    name: string
    card_type: "movie" | "actor" | "director"
    image_path: string | null
    rarity: "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR"
    atk: number
    def: number
    metadata: CardMetadata | null
  }

  if (!pool) {
    return { error: "Card pool data missing" }
  }

  const cardDetail: CardDisplayData = {
    card_id: pool.id,
    name: pool.name,
    card_type: pool.card_type,
    image_path: pool.image_path,
    rarity: pool.rarity,
    atk: pool.atk,
    def: pool.def,
    is_new: false,
    stars: data.stars,
    metadata: pool.metadata ?? undefined,
  }

  return { data: cardDetail }
}
