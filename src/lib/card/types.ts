import type { PulledCard } from '@/lib/gacha/types'

/** Card data enriched for display in UI components */
export interface CardDisplayData extends PulledCard {
  /** DB star value: 0 (first pull) to 4 (5th pull) */
  stars: number
  /** Optional metadata loaded lazily for detail view */
  metadata?: CardMetadata
}

/** Union of all card metadata types, discriminated by card_type context */
export type CardMetadata = MovieMetadata | ActorMetadata | DirectorMetadata

/** TMDB movie metadata for detail view */
export interface MovieMetadata {
  genre_ids: number[]
  original_title: string
  release_date: string
  vote_average: number
  vote_count: number
  original_language: string
}

/** TMDB actor metadata for detail view */
export interface ActorMetadata {
  known_for_department: string
  credit_count: number
  avg_movie_vote: number
}

/** TMDB director metadata for detail view */
export interface DirectorMetadata {
  known_for_department: string
  credit_count: number
  avg_movie_vote: number
  career_consistency: number
}
