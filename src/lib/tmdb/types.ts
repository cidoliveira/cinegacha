import { z } from 'zod'

// ---------- Movie (from /discover/movie) ----------

export const tmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string(),
  popularity: z.number(),
  vote_average: z.number(),
  vote_count: z.number(),
  poster_path: z.string().nullable(),
  release_date: z.string(),
  genre_ids: z.array(z.number()),
  original_language: z.string(),
  adult: z.boolean(),
  overview: z.string(),
})

export type TmdbMovie = z.infer<typeof tmdbMovieSchema>

export const tmdbDiscoverMovieResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbMovieSchema),
  total_pages: z.number(),
  total_results: z.number(),
})

export type TmdbDiscoverMovieResponse = z.infer<typeof tmdbDiscoverMovieResponseSchema>

// ---------- Person (from /person/popular) ----------

export const tmdbPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  popularity: z.number(),
  profile_path: z.string().nullable(),
  known_for_department: z.string(),
})

export type TmdbPerson = z.infer<typeof tmdbPersonSchema>

export const tmdbPopularPeopleResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbPersonSchema),
  total_pages: z.number(),
  total_results: z.number(),
})

export type TmdbPopularPeopleResponse = z.infer<typeof tmdbPopularPeopleResponseSchema>

// ---------- Movie Credit (from /person/{id}/movie_credits) ----------

export const tmdbMovieCreditSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  popularity: z.number().default(0),
  character: z.string().optional(),
  job: z.string().optional(),
  department: z.string().optional(),
  release_date: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  genre_ids: z.array(z.number()).default([]),
})

export type TmdbMovieCredit = z.infer<typeof tmdbMovieCreditSchema>

export const tmdbPersonMovieCreditsResponseSchema = z.object({
  id: z.number(),
  cast: z.array(tmdbMovieCreditSchema),
  crew: z.array(tmdbMovieCreditSchema),
})

export type TmdbPersonMovieCreditsResponse = z.infer<typeof tmdbPersonMovieCreditsResponseSchema>

// ---------- Movie Credits (from /movie/{id}/credits) ----------

export const tmdbCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string().optional(),
  profile_path: z.string().nullable(),
  order: z.number().default(999),
  popularity: z.number().default(0),
  known_for_department: z.string().optional(),
})

export type TmdbCastMember = z.infer<typeof tmdbCastMemberSchema>

export const tmdbCrewMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
  department: z.string(),
  profile_path: z.string().nullable(),
  popularity: z.number().default(0),
  known_for_department: z.string().optional(),
})

export type TmdbCrewMember = z.infer<typeof tmdbCrewMemberSchema>

export const tmdbMovieCreditsResponseSchema = z.object({
  id: z.number(),
  cast: z.array(tmdbCastMemberSchema),
  crew: z.array(tmdbCrewMemberSchema),
})

export type TmdbMovieCreditsResponse = z.infer<typeof tmdbMovieCreditsResponseSchema>
