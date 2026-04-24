import PQueue from 'p-queue'
import {
  tmdbDiscoverMovieResponseSchema,
  tmdbPopularPeopleResponseSchema,
  tmdbPersonMovieCreditsResponseSchema,
  tmdbMovieCreditsResponseSchema,
} from './types'
import type {
  TmdbDiscoverMovieResponse,
  TmdbPopularPeopleResponse,
  TmdbPersonMovieCreditsResponse,
  TmdbMovieCreditsResponse,
} from './types'
import {
  TMDB_IMAGE_BASE_URL,
  discoverMovies,
  discoverMoviesByGenre,
  movieCredits,
  popularPeople,
  personMovieCredits,
} from './endpoints'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const MAX_RETRIES = 3
const DEFAULT_RETRY_AFTER_MS = 2000

const queue = new PQueue({
  intervalCap: 35,
  interval: 1000,
  carryoverConcurrencyCount: true,
})

function getAccessToken(): string {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN
  if (!token) {
    throw new Error(
      'TMDB_API_READ_ACCESS_TOKEN is not set. ' + 'Add it to your environment variables.'
    )
  }
  return token
}

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export async function tmdbFetch<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean>,
  retries = 0
): Promise<T> {
  return queue.add(async () => {
    const url = buildUrl(path, params)
    const token = getAccessToken()

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (response.status === 429) {
      if (retries >= MAX_RETRIES) {
        throw new Error(`TMDB rate limit exceeded after ${MAX_RETRIES} retries`)
      }
      const retryAfter = response.headers.get('Retry-After')
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : DEFAULT_RETRY_AFTER_MS
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      return tmdbFetch<T>(path, params, retries + 1)
    }

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  }) as Promise<T>
}

export function tmdbImageUrl(path: string | null, size: string = 'w500'): string | null {
  if (path === null) return null
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

export async function fetchDiscoverMovies(page: number): Promise<TmdbDiscoverMovieResponse> {
  const endpoint = discoverMovies(page)
  const data = await tmdbFetch(endpoint.path, endpoint.params)
  return tmdbDiscoverMovieResponseSchema.parse(data)
}

export async function fetchPopularPeople(page: number): Promise<TmdbPopularPeopleResponse> {
  const endpoint = popularPeople(page)
  const data = await tmdbFetch(endpoint.path, endpoint.params)
  return tmdbPopularPeopleResponseSchema.parse(data)
}

export async function fetchPersonMovieCredits(
  personId: number
): Promise<TmdbPersonMovieCreditsResponse> {
  const endpoint = personMovieCredits(personId)
  const data = await tmdbFetch(endpoint.path, endpoint.params)
  return tmdbPersonMovieCreditsResponseSchema.parse(data)
}

export async function fetchDiscoverMoviesByGenre(
  genreId: number,
  page: number,
  options?: { releaseDateGte?: string; releaseDateLte?: string }
): Promise<TmdbDiscoverMovieResponse> {
  const endpoint = discoverMoviesByGenre(genreId, page, options)
  const data = await tmdbFetch(endpoint.path, endpoint.params)
  return tmdbDiscoverMovieResponseSchema.parse(data)
}

export async function fetchMovieCredits(movieId: number): Promise<TmdbMovieCreditsResponse> {
  const endpoint = movieCredits(movieId)
  const data = await tmdbFetch(endpoint.path, endpoint.params)
  return tmdbMovieCreditsResponseSchema.parse(data)
}
