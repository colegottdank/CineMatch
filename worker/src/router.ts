import { IRequest, Router } from 'itty-router/Router';
import { Env } from './worker';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { Database } from './database.types';
import { MovieStatus } from './MovieStatus';
import { OpenAIClient } from './OpenAIClient';
import { movies } from './MoviesList';

export type RequestWrapper = {
  env: Env;
  supabaseClient: SupabaseClient<Database>;
  user: User | null;
} & IRequest;

const router = Router<RequestWrapper>();
// router.all('*', authenticate);

router.get('/api/v1/user', async (request) => {
  try {
    const { data, error } = await request.supabaseClient.from('profile').select('*');

    if (error) throw new Error(`Error fetching user profile: ${error.message}`);
    else if (!data || data.length === 0) return [];

    return data;
  } catch (error) {
    throw new Error(`Error fetching user profile: ${error}`);
  }
});

router.post('/api/v1/user', async (request) => {
  try {
    let json = (await request.json()) as any;
    const { error } = await request.supabaseClient.from('profile').upsert(
      { name: json.name, lowercase_name: json.name.toLowerCase() },
      {
        onConflict: 'lowercase_name',
        ignoreDuplicates: true,
      }
    );

    if (error) throw new Error(`Error creating user: ${error.message}`);
  } catch (error) {
    throw new Error(`Error creating user: ${error}`);
  }
});

router.get('/api/v1/movies/ratings/:name', async (request) => {
  try {
    const { name } = request.params;
    const { data, error } = await request.supabaseClient.from('profile').select('*').eq('lowercase_name', name.toLowerCase()).limit(1);

    if (error) throw new Error(`Error fetching user profile: ${error.message}`);
    else if (!data || data.length === 0) return [];

    const { data: userRatings, error: ratingsError } = await request.supabaseClient
      .from('user_movie')
      .select('*')
      .eq('user_id', data[0].id);

    if (ratingsError) throw new Error(`Error fetching user movie ratings: ${ratingsError.message}`);
    else if (!userRatings || userRatings.length === 0) return [];

    return userRatings;
  } catch (error) {
    throw new Error(`Error fetching user movie ratings: ${error}`);
  }
});

router.get('/api/v1/movies/quiz', async (request) => {
  try {
    return movies;
  } catch (error) {
    throw new Error(`Error fetching movie details: ${error}`);
  }
});

interface MovieQuiz {
  title: string;
  rating: number;
  imdbID: string; // corrected typo here, imbdID -> imdbID
  status: MovieStatus;
}

interface QuizSubmission {
  name: string;
  results: MovieQuiz[];
}

interface IncomingData {
  name: string;
  results: Array<{
    title: string;
    rating: number;
    imdbID: string;
    status: MovieStatus;
  }>;
}

router.post('/api/v1/movies', async (request) => {
  const jsonData = (await request.json()) as IncomingData;

  const quizSubmission: QuizSubmission = {
    name: jsonData.name,
    results: jsonData.results.map((result) => ({
      title: result.title,
      rating: result.rating,
      imdbID: result.imdbID,
      status: result.status,
    })),
  };

  const userProfile = await getUserProfile(request.supabaseClient, quizSubmission.name);

  const movieQuizzes = quizSubmission.results.map((movieQuiz) => ({
    user_id: userProfile.id,
    title: movieQuiz.title,
    rating: movieQuiz.rating,
    imdbid: movieQuiz.imdbID,
    status: movieQuiz.status,
  }));

  const { data, error } = await request.supabaseClient.from('user_movie').upsert(movieQuizzes, {
    onConflict: 'imdbid, user_id',
    ignoreDuplicates: false,
  });

  if (error) throw new Error(`Error inserting movie quizzes: ${error.message}`);
});

router.post('/api/v1/movies/recs', async (request) => {
  interface MovieRec {
    name: string;
    movies: any[];
  }

  const jsonData = (await request.json()) as any;

  const profiles: any[] = [];
  for (const nameObj of jsonData) {
    const name = nameObj.name;
    profiles.push(await getUserProfile(request.supabaseClient, name));
  }

  const tabularData = [];

  for (const profile of profiles) {
    // Get movies for current profile
    const { data: movies, error: moviesError } = await request.supabaseClient.from('user_movie').select('*').eq('user_id', profile.id);

    if (moviesError) throw new Error(`Error fetching movies for ${profile.name}, error: ${moviesError.message}`);

    // Adding person's name as a section header
    tabularData.push(`\nName: ${profile.name}`);
    // Adding column headers for the movies
    tabularData.push('Title, Rating, Status');

    // Adding movies for this person
    for (const movie of movies) {
      const row = `"${movie.title}", ${movie.rating}, ${movie.status}`;
      tabularData.push(row);
    }

    // Adding an empty line to separate sections
    tabularData.push('');
  }

  const csvString = tabularData.join('\n');

  let client = new OpenAIClient(request);
  let movies = await client.createMovieRecommendation(csvString);

  const movieDetailsList: any = await Promise.all(movies.map((movie) => fetchMovieDetails(request, movie)));
  for (let i = 0; i < movieDetailsList.length; i++) {
    movieDetailsList[i]['Rationales'] = [];

    // Assuming that movies[i] has a property `rationales` which is an array of rationales
    for (let j = 0; j < movies[i].rationales.length; j++) {
      movieDetailsList[i]['Rationales'].push(movies[i].rationales[j]);
    }
  }

  return movieDetailsList;
});

export default router;

async function fetchMovieDetails(request: RequestWrapper, movie: any) {
  try {
    const responseById = await fetch(`http://www.omdbapi.com/?i=${movie.imdbID}&apikey=${request.env.OPEN_MOVIE_DATABASE_API_KEY}`);
    if (responseById.ok) {
      return responseById.json();
    }
    throw new Error('Failed to fetch by IMDb ID');
  } catch (error) {
    console.error(`Error fetching movie details by IMDb ID for "${movie.title}":`, error);
    //await sleep(100);

    try {
      const responseByTitle = await fetch(
        `http://www.omdbapi.com/?t=${encodeURIComponent(movie.title)}&apikey=${request.env.OPEN_MOVIE_DATABASE_API_KEY}`
      );
      if (responseByTitle.ok) {
        return responseByTitle.json();
      }
      throw new Error('Failed to fetch by title');
    } catch (error) {
      console.error(`Error fetching movie details by title for "${movie.title}":`, error);
    }
  }
}

async function getUserProfile(client: any, name: string) {
  const { data, error } = await client.from('profile').select('*').eq('lowercase_name', name.toLowerCase()).limit(1);

  if (error) throw new Error(`Error fetching user profile: ${error.message}`);
  if (!data || data.length === 0) throw new Error(`User profile not found: ${name}`);

  return data[0];
}
