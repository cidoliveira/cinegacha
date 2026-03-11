/**
 * Card pool builder -- orchestrates the full TMDB-to-Supabase pipeline.
 *
 * Fetches movies via genre-based discovery with era splitting,
 * extracts actors/directors from movie credits, validates all images,
 * computes rarity scores, assigns tiers, calculates ATK/DEF stats,
 * and upserts into card_pool.
 */
import {
  fetchDiscoverMoviesByGenre,
  fetchMovieCredits,
  fetchPopularPeople,
  fetchPersonMovieCredits,
} from "@/lib/tmdb/client"
import type {
  TmdbMovie,
  TmdbPerson,
  TmdbCastMember,
  TmdbCrewMember,
} from "@/lib/tmdb/types"
import {
  computeMovieRarityScore,
  computeActorRarityScore,
  computeDirectorRarityScore,
  assignRarityTiers,
} from "@/lib/rarity/calculator"
import type { RarityTier } from "@/lib/rarity/tiers"
import {
  computeMovieStats,
  computeActorStats,
  computeDirectorStats,
  applyRarityMultiplier,
} from "@/lib/card-pool/stats"
import { validateImageUrl } from "@/lib/card-pool/validator"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database.types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CardPoolInsert = Database["public"]["Tables"]["card_pool"]["Insert"]
type CardType = "movie" | "actor" | "director"

interface SeedResult {
  totalCards: number
  byType: Record<string, number>
  byRarity: Record<string, number>
}

interface RefreshResult {
  newCards: number
  updatedCards: number
  byType: Record<string, number>
  byRarity: Record<string, number>
}

interface ProcessedPerson {
  person: TmdbPerson
  avgMovieVote: number
  movieCreditCount: number
  careerConsistency: number
}

interface RarityEntity {
  id: string
  rarityScore: number
}

// ---------------------------------------------------------------------------
// Genre-based sourcing constants
// ---------------------------------------------------------------------------

const MOVIE_GENRES = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  sciFi: 878,
  thriller: 53,
  war: 10752,
  western: 37,
} as const

const GENRE_PAGE_COUNTS: Record<number, number> = {
  [MOVIE_GENRES.drama]: 20,
  [MOVIE_GENRES.comedy]: 15,
  [MOVIE_GENRES.action]: 15,
  [MOVIE_GENRES.thriller]: 12,
  [MOVIE_GENRES.horror]: 12,
  [MOVIE_GENRES.sciFi]: 12,
  [MOVIE_GENRES.crime]: 12,
  [MOVIE_GENRES.adventure]: 8,
  [MOVIE_GENRES.romance]: 8,
  [MOVIE_GENRES.animation]: 6,
  [MOVIE_GENRES.fantasy]: 8,
  [MOVIE_GENRES.mystery]: 8,
  [MOVIE_GENRES.history]: 5,
  [MOVIE_GENRES.war]: 5,
  [MOVIE_GENRES.western]: 5,
  [MOVIE_GENRES.family]: 5,
}

// Era ranges for temporal diversity (top 4 genres only)
const ERA_RANGES = [
  { gte: "1900-01-01", lte: "1969-12-31", label: "Classic" },
  { gte: "1970-01-01", lte: "1989-12-31", label: "70s-80s" },
  { gte: "1990-01-01", lte: "2009-12-31", label: "90s-2000s" },
  { gte: "2010-01-01", lte: "2025-12-31", label: "Modern" },
] as const

// Genres that get era-split queries (top 4 by page count)
const ERA_SPLIT_GENRES: Set<number> = new Set([
  MOVIE_GENRES.drama,
  MOVIE_GENRES.comedy,
  MOVIE_GENRES.action,
  MOVIE_GENRES.thriller,
])

const MAX_CAST_PER_MOVIE = 3
const MAX_ACTORS = 750
const MAX_DIRECTORS = 450

// Top 5 genres for refresh (simpler strategy)
const REFRESH_GENRES = [
  MOVIE_GENRES.drama,
  MOVIE_GENRES.comedy,
  MOVIE_GENRES.action,
  MOVIE_GENRES.thriller,
  MOVIE_GENRES.horror,
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCardId(cardType: CardType, tmdbId: number): string {
  return `${cardType}-${tmdbId}`
}

function minMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 }
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

