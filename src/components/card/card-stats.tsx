export function CardStats({ atk, def }: { atk: number; def: number }) {
  return (
    <div className="flex items-center gap-3 text-xs tabular-nums">
      <span className="text-text-secondary">
        <span className="text-text-muted">ATK</span> {atk}
      </span>
      <span className="text-text-secondary">
        <span className="text-text-muted">DEF</span> {def}
      </span>
    </div>
  )
}
