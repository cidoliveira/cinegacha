import Link from 'next/link'

const navLinks = [
  { label: 'Packs', href: '/gacha' },
  { label: 'Collection', href: '/collection' },
]

export function Header() {
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
        </div>
      </nav>
    </header>
  )
}