function genreNameById(genreId: number): string {
  for (const [name, id] of Object.entries(MOVIE_GENRES)) {
    if (id === genreId) return name
  }
  return `genre-${genreId}`
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetch movies across all 17 genres with era splitting for top genres.
 * Deduplicates by TMDB movie ID since movies appear in multiple genres.
 */
async function fetchMoviesByGenre(): Promise<TmdbMovie[]> {
  const movieMap = new Map<number, TmdbMovie>()

  for (const [genreIdStr, pageCount] of Object.entries(GENRE_PAGE_COUNTS)) {
    const genreId = Number(genreIdStr)
    const genreName = genreNameById(genreId)
    const beforeCount = movieMap.size

    if (ERA_SPLIT_GENRES.has(genreId)) {
      // Era-split: 1 page per era for temporal diversity
      for (const era of ERA_RANGES) {
        console.log(
          `[seed] Genre ${genreName} (${era.label}): fetching 1 page`,
        )
        const response = await fetchDiscoverMoviesByGenre(genreId, 1, {
          releaseDateGte: era.gte,
          releaseDateLte: era.lte,
        })
        for (const movie of response.results) {
          if (movie.poster_path !== null && !movieMap.has(movie.id)) {
            movieMap.set(movie.id, movie)
          }
        }
      }
    } else {
      // Standard: fetch pageCount pages
      for (let page = 1; page <= pageCount; page++) {
        console.log(
          `[seed] Genre ${genreName}: fetching page ${page}/${pageCount}`,
        )
        const response = await fetchDiscoverMoviesByGenre(genreId, page)
        for (const movie of response.results) {
          if (movie.poster_path !== null && !movieMap.has(movie.id)) {
            movieMap.set(movie.id, movie)
          }
        }
      }
    }

    const newCount = movieMap.size - beforeCount
    console.log(
      `[seed] Genre ${genreName}: ${newCount} new movies (${movieMap.size} total)`,
    )
  }

  console.log(`[seed] ${movieMap.size} unique movies after deduplication`)
  return Array.from(movieMap.values())
}

/**
 * Extract actors and directors from movie credits.
 * Much richer than popular-people endpoint since it finds people
 * who actually appear in the movies in our pool.
 */
async function extractPeopleFromMovies(movieIds: number[]): Promise<{
  actors: TmdbPerson[]
  directors: TmdbPerson[]
}> {
  const actorsMap = new Map<number, TmdbPerson>()
  const directorsMap = new Map<number, TmdbPerson>()

  for (let i = 0; i < movieIds.length; i++) {
    if (i % 50 === 0) {
      console.log(`[seed] Processing credits ${i + 1}/${movieIds.length}`)
    }

    const credits = await fetchMovieCredits(movieIds[i])

    // Extract top N cast members (sorted by order ascending)
    const topCast = credits.cast
      .filter((c: TmdbCastMember) => c.profile_path !== null)
      .sort((a: TmdbCastMember, b: TmdbCastMember) => a.order - b.order)
      .slice(0, MAX_CAST_PER_MOVIE)

    for (const member of topCast) {
      if (!actorsMap.has(member.id)) {
        actorsMap.set(member.id, {
          id: member.id,
          name: member.name,
          profile_path: member.profile_path,
          popularity: member.popularity,
          known_for_department:
            member.known_for_department ?? "Acting",
        })
      }
    }

    // Extract directors
    const directors = credits.crew.filter(
      (c: TmdbCrewMember) =>
        c.job === "Director" && c.profile_path !== null,
    )

    for (const member of directors) {
      if (!directorsMap.has(member.id)) {
        directorsMap.set(member.id, {
          id: member.id,
          name: member.name,
          profile_path: member.profile_path,
          popularity: member.popularity,
          known_for_department:
            member.known_for_department ?? "Directing",
        })
      }
    }
  }

  console.log(
    `[seed] Extracted ${actorsMap.size} unique actors, ${directorsMap.size} unique directors from movie credits`,
  )

  return {
    actors: Array.from(actorsMap.values()),
    directors: Array.from(directorsMap.values()),
  }
}

/**
 * Supplement people from popular-people endpoint if credit extraction
 * yielded too few results.
 */
async function supplementPeople(
  actorsMap: Map<number, TmdbPerson>,
  directorsMap: Map<number, TmdbPerson>,
  minActors: number,
  minDirectors: number,
): Promise<void> {
  if (actorsMap.size >= minActors && directorsMap.size >= minDirectors) {
    return
  }

  console.log(
    `[seed] Supplementing people (actors: ${actorsMap.size}/${minActors}, directors: ${directorsMap.size}/${minDirectors})`,
  )

  const pages = 10
  for (let page = 1; page <= pages; page++) {
    console.log(`[seed] Fetching popular people page ${page}/${pages}`)
    const response = await fetchPopularPeople(page)

    for (const person of response.results) {
      if (person.profile_path === null) continue

      if (
        person.known_for_department === "Acting" &&
        !actorsMap.has(person.id)
      ) {
        actorsMap.set(person.id, person)
      } else if (
        person.known_for_department === "Directing" &&
        !directorsMap.has(person.id)
      ) {
        directorsMap.set(person.id, person)
      }
    }
  }

  console.log(
    `[seed] After supplement: ${actorsMap.size} actors, ${directorsMap.size} directors`,
  )
}

const ANIMATION_GENRE_ID = 16
const TOP_N_CREDITS_FOR_AVG = 10

async function processActorCredits(
  actors: TmdbPerson[],
): Promise<ProcessedPerson[]> {
  const processed: ProcessedPerson[] = []
  let skippedAnimation = 0

  for (let i = 0; i < actors.length; i++) {
    const person = actors[i]
    if (i % 25 === 0) {
      console.log(`[seed] Processing actor credits ${i + 1}/${actors.length}`)
    }
    const credits = await fetchPersonMovieCredits(person.id)
    const qualifying = credits.cast.filter((c) => c.vote_count >= 10)

    if (qualifying.length < 3) continue

    // Skip animation-dominant actors (>50% of credits are animation genre)
    const animationCount = qualifying.filter((c) =>
      c.genre_ids.includes(ANIMATION_GENRE_ID),
    ).length
    if (animationCount / qualifying.length > 0.5) {
      skippedAnimation++
      continue
    }

    // Use top 10 best-rated credits for average (rewards quality peaks)
    const topCredits = [...qualifying]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, TOP_N_CREDITS_FOR_AVG)
    const avgMovieVote =
      topCredits.reduce((sum, c) => sum + c.vote_average, 0) / topCredits.length

    processed.push({
      person,
      avgMovieVote,
      movieCreditCount: credits.cast.length,
      careerConsistency: 0, // not used for actors
    })
  }

  console.log(
    `[seed] ${processed.length} actors with 3+ qualifying credits (${skippedAnimation} animation-dominant skipped)`,
  )
  return processed
}

