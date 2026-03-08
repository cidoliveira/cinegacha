import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="font-display text-6xl tracking-wider text-accent sm:text-7xl lg:text-8xl">
        CineGacha
      </h1>
      <p className="mt-4 text-lg text-text-secondary">
        Open packs. Collect cinema.
      </p>

      <Link
        href="/gacha"
        className="mt-12 font-display rounded-lg bg-accent px-10 py-4 text-2xl tracking-wider text-text-primary transition-colors hover:bg-accent-hover"
      >
        Open Packs
      </Link>
    </div>
  )
}
