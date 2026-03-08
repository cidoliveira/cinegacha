/**
 * Card pool builder -- orchestrates the full TMDB-to-Supabase pipeline.
 *
 * Fetches movies and people from TMDB, computes rarity scores,
 * assigns tiers, calculates ATK/DEF stats, and upserts into card_pool.
 */
import {
  fetchDiscoverMovies,
  fetchPopularPeople,
  fetchPersonMovieCredits,
} from "@/lib/tmdb/client"
import type { TmdbMovie, TmdbPerson } from "@/lib/tmdb/types"
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

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchMovies(pages: number): Promise<TmdbMovie[]> {
  const movies: TmdbMovie[] = []

  for (let page = 1; page <= pages; page++) {
    console.log(`[seed] Fetching movies page ${page}/${pages}`)
    const response = await fetchDiscoverMovies(page)
    const filtered = response.results.filter(
      (m) => m.poster_path !== null && m.popularity >= 1.0
    )
    movies.push(...filtered)
  }

  console.log(`[seed] Fetched ${movies.length} movies after filtering`)
  return movies
}

async function fetchPeople(pages: number): Promise<{
  actors: TmdbPerson[]
  directors: TmdbPerson[]
}> {
  const actors: TmdbPerson[] = []
  const directors: TmdbPerson[] = []

  for (let page = 1; page <= pages; page++) {
    console.log(`[seed] Fetching people page ${page}/${pages}`)
    const response = await fetchPopularPeople(page)
    const filtered = response.results.filter(
      (p) => p.profile_path !== null && p.popularity >= 2.0
    )

    for (const person of filtered) {
      if (person.known_for_department === "Acting") {
        actors.push(person)
      } else if (person.known_for_department === "Directing") {
        directors.push(person)
      }
    }
  }

  console.log(`[seed] Found ${actors.length} actors, ${directors.length} directors`)
  return { actors, directors }
}

async function processActorCredits(
  actors: TmdbPerson[]
): Promise<ProcessedPerson[]> {
  const processed: ProcessedPerson[] = []

  for (let i = 0; i < actors.length; i++) {
    const person = actors[i]
    if (i % 25 === 0) {
      console.log(`[seed] Processing actor credits ${i + 1}/${actors.length}`)
    }
    const credits = await fetchPersonMovieCredits(person.id)
    const qualifying = credits.cast.filter((c) => c.vote_count >= 10)

    if (qualifying.length < 3) continue

    const avgMovieVote =
      qualifying.reduce((sum, c) => sum + c.vote_average, 0) / qualifying.length

    processed.push({
      person,
      avgMovieVote,
      movieCreditCount: credits.cast.length,
      careerConsistency: 0, // not used for actors
    })
  }

  console.log(`[seed] ${processed.length} actors with 3+ qualifying credits`)
  return processed
}

async function processDirectorCredits(
  directors: TmdbPerson[]
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

    if (qualifying.length < 3) continue

    const avgMovieVote =
      qualifying.reduce((sum, c) => sum + c.vote_average, 0) / qualifying.length
    const consistentCount = qualifying.filter(
      (c) => c.vote_average > 6.0
    ).length
    const careerConsistency = consistentCount / qualifying.length

    processed.push({
      person,
      avgMovieVote,
      movieCreditCount: directedCredits.length,
      careerConsistency,
    })
  }

  console.log(`[seed] ${processed.length} directors with 3+ qualifying credits`)
  return processed
}

// ---------------------------------------------------------------------------
// Card building
// ---------------------------------------------------------------------------