async function processDirectorCredits(
  directors: TmdbPerson[],
): Promise<ProcessedPerson[]> {
  const processed: ProcessedPerson[] = []

  for (let i = 0; i < directors.length; i++) {
    const person = directors[i]
    if (i % 10 === 0) {
      console.log(`[seed] Processing director credits ${i + 1}/${directors.length}`)
    }
    const credits = await fetchPersonMovieCredits(person.id)
    const directedCredits = credits.crew.filter((c) => c.job === "Director")
    const qualifying = directedCredits.filter((c) => c.vote_count >= 10)

    if (qualifying.length < 5) continue

    // Use top 10 best-rated directed credits for average
    const topCredits = [...qualifying]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, TOP_N_CREDITS_FOR_AVG)
    const avgMovieVote =
      topCredits.reduce((sum, c) => sum + c.vote_average, 0) / topCredits.length
    const consistentCount = qualifying.filter(
      (c) => c.vote_average > 6.0,
    ).length
    const careerConsistency = consistentCount / qualifying.length

    processed.push({
      person,
      avgMovieVote,
      movieCreditCount: directedCredits.length,
      careerConsistency,
    })
  }

  console.log(`[seed] ${processed.length} directors with 5+ qualifying credits`)
  return processed
}

// ---------------------------------------------------------------------------
// Image validation
// ---------------------------------------------------------------------------

