export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

type Endpoint = {
  path: string
  params?: Record<string, string | number | boolean>
}

export function discoverMovies(page: number): Endpoint {
  return {
    path: "/discover/movie",
    params: {
      sort_by: "popularity.desc",
      "vote_count.gte": 50,
      include_adult: false,
      page,
    },
  }
}

export function popularPeople(page: number): Endpoint {
  return {
    path: "/person/popular",
    params: { page },
  }
}

export function personMovieCredits(personId: number): Endpoint {
  return {
    path: `/person/${personId}/movie_credits`,
  }
}

export function discoverMoviesByGenre(
  genreId: number,
  page: number,
  options?: { releaseDateGte?: string; releaseDateLte?: string },
): Endpoint {
  const params: Record<string, string | number | boolean> = {
    sort_by: "popularity.desc",
    "vote_count.gte": 50,
    include_adult: false,
    without_genres: "99,10770,10402",
    with_genres: genreId,
    page,
  }

  if (options?.releaseDateGte) {
    params["primary_release_date.gte"] = options.releaseDateGte
  }
  if (options?.releaseDateLte) {
    params["primary_release_date.lte"] = options.releaseDateLte
  }

  return {
    path: "/discover/movie",
    params,
  }
}

export function movieCredits(movieId: number): Endpoint {
  return {
    path: `/movie/${movieId}/credits`,
  }
}