function buildMovieCards(
  movies: TmdbMovie[],
  tieredMovies: (RarityEntity & { rarity: RarityTier })[],
  moviePopRange: { min: number; max: number }
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
      moviePopRange.max
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
  peoplePopRange: { min: number; max: number }
): CardPoolInsert[] {
  const tierMap = new Map(tieredActors.map((t) => [t.id, t.rarity]))
  const actorMap = new Map(
    processedActors.map((a) => [makeCardId("actor", a.person.id), a])
  )

  return tieredActors.map((t) => {
    const actor = actorMap.get(t.id)!
    const rarity = tierMap.get(t.id)!
    const { baseAtk, baseDef } = computeActorStats(
      actor.person.popularity,
      actor.avgMovieVote,
      peoplePopRange.min,
      peoplePopRange.max
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
  _peoplePopRange: { min: number; max: number }
): CardPoolInsert[] {
  const tierMap = new Map(tieredDirectors.map((t) => [t.id, t.rarity]))
  const directorMap = new Map(
    processedDirectors.map((d) => [makeCardId("director", d.person.id), d])
  )

  return tieredDirectors.map((t) => {
    const director = directorMap.get(t.id)!
    const rarity = tierMap.get(t.id)!
    const { baseAtk, baseDef } = computeDirectorStats(
      director.avgMovieVote,
      director.careerConsistency
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
      `[seed] Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cards.length / BATCH_SIZE)} (${batch.length} cards)`
    )
    const { error } = await supabase
      .from("card_pool")
      .upsert(batch, { onConflict: "id" })

    if (error) {
      throw new Error(`Upsert failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
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

  // 1. Fetch movies
  const movies = await fetchMovies(50)

  // 2. Fetch people
  const { actors, directors } = await fetchPeople(25)

  // 3. Process credits
  const processedActors = await processActorCredits(actors)
  const processedDirectors = await processDirectorCredits(directors)

  // 4. Compute rarity scores
  const movieEntities: RarityEntity[] = movies.map((m) => ({
    id: makeCardId("movie", m.id),
    rarityScore: computeMovieRarityScore(m.popularity, m.vote_average),
  }))

  const actorEntities: RarityEntity[] = processedActors.map((a) => ({
    id: makeCardId("actor", a.person.id),
    rarityScore: computeActorRarityScore(
      a.person.popularity,
      a.avgMovieVote,
      a.movieCreditCount
    ),
  }))

  const directorEntities: RarityEntity[] = processedDirectors.map((d) => ({
    id: makeCardId("director", d.person.id),
    rarityScore: computeDirectorRarityScore(
      d.person.popularity,
      d.avgMovieVote,
      d.movieCreditCount
    ),
  }))

  // 5. Assign rarity tiers per card type
  console.log("[seed] Assigning rarity tiers...")
  const tieredMovies = assignRarityTiers(movieEntities)
  const tieredActors = assignRarityTiers(actorEntities)
  const tieredDirectors = assignRarityTiers(directorEntities)

  // 6. Compute stats
  const moviePopRange = minMax(movies.map((m) => m.popularity))
  const allPeoplePopularity = [
    ...processedActors.map((a) => a.person.popularity),
    ...processedDirectors.map((d) => d.person.popularity),
  ]
  const peoplePopRange = minMax(allPeoplePopularity)

  // 7. Build card records
  console.log("[seed] Building card records...")
  const movieCards = buildMovieCards(movies, tieredMovies, moviePopRange)
  const actorCards = buildActorCards(processedActors, tieredActors, peoplePopRange)
  const directorCards = buildDirectorCards(
    processedDirectors,
    tieredDirectors,
    peoplePopRange
  )

  const allCards = [...movieCards, ...actorCards, ...directorCards]

  // 8. Upsert into card_pool
  console.log(`[seed] Upserting ${allCards.length} cards into card_pool...`)
  await batchUpsert(allCards)

  // 9. Return summary
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

  // 1. Fetch trending movies (10 pages)
  const movies = await fetchMovies(10)

  // 2. Fetch popular people (5 pages)
  const { actors, directors } = await fetchPeople(5)

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
    (m) => !existingIds.has(makeCardId("movie", m.id))
  )
  const existingMovies = movies.filter((m) =>
    existingIds.has(makeCardId("movie", m.id))
  )
  const newActors = processedActors.filter(
    (a) => !existingIds.has(makeCardId("actor", a.person.id))
  )
  const existingActors = processedActors.filter((a) =>
    existingIds.has(makeCardId("actor", a.person.id))
  )
  const newDirectors = processedDirectors.filter(
    (d) => !existingIds.has(makeCardId("director", d.person.id))
  )
  const existingDirectors = processedDirectors.filter((d) =>
    existingIds.has(makeCardId("director", d.person.id))
  )

  console.log(
    `[refresh] New: ${newMovies.length} movies, ${newActors.length} actors, ${newDirectors.length} directors`
  )
  console.log(
    `[refresh] Existing: ${existingMovies.length} movies, ${existingActors.length} actors, ${existingDirectors.length} directors`
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
      a.movieCreditCount
    ),
  }))
  const newDirectorEntities: RarityEntity[] = newDirectors.map((d) => ({
    id: makeCardId("director", d.person.id),
    rarityScore: computeDirectorRarityScore(
      d.person.popularity,
      d.avgMovieVote,
      d.movieCreditCount
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
    peoplePopRange
  )
  const newDirectorCards = buildDirectorCards(
    newDirectors,
    tieredNewDirectors,
    peoplePopRange
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
      moviePopRange.max
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
      existing.rarity as RarityTier
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
        rarity_score: computeMovieRarityScore(movie.popularity, movie.vote_average),
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
      peoplePopRange.max
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
      existing.rarity as RarityTier
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
          actor.movieCreditCount
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
      director.careerConsistency
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
      existing.rarity as RarityTier
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
          director.movieCreditCount
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
