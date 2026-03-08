/**
 * Gacha route layout.
 *
 * Forces dynamic rendering to prevent build-time pre-rendering --
 * the gacha page requires a browser environment for Supabase anonymous auth.
 */
export const dynamic = "force-dynamic"

export default function GachaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
