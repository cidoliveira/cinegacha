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