/**
 * Validate images for a list of items with a given path key and size.
 * Returns only items whose images returned HTTP 200 on HEAD request.
 */
async function validateImages<T>(
  items: T[],
  getPath: (item: T) => string | null,
  size: string,
  label: string,
): Promise<T[]> {
  console.log(`[seed] Validating ${items.length} ${label} images...`)

  const results = await Promise.all(
    items.map(async (item) => {
      const path = getPath(item)
      if (!path) return false
      return validateImageUrl(path, size)
    }),
  )

  const valid = items.filter((_, i) => results[i])
  console.log(
    `[seed] ${label} images: ${valid.length}/${items.length} valid`,
  )
  return valid
}

// ---------------------------------------------------------------------------
// Card building
// ---------------------------------------------------------------------------

function buildMovieCards(
  movies: TmdbMovie[],
  tieredMovies: (RarityEntity & { rarity: RarityTier })[],
  moviePopRange: { min: number; max: number },
): CardPoolInsert[] {
  const tierMap = new Map(tieredMovies.map((t) => [t.id, t.rarity]))
  const movieMap = new Map(movies.map((m) => [makeCardId("movie", m.id), m]))

  return tieredMovies.map((t) => {
    const movie = movieMap.get(t.id)!
    const rarity = tierMap.get(t.id)!
    const { baseAtk, baseDef } = computeMovieStats(
      movie.popularity,
      movie.vote_average,
      moviePopRange.min,
      moviePopRange.max,
    )
    const { atk, def } = applyRarityMultiplier(baseAtk, baseDef, rarity)

    return {
      id: t.id,
      tmdb_id: movie.id,
      card_type: "movie" as const,
      name: movie.title,
      image_path: movie.poster_path,
      rarity,
      atk,
      def,
      rarity_score: t.rarityScore,
      popularity_snapshot: movie.popularity,
      metadata: {
        genre_ids: movie.genre_ids,
        original_title: movie.original_title,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        original_language: movie.original_language,
      },
    }
  })
}

function buildActorCards(
  processedActors: ProcessedPerson[],
  tieredActors: (RarityEntity & { rarity: RarityTier })[],
  peoplePopRange: { min: number; max: number },
): CardPoolInsert[] {
  const tierMap = new Map(tieredActors.map((t) => [t.id, t.rarity]))
  const actorMap = new Map(
    processedActors.map((a) => [makeCardId("actor", a.person.id), a]),
  )

  return tieredActors.map((t) => {
    const actor = actorMap.get(t.id)!
    const rarity = tierMap.get(t.id)!
    const { baseAtk, baseDef } = computeActorStats(
      actor.person.popularity,
      actor.avgMovieVote,
      peoplePopRange.min,
      peoplePopRange.max,
    )
    const { atk, def } = applyRarityMultiplier(baseAtk, baseDef, rarity)

    return {
      id: t.id,
      tmdb_id: actor.person.id,
      card_type: "actor" as const,
      name: actor.person.name,
      image_path: actor.person.profile_path,
      rarity,
      atk,
      def,
      rarity_score: t.rarityScore,
      popularity_snapshot: actor.person.popularity,
      metadata: {
        known_for_department: actor.person.known_for_department,
        credit_count: actor.movieCreditCount,
        avg_movie_vote: actor.avgMovieVote,
      },
    }
  })
}

