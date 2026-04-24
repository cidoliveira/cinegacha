import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3">
        <Image src="/tmdb-logo.svg" width={60} height={24} alt="TMDB" className="opacity-70" />
        <p className="text-center text-xs text-text-muted">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  )
}
