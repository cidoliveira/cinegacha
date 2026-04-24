'use client'

import type { CardTypeFilter, RarityFilter, CollectionSortKey } from '@/app/actions/collection'
import { RARITY_TIERS } from '@/lib/rarity/tiers'

interface CollectionFilterBarProps {
  typeFilters: CardTypeFilter[]
  rarityFilters: RarityFilter[]
  sort: CollectionSortKey
  onTypeFiltersChange: (types: CardTypeFilter[]) => void
  onRarityFiltersChange: (rarities: RarityFilter[]) => void
  onSortChange: (sort: CollectionSortKey) => void
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]
}

const TYPE_OPTIONS: { value: CardTypeFilter; label: string; color: string }[] = [
  { value: 'movie', label: 'Movie', color: 'amber' },
  { value: 'actor', label: 'Actor', color: 'sky' },
  { value: 'director', label: 'Director', color: 'violet' },
]

const RARITY_OPTIONS: RarityFilter[] = ['C', 'UC', 'R', 'SR', 'SSR', 'UR', 'LR']

const SORT_OPTIONS: { value: CollectionSortKey; label: string }[] = [
  { value: 'rarity', label: 'Rarity' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'atk', label: 'ATK (highest)' },
  { value: 'def', label: 'DEF (highest)' },
  { value: 'date', label: 'Date (newest)' },
]

export function CollectionFilterBar({
  typeFilters,
  rarityFilters,
  sort,
  onTypeFiltersChange,
  onRarityFiltersChange,
  onSortChange,
}: CollectionFilterBarProps) {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filters -- text links */}
        {TYPE_OPTIONS.map(({ value, label, color }) => {
          const isActive = typeFilters.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => onTypeFiltersChange(toggleItem(typeFilters, value))}
              className={[
                'text-sm transition-colors cursor-pointer',
                isActive
                  ? color === 'amber'
                    ? 'text-amber-400'
                    : color === 'sky'
                      ? 'text-sky-400'
                      : 'text-violet-400'
                  : 'text-text-muted hover:text-text-secondary',
              ].join(' ')}
              style={
                isActive
                  ? { borderBottom: '1px solid currentColor', paddingBottom: '2px' }
                  : { paddingBottom: '3px' }
              }
            >
              {label}
            </button>
          )
        })}

        {/* Separator */}
        <div className="h-5 w-px bg-border" />

        {/* Rarity filters -- text links */}
        {RARITY_OPTIONS.map((rarity) => {
          const isActive = rarityFilters.includes(rarity)
          const rarityKey = rarity.toLowerCase()
          return (
            <button
              key={rarity}
              type="button"
              onClick={() => onRarityFiltersChange(toggleItem(rarityFilters, rarity))}
              className="text-xs font-medium tracking-wider transition-colors cursor-pointer"
              style={
                isActive
                  ? {
                      color: `var(--color-rarity-${rarityKey})`,
                      borderBottom: '1px solid currentColor',
                      paddingBottom: '2px',
                    }
                  : {
                      color: 'var(--color-text-muted)',
                      paddingBottom: '3px',
                    }
              }
            >
              {RARITY_TIERS[rarity].label === 'Common' ? 'C' : rarity}
            </button>
          )
        })}

        {/* Sort dropdown -- pushed right on larger screens */}
        <div className="ml-auto">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as CollectionSortKey)}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-1.5 font-body text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
