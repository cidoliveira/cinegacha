"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Sign out the currently authenticated user.
 *
 * The client-side useGuestSession hook listens to onAuthStateChange and will
 * automatically create a new anonymous session when it receives the SIGNED_OUT
 * event, so the user is never left without a session.
 */
export async function signOut(): Promise<{ success: true } | { error: string }> {
  // MUST await -- createClient() is async (awaits next/headers cookies())
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
