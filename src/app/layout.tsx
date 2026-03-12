import type { Metadata } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { RootLayoutShell } from '@/components/layout/root-layout-shell'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CineGacha',
  description: 'Collect cinema cards. Open packs. Build your collection.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background text-text-primary">
        <RootLayoutShell>{children}</RootLayoutShell>
      </body>
    </html>
  )
}
