export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="font-display text-6xl tracking-wider text-accent sm:text-7xl lg:text-8xl">
        CineGacha
      </h1>
      <p className="mt-4 text-lg text-text-secondary">Open packs. Collect cinema.</p>

      <div className="mt-12 flex h-[200px] w-full max-w-[300px] items-center justify-center rounded-lg border border-border bg-surface-elevated">
        <p className="px-4 text-center text-sm text-text-muted">Pack opening coming soon</p>
      </div>
    </div>
  )
}
