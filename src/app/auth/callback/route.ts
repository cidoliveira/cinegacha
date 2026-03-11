import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * OAuth callback route handler.
 *
 * This is the redirect URL registered with OAuth providers (Google, Discord,
 * GitHub). Supabase Auth redirects here with a PKCE `code` parameter after
 * the user approves the provider consent screen.
 *
 * Flow:
 *   1. Exchange the OAuth code for a Supabase session.
 *   2. Read the `anon_id` cookie (set by useGuestSession on first visit).
 *   3. If the anon_id differs from the new user ID, call migrate_anon_to_user
 *      to atomically transfer cards/packs/pity to the authenticated account.
 *   4. Delete the anon_id cookie (no longer needed).
 *   5. Redirect to the original destination (or / by default).
 *
 * Error handling:
 *   - Any failure redirects to /?auth_error=true
 *   - Provider name is forwarded when available so the client can offer a retry
 *     via signInWithOAuth without requiring the user to re-select a provider.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const next = searchParams.get("next") ?? "/"

  // Supabase may include the provider in the callback URL on certain error types
  // (e.g. linkIdentity conflicts). Forward it so the client can retry via
  // signInWithOAuth without the user needing to pick a provider again.
  const provider = searchParams.get("provider")

  // If the provider returned an error (e.g. user denied consent, or account
  // linking conflict), redirect to the home page with auth_error=true.
  if (error) {
    const errorUrl = new URL(`${origin}/`)
    errorUrl.searchParams.set("auth_error", "true")
    if (provider) {
      errorUrl.searchParams.set("provider", provider)
    }
    return NextResponse.redirect(errorUrl)
  }

  if (code) {
    // MUST await -- createClient() is async (awaits next/headers cookies())
    const supabase = await createClient()

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !data.session) {
      return NextResponse.redirect(`${origin}/?auth_error=true`)
    }

    const newUserId = data.session.user.id

    // Read the anonymous user ID set by useGuestSession on first visit.
    // Use request.cookies directly -- avoids the async cookies() call and
    // is available in route handlers without any extra imports.
    const anonId = request.cookies.get("anon_id")?.value

    // Build the redirect response first so we can attach cookie operations to it.
    const redirectUrl = `${origin}${next}`
    const response = NextResponse.redirect(redirectUrl)

    if (anonId && anonId !== newUserId) {
      // Migrate the anonymous user's collection to the authenticated account.
      // Errors are intentionally swallowed: a migration failure should not
      // block sign-in. The anon data may be partially transferred or lost,
      // but the user is now authenticated and can continue playing.
      await supabase.rpc("migrate_anon_to_user", {
        p_anon_id: anonId,
        p_user_id: newUserId,
      })

      // Remove the anon_id cookie from the response -- the session cookie
      // issued by exchangeCodeForSession now identifies the user.
      response.cookies.delete("anon_id")
    }

    return response
  }

  // No code and no error -- malformed callback URL.
  return NextResponse.redirect(`${origin}/?auth_error=true`)
}
