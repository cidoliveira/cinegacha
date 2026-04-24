'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Reactive auth state hook.
 *
 * - Uses getSession() (not getUser()) for initial state -- reads from local
 *   cookie/storage without a network call
 * - Subscribes to onAuthStateChange for reactive updates
 * - Calls router.refresh() on SIGNED_IN and SIGNED_OUT to rehydrate server components
 * - Derives isAnonymous and isAuthenticated convenience booleans
 */
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Get initial session from local cookie/storage (no network call)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  const isAnonymous = user?.is_anonymous ?? true
  const isAuthenticated = !!user && !user.is_anonymous

  return { user, loading, isAnonymous, isAuthenticated }
}
