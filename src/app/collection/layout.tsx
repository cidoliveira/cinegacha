/**
 * Collection route layout.
 *
 * Forces dynamic rendering to prevent build-time pre-rendering --
 * the collection page requires a browser environment for Supabase anonymous auth.
 */
export const dynamic = "force-dynamic"

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
