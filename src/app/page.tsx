import Link from 'next/link'

export default function Home() {
  return (
    <div className="mx-auto flex flex-1 flex-col justify-center px-6 sm:max-w-xl sm:px-0">
      <h1 className="font-display text-4xl text-text-primary sm:text-5xl">CineGacha</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Collect cards from the history of cinema.
        <br />
        Open packs, discover rarities, build your collection.
      </p>

      <Link
        href="/gacha"
        className="mt-6 inline-flex w-fit items-center gap-2 border-b border-accent pb-0.5 text-sm text-accent transition-colors hover:text-accent-hover"
      >
        Open packs &rarr;
      </Link>
    </div>
  )
}
