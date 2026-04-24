"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Ensures an anonymous Supabase session exists before any gacha interaction.
 *
 * - Checks for existing session first (getSession reads from local cookie/storage)
 * - Only calls signInAnonymously() if no session exists (prevents duplicate users)
 * - Returns isReady=true once session is confirmed, and userId for the authenticated user
 * - On error, enters degraded mode (isReady=true, userId=null) so the UI can show
 *   an error when the user tries to open packs
 * - Subscribes to SIGNED_OUT events to automatically re-create an anonymous session
 *   after signOut() -- without this, useEffect only runs on mount and never recovers
 */
export function useGuestSession() {
  const [isReady, setIsReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function ensureSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setUserId(session.user.id)
        setIsReady(true)
        return
      }

      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error("Failed to create anonymous session:", error)
        setIsReady(true) // Degraded mode
        return
      }

      setUserId(data.session?.user.id ?? null)
      setIsReady(true)
    }

    ensureSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Session was destroyed (user signed out) -- create fresh anon session
        ensureSession()
      }
      if (session?.user) {
        setUserId(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { isReady, userId }
}
