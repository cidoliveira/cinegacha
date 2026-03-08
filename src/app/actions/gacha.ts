"use server"

import { createClient } from "@/lib/supabase/server"
import type { PackOpenResult, PackStatus } from "@/lib/gacha/types"

/**
 * Open a pack for the authenticated user.
 *
 * The user ID is extracted from the server-side session -- it is NEVER
 * accepted as a parameter. This prevents user ID spoofing.
 *
 * Calls the open_pack Postgres RPC which atomically handles pack regen,
 * weighted random card rolls, pity logic, and user_cards insertion.
 */
export async function openPack(): Promise<
  { data: PackOpenResult } | { error: string; code?: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase.rpc("open_pack", {
    p_user_id: user.id,
  })

  if (error) {
    if (error.message.includes("No packs available")) {
      return { error: "No packs available", code: "NO_PACKS" as const }
    }
    return { error: "Failed to open pack" }
  }

  return { data: data as unknown as PackOpenResult }
}

/**
 * Get the current pack status for the authenticated user.
 *
 * Returns packs available (with regen computed on-read), pity counter,
 * next pack timestamp, and total packs opened.
 */
export async function getPackStatus(): Promise<
  { data: PackStatus } | { error: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase.rpc("get_pack_status", {
    p_user_id: user.id,
  })

  if (error) {
    return { error: "Failed to get pack status" }
  }

  return { data: data as unknown as PackStatus }
}
