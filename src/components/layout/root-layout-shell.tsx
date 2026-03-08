import { Header } from '@/components/ui/header'
import { Footer } from '@/components/ui/footer'

export function RootLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