function buildDirectorCards(
  processedDirectors: ProcessedPerson[],
  tieredDirectors: (RarityEntity & { rarity: RarityTier })[],
  _peoplePopRange: { min: number; max: number },
): CardPoolInsert[] {
  const tierMap = new Map(tieredDirectors.map((t) => [t.id, t.rarity]))
  const directorMap = new Map(
    processedDirectors.map((d) => [makeCardId("director", d.person.id), d]),
  )

  return tieredDirectors.map((t) => {
    const director = directorMap.get(t.id)!
    const rarity = tierMap.get(t.id)!
    const { baseAtk, baseDef } = computeDirectorStats(
      director.avgMovieVote,
      director.careerConsistency,
    )
    const { atk, def } = applyRarityMultiplier(baseAtk, baseDef, rarity)

    return {
      id: t.id,
      tmdb_id: director.person.id,
      card_type: "director" as const,
      name: director.person.name,
      image_path: director.person.profile_path,
      rarity,
      atk,
      def,
      rarity_score: t.rarityScore,
      popularity_snapshot: director.person.popularity,
      metadata: {
        known_for_department: director.person.known_for_department,
        credit_count: director.movieCreditCount,
        avg_movie_vote: director.avgMovieVote,
        career_consistency: director.careerConsistency,
      },
    }
  })
}

// ---------------------------------------------------------------------------
// Batch upsert
// ---------------------------------------------------------------------------

