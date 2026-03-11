"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useAuthState } from "@/hooks/use-auth-state"
import { AuthModal } from "@/components/auth/auth-modal"
import { UserMenu } from "@/components/auth/user-menu"
import { createClient } from "@/lib/supabase/client"

const navLinks = [
  { label: "Packs", href: "/gacha" },
  { label: "Collection", href: "/collection" },
]

export function Header() {
  const { user, loading, isAnonymous, isAuthenticated } = useAuthState()
  const [showAuthModal, setShowAuthModal] = useState(false)

  async function handleSignOut() {
    // Sign out on the client so onAuthStateChange fires SIGNED_OUT,
    // which triggers useGuestSession to create a fresh anonymous session.
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <header className="border-b border-border px-4 py-3">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="font-display text-2xl uppercase tracking-wider text-accent">
          CineGacha
        </Link>
        <div className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}

          {/* Auth UI -- invisible 32x32 placeholder during loading to prevent layout shift */}
          {loading ? (
            <div className="h-8 w-8" aria-hidden="true" />
          ) : isAuthenticated && user ? (
            <UserMenu user={user} onSignOut={handleSignOut} />
          ) : isAnonymous ? (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="cursor-pointer text-sm text-accent transition-colors hover:text-accent-muted"
            >
              Sign In
            </button>
          ) : null}
        </div>
      </nav>

      {/* Auth modal -- Suspense required because AuthModal uses useSearchParams */}
      <Suspense fallback={null}>
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </Suspense>
    </header>
  )
}
