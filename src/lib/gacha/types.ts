/**
 * TypeScript types for gacha RPC response shapes.
 *
 * These interfaces match the JSONB output of the open_pack and get_pack_status
 * Postgres RPC functions. They are trust contracts -- the RPC is
 * server-authoritative, so we trust its output shape.
 */

/** A single card pulled from a pack */
export interface PulledCard {
  card_id: string
  name: string
  card_type: "movie" | "actor" | "director"
  image_path: string | null
  rarity: "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR"
  atk: number
  def: number
  is_new: boolean
  stars: number
}

/** Result returned by the open_pack RPC function */
export interface PackOpenResult {
  cards: PulledCard[]
  packs_remaining: number
  pity_counter: number
  next_pack_at: string | null // ISO timestamp or null if at max packs
}

/** Result returned by the get_pack_status RPC function */
export interface PackStatus {
  packs_available: number
  pity_counter: number
  pity_threshold: number
  next_pack_at: string | null
  total_packs_opened: number
}
