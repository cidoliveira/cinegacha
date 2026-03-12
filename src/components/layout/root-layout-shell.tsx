import { Header } from '@/components/ui/header'
import { Footer } from '@/components/ui/footer'

export function RootLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </>
  )
}