async function batchUpsert(cards: CardPoolInsert[]): Promise<void> {
  const supabase = createAdminClient()
  const BATCH_SIZE = 100

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE)
    console.log(
      `[seed] Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cards.length / BATCH_SIZE)} (${batch.length} cards)`,
    )
    const { error } = await supabase
      .from("card_pool")
      .upsert(batch, { onConflict: "id" })

    if (error) {
      throw new Error(
        `Upsert failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

function countByType(cards: CardPoolInsert[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const card of cards) {
    counts[card.card_type] = (counts[card.card_type] || 0) + 1
  }
  return counts
}

function countByRarity(cards: CardPoolInsert[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const card of cards) {
    counts[card.rarity] = (counts[card.rarity] || 0) + 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// seedCardPool
// ---------------------------------------------------------------------------

export async function seedCardPool(): Promise<SeedResult> {
  console.log("[seed] Starting card pool seed...")

  // 1. Clear existing data (user_cards first due to FK constraint, then card_pool)
  const supabase = createAdminClient()
  console.log("[seed] Clearing existing user_cards...")
  const { error: userCardsError } = await supabase
    .from("user_cards")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (userCardsError) {
    throw new Error(`Failed to clear user_cards: ${userCardsError.message}`)
  }

  console.log("[seed] Clearing existing card pool...")
  const { error: deleteError } = await supabase
    .from("card_pool")
    .delete()
    .neq("id", "")

  if (deleteError) {
    throw new Error(`Failed to clear card pool: ${deleteError.message}`)
  }
  console.log("[seed] Cleared existing card pool")

  // 2. Fetch movies by genre (genre-based discover with era splits)
  const movies = await fetchMoviesByGenre()

  // 3. Extract people from movie credits
  const movieIds = movies.map((m) => m.id)
  const { actors: rawActors, directors: rawDirectors } =
    await extractPeopleFromMovies(movieIds)

  // Supplement if people count is low
  const actorsMap = new Map(rawActors.map((a) => [a.id, a]))
  const directorsMap = new Map(rawDirectors.map((d) => [d.id, d]))
  await supplementPeople(actorsMap, directorsMap, 150, 50)

  // Cap people by popularity to balance type distribution (~60% movie, ~25% actor, ~15% director)
  let actors = Array.from(actorsMap.values())
  if (actors.length > MAX_ACTORS) {
    actors.sort((a, b) => b.popularity - a.popularity)
    actors = actors.slice(0, MAX_ACTORS)
    console.log(`[seed] Capped actors to ${MAX_ACTORS} (by popularity)`)
  }
  let directors = Array.from(directorsMap.values())
  if (directors.length > MAX_DIRECTORS) {
    directors.sort((a, b) => b.popularity - a.popularity)
    directors = directors.slice(0, MAX_DIRECTORS)
    console.log(`[seed] Capped directors to ${MAX_DIRECTORS} (by popularity)`)
  }

  // 4. Validate images for all candidates
  const validMovies = await validateImages(
    movies,
    (m) => m.poster_path,
    "w500",
    "movie",
  )
  const validActors = await validateImages(
    actors,
    (a) => a.profile_path,
    "w185",
    "actor",
  )
  const validDirectors = await validateImages(
    directors,
    (d) => d.profile_path,
    "w185",
    "director",
  )

  console.log(
    `[seed] After image validation: ${validMovies.length} movies, ${validActors.length} actors, ${validDirectors.length} directors`,
  )

  // 5. Process credits for validated people
  const processedActors = await processActorCredits(validActors)
  const processedDirectors = await processDirectorCredits(validDirectors)

  // 6. Compute rarity scores
  const movieEntities: RarityEntity[] = validMovies.map((m) => ({
    id: makeCardId("movie", m.id),
    rarityScore: computeMovieRarityScore(m.popularity, m.vote_average),
  }))

  const actorEntities: RarityEntity[] = processedActors.map((a) => ({
    id: makeCardId("actor", a.person.id),
    rarityScore: computeActorRarityScore(
      a.person.popularity,
      a.avgMovieVote,
      a.movieCreditCount,
    ),
  }))

  const directorEntities: RarityEntity[] = processedDirectors.map((d) => ({
    id: makeCardId("director", d.person.id),
    rarityScore: computeDirectorRarityScore(
      d.person.popularity,
      d.avgMovieVote,
      d.movieCreditCount,
    ),
  }))

  // 7. Assign rarity tiers per card type
  console.log("[seed] Assigning rarity tiers...")
  const tieredMovies = assignRarityTiers(movieEntities)
  const tieredActors = assignRarityTiers(actorEntities)
  const tieredDirectors = assignRarityTiers(directorEntities)

  // 8. Compute stats
  const moviePopRange = minMax(validMovies.map((m) => m.popularity))
  const allPeoplePopularity = [
    ...processedActors.map((a) => a.person.popularity),
    ...processedDirectors.map((d) => d.person.popularity),
  ]
  const peoplePopRange = minMax(allPeoplePopularity)

  // 9. Build card records
  console.log("[seed] Building card records...")
  const movieCards = buildMovieCards(validMovies, tieredMovies, moviePopRange)
  const actorCards = buildActorCards(
    processedActors,
    tieredActors,
    peoplePopRange,
  )
  const directorCards = buildDirectorCards(
    processedDirectors,
    tieredDirectors,
    peoplePopRange,
  )

  const allCards = [...movieCards, ...actorCards, ...directorCards]

  // 10. Upsert into card_pool
  console.log(`[seed] Upserting ${allCards.length} cards into card_pool...`)
  await batchUpsert(allCards)

  // 11. Return summary
  const summary: SeedResult = {
    totalCards: allCards.length,
    byType: countByType(allCards),
    byRarity: countByRarity(allCards),
  }

  console.log("[seed] Seed complete!", JSON.stringify(summary, null, 2))
  return summary
}

// ---------------------------------------------------------------------------
// refreshCardPool
// ---------------------------------------------------------------------------

export async function refreshCardPool(): Promise<RefreshResult> {
  console.log("[refresh] Starting card pool refresh...")

  // 1. Fetch movies from top 5 genres (2 pages each, no era splitting)
  const movieMap = new Map<number, TmdbMovie>()
  for (const genreId of REFRESH_GENRES) {
    const genreName = genreNameById(genreId)
    for (let page = 1; page <= 2; page++) {
      console.log(
        `[refresh] Genre ${genreName}: fetching page ${page}/2`,
      )
      const response = await fetchDiscoverMoviesByGenre(genreId, page)
      for (const movie of response.results) {
        if (movie.poster_path !== null && !movieMap.has(movie.id)) {
          movieMap.set(movie.id, movie)
        }
      }
    }
  }
  const movies = Array.from(movieMap.values())
  console.log(`[refresh] ${movies.length} unique movies after deduplication`)

  // 2. Extract people from these movies' credits
  const movieIds = movies.map((m) => m.id)
  const { actors, directors } = await extractPeopleFromMovies(movieIds)

  // 3. Process credits
  const processedActors = await processActorCredits(actors)
  const processedDirectors = await processDirectorCredits(directors)

  // 4. Query existing card IDs
  const supabase = createAdminClient()
  console.log("[refresh] Querying existing card pool IDs...")
  const { data: existingRows, error: fetchError } = await supabase
    .from("card_pool")
    .select("id")

  if (fetchError) {
    throw new Error(`Failed to query card pool: ${fetchError.message}`)
  }

  const existingIds = new Set((existingRows ?? []).map((r) => r.id))
  console.log(`[refresh] Found ${existingIds.size} existing cards`)

  // 5. Separate new vs existing
  const newMovies = movies.filter(
    (m) => !existingIds.has(makeCardId("movie", m.id)),
  )
  const existingMovies = movies.filter((m) =>
    existingIds.has(makeCardId("movie", m.id)),
  )
  const newActors = processedActors.filter(
    (a) => !existingIds.has(makeCardId("actor", a.person.id)),
  )
  const existingActors = processedActors.filter((a) =>
    existingIds.has(makeCardId("actor", a.person.id)),
  )
  const newDirectors = processedDirectors.filter(
    (d) => !existingIds.has(makeCardId("director", d.person.id)),
  )
  const existingDirectors = processedDirectors.filter((d) =>
    existingIds.has(makeCardId("director", d.person.id)),
  )

  console.log(
    `[refresh] New: ${newMovies.length} movies, ${newActors.length} actors, ${newDirectors.length} directors`,
  )
  console.log(
    `[refresh] Existing: ${existingMovies.length} movies, ${existingActors.length} actors, ${existingDirectors.length} directors`,
  )

  // 6. Process NEW entities: compute rarity, assign tiers, compute stats, insert
  const newMovieEntities: RarityEntity[] = newMovies.map((m) => ({
    id: makeCardId("movie", m.id),
    rarityScore: computeMovieRarityScore(m.popularity, m.vote_average),
  }))
  const newActorEntities: RarityEntity[] = newActors.map((a) => ({
    id: makeCardId("actor", a.person.id),
    rarityScore: computeActorRarityScore(
      a.person.popularity,
      a.avgMovieVote,
      a.movieCreditCount,
    ),
  }))
  const newDirectorEntities: RarityEntity[] = newDirectors.map((d) => ({
    id: makeCardId("director", d.person.id),
    rarityScore: computeDirectorRarityScore(
      d.person.popularity,
      d.avgMovieVote,
      d.movieCreditCount,
    ),
  }))

  const tieredNewMovies =
    newMovieEntities.length > 0 ? assignRarityTiers(newMovieEntities) : []
  const tieredNewActors =
    newActorEntities.length > 0 ? assignRarityTiers(newActorEntities) : []
  const tieredNewDirectors =
    newDirectorEntities.length > 0
      ? assignRarityTiers(newDirectorEntities)
      : []

  // Pool-wide pop ranges include both new and existing for stat normalization
  const allMoviePopularity = movies.map((m) => m.popularity)
  const moviePopRange = minMax(allMoviePopularity)
  const allPeoplePopularity = [
    ...processedActors.map((a) => a.person.popularity),
    ...processedDirectors.map((d) => d.person.popularity),
  ]
  const peoplePopRange = minMax(allPeoplePopularity)

  const newMovieCards = buildMovieCards(newMovies, tieredNewMovies, moviePopRange)
  const newActorCards = buildActorCards(
    newActors,
    tieredNewActors,
    peoplePopRange,
  )
  const newDirectorCards = buildDirectorCards(
    newDirectors,
    tieredNewDirectors,
    peoplePopRange,
  )

  const allNewCards = [...newMovieCards, ...newActorCards, ...newDirectorCards]

  if (allNewCards.length > 0) {
    console.log(`[refresh] Inserting ${allNewCards.length} new cards...`)
    const BATCH_SIZE = 100
    for (let i = 0; i < allNewCards.length; i += BATCH_SIZE) {
      const batch = allNewCards.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from("card_pool").insert(batch)
      if (error) {
        throw new Error(`Insert new cards failed: ${error.message}`)
      }
    }
  }

  // 7. Process EXISTING entities: recompute stats only, do NOT change rarity
  let updatedCount = 0
  const now = new Date().toISOString()

  // Update existing movies
  for (const movie of existingMovies) {
    const { baseAtk, baseDef } = computeMovieStats(
      movie.popularity,
      movie.vote_average,
      moviePopRange.min,
      moviePopRange.max,
    )
    // We need the existing card's rarity to apply multiplier
    const cardId = makeCardId("movie", movie.id)
    const { data: existing } = await supabase
      .from("card_pool")
      .select("rarity")
      .eq("id", cardId)
      .single()

    if (!existing) continue

    const { atk, def } = applyRarityMultiplier(
      baseAtk,
      baseDef,
      existing.rarity as RarityTier,
    )

    const { error } = await supabase
      .from("card_pool")
      .update({
        name: movie.title,
        image_path: movie.poster_path,
        atk,
        def,
        metadata: {
          genre_ids: movie.genre_ids,
          original_title: movie.original_title,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          original_language: movie.original_language,
        },
        rarity_score: computeMovieRarityScore(
          movie.popularity,
          movie.vote_average,
        ),
        popularity_snapshot: movie.popularity,
        pool_updated_at: now,
      })
      .eq("id", cardId)

    if (!error) updatedCount++
  }

  // Update existing actors
  for (const actor of existingActors) {
    const { baseAtk, baseDef } = computeActorStats(
      actor.person.popularity,
      actor.avgMovieVote,
      peoplePopRange.min,
      peoplePopRange.max,
    )
    const cardId = makeCardId("actor", actor.person.id)
    const { data: existing } = await supabase
      .from("card_pool")
      .select("rarity")
      .eq("id", cardId)
      .single()

    if (!existing) continue

    const { atk, def } = applyRarityMultiplier(
      baseAtk,
      baseDef,
      existing.rarity as RarityTier,
    )

    const { error } = await supabase
      .from("card_pool")
      .update({
        name: actor.person.name,
        image_path: actor.person.profile_path,
        atk,
        def,
        metadata: {
          known_for_department: actor.person.known_for_department,
          credit_count: actor.movieCreditCount,
          avg_movie_vote: actor.avgMovieVote,
        },
        rarity_score: computeActorRarityScore(
          actor.person.popularity,
          actor.avgMovieVote,
          actor.movieCreditCount,
        ),
        popularity_snapshot: actor.person.popularity,
        pool_updated_at: now,
      })
      .eq("id", cardId)

    if (!error) updatedCount++
  }

  // Update existing directors
  for (const director of existingDirectors) {
    const { baseAtk, baseDef } = computeDirectorStats(
      director.avgMovieVote,
      director.careerConsistency,
    )
    const cardId = makeCardId("director", director.person.id)
    const { data: existing } = await supabase
      .from("card_pool")
      .select("rarity")
      .eq("id", cardId)
      .single()

    if (!existing) continue

    const { atk, def } = applyRarityMultiplier(
      baseAtk,
      baseDef,
      existing.rarity as RarityTier,
    )

    const { error } = await supabase
      .from("card_pool")
      .update({
        name: director.person.name,
        image_path: director.person.profile_path,
        atk,
        def,
        metadata: {
          known_for_department: director.person.known_for_department,
          credit_count: director.movieCreditCount,
          avg_movie_vote: director.avgMovieVote,
          career_consistency: director.careerConsistency,
        },
        rarity_score: computeDirectorRarityScore(
          director.person.popularity,
          director.avgMovieVote,
          director.movieCreditCount,
        ),
        popularity_snapshot: director.person.popularity,
        pool_updated_at: now,
      })
      .eq("id", cardId)

    if (!error) updatedCount++
  }

  console.log(`[refresh] Updated ${updatedCount} existing cards`)

  // 8. Return summary
  const summary: RefreshResult = {
    newCards: allNewCards.length,
    updatedCards: updatedCount,
    byType: countByType(allNewCards),
    byRarity: countByRarity(allNewCards),
  }

  console.log("[refresh] Refresh complete!", JSON.stringify(summary, null, 2))
  return summary
}
