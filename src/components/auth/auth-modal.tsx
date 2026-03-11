"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Provider = "google" | "discord" | "github"

const VALID_PROVIDERS: Provider[] = ["google", "discord", "github"]

function isValidProvider(value: string | null): value is Provider {
  return VALID_PROVIDERS.includes(value as Provider)
}

// Inline SVG icons -- monochrome (currentColor), no brand colors per project convention
function GoogleIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.03.052a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
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
  google: { label: "Continue with Google", Icon: GoogleIcon },
  discord: { label: "Continue with Discord", Icon: DiscordIcon },
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
          <h2 className="font-display text-2xl tracking-wider text-accent">
            Sign In
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
