"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Provider = "github"

const VALID_PROVIDERS: Provider[] = ["github"]

function isValidProvider(value: string | null): value is Provider {
  return VALID_PROVIDERS.includes(value as Provider)
}

function GitHubIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const PROVIDER_CONFIG = {
  github: { label: "Continue with GitHub", Icon: GitHubIcon },
} as const

/**
 * Auth modal for OAuth provider sign-in.
 *
 * - Uses native HTML <dialog> with showModal()/close() driven by open prop
 * - Attempts linkIdentity first (preserves anonymous user UUID -- no migration needed)
 * - Falls back to signInWithOAuth on synchronous linkIdentity error
 * - Stores anon_id cookie before redirect so callback can migrate collection
 * - Detects ?auth_error=true&provider=X on return and auto-retries via signInWithOAuth
 *   (handles linkIdentity conflict -- identity already linked to another account)
 */
export function AuthModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Open/close dialog based on open prop
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  // Detect linkIdentity conflict redirect: ?auth_error=true&provider=X
  useEffect(() => {
    const authError = searchParams.get("auth_error")
    const provider = searchParams.get("provider")

    if (authError === "true" && isValidProvider(provider)) {
      // Clean URL to prevent retry loop on refresh
      window.history.replaceState({}, "", "/")
      retrySignIn(provider)
    } else if (authError === "true") {
      // Generic auth error (exchange failure, etc.) -- continue anonymously
      console.warn("Auth error on return, no provider specified. Continuing anonymously.")
      window.history.replaceState({}, "", "/")
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  async function retrySignIn(provider: Provider) {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function handleProviderClick(provider: Provider) {
    setIsLoading(provider)
    const supabase = createClient()

    // Store anon_id before redirect -- needed by callback if linkIdentity fails
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user.is_anonymous) {
      document.cookie = `anon_id=${session.user.id}; path=/; max-age=300; SameSite=Lax`
    }

    // Try linkIdentity first: preserves anonymous user UUID, no migration needed
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    // If linkIdentity throws synchronously (rare), fall back to signInWithOAuth
    if (error) {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    }
  }

  function handleDialogClose() {
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      dialogRef.current?.close()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      className="m-auto max-w-sm rounded-xl border border-border bg-surface p-0 backdrop:bg-black/80"
    >
      <div className="relative p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/80 text-text-secondary backdrop-blur-sm transition-colors hover:bg-background hover:text-text-primary"
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <h2 className="font-display text-xl text-text-primary">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Save your collection across devices
          </p>
        </div>

        {/* Provider buttons */}
        <div className="flex flex-col gap-3">
          {PROVIDER_CONFIG && (Object.entries(PROVIDER_CONFIG) as [Provider, { label: string; Icon: React.ComponentType }][]).map(
            ([provider, { label, Icon }]) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleProviderClick(provider)}
                disabled={isLoading !== null}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-text-primary transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading === provider ? (
                  <span className="h-5 w-5 animate-pulse rounded-full bg-text-muted" />
                ) : (
                  <Icon />
                )}
                <span>{label}</span>
              </button>
            )
          )}
        </div>
      </div>
    </dialog>
  )
}
