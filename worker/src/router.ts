import { IRequest, Router } from 'itty-router/Router';
import { Env } from './worker';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { Database } from './database.types';
import { MovieStatus } from './MovieStatus';
import { OpenAIClient } from './OpenAIClient';

export type RequestWrapper = {
  env: Env;
  supabaseClient: SupabaseClient<Database>;
  user: User | null;
} & IRequest;

const router = Router<RequestWrapper>();
// router.all('*', authenticate);

router.get('/api/v1/user', async (request) => {
    try {
        const { data, error } = await request.supabaseClient.from('profile').select('name');
    
        if (error) throw new Error(`Error fetching user profile: ${error.message}`);
        else if (!data || data.length === 0) throw new Error(`User profile not found: ${request.user?.email}`);
    
        return data;
    } catch (error) {
        throw new Error(`Error fetching user profile: ${error}`);
    }
});

router.post('/api/v1/user', async (request) => {
  try {
    let json = (await request.json()) as any;
    const { error } = await request.supabaseClient.from('profile').upsert({ name: json.name }, { ignoreDuplicates: true });

    if (error) throw new Error(`Error creating user: ${error}`);
  } catch (error) {
    throw new Error(`Error creating user: ${error}`);
  }
});

router.get('/api/v1/movies/quiz', async (request) => {
  try {
    const movieDetailsList = await Promise.all(movies.map((movie) => fetchMovieDetails(request, movie)));
    return movieDetailsList;
  } catch (error) {
    throw new Error(`Error fetching movie details: ${error}`);
  }
});

router.post('/api/v1/movies/quiz', async (request) => {
  interface MovieQuiz {
    title: string;
    rating: number;
    imbdID: string;
    status: string;
  }

  interface QuizSubmission {
    name: string;
    results: MovieQuiz[];
  }

  let jsonData = (await request.json()) as any;

  const quizSubmission: QuizSubmission = {
    name: jsonData.name,
    results: jsonData.results.map((result: any) => ({
      title: result.title,
      rating: result.rating,
      imbdID: result.imbdID,
      status: MovieStatus.Watched,
    })),
  };

  const { data, error } = await request.supabaseClient.from('profile').select('name').eq('name', quizSubmission.name).limit(1);

  if (error) throw new Error(`Error fetching user profile: ${error.message}`);
  else if (!data || data.length === 0) throw new Error(`User profile not found: ${quizSubmission.name}`);

  // Prepare an array of movie quizzes for batch insertion
  const movieQuizzes = quizSubmission.results.map((movieQuiz) => ({
    user_name: quizSubmission.name,
    title: movieQuiz.title,
    rating: movieQuiz.rating,
    imdbid: movieQuiz.imbdID, // Note: changed imbdID to imdbid to match the expected key
    status: movieQuiz.status as MovieStatus, // <- Here, cast it to MovieStatus
  }));

  const { data: insertedData, error: insertError } = await request.supabaseClient.from('user_movie').upsert(movieQuizzes, {
    onConflict: 'imdbid, user_name',
    ignoreDuplicates: false,
  });

  if (insertError) throw new Error(`Error inserting movie quizzes: ${insertError.message}`);

  return;
});

router.post('/api/v1/movies/recs', async (request) => {
  interface MovieRec {
    name1: string;
    name2: number;
  }

  let jsonData = (await request.json()) as any;
  const movieRec: MovieRec = {
    name1: jsonData.name1,
    name2: jsonData.name2,
  };

  // Ensure names exist
  const { data: name1, error: name1error } = await request.supabaseClient
    .from('profile')
    .select('name')
    .eq('name', movieRec.name1)
    .limit(1);

  if (name1error) throw new Error(`Error fetching user profile for ${movieRec.name1}, error: ${name1error.message}`);
  else if (!name1 || name1.length === 0) throw new Error(`User profile not found for ${movieRec.name1}`);

  const { data: name2, error: name2error } = await request.supabaseClient
    .from('profile')
    .select('name')
    .eq('name', movieRec.name2)
    .limit(1);

  if (name2error) throw new Error(`Error fetching user profile for ${movieRec.name2}, error: ${name2error.message}`);
  else if (!name2 || name2.length === 0) throw new Error(`User profile not found for ${movieRec.name2}`);

  // Get movies for name1
  const { data: name1Movies, error: name1MoviesError } = await request.supabaseClient
    .from('user_movie')
    .select('*')
    .eq('user_name', movieRec.name1);

  if (name1MoviesError) throw new Error(`Error fetching movies for ${movieRec.name1}, error: ${name1MoviesError.message}`);

  // Get movies for name2
  const { data: name2Movies, error: name2MoviesError } = await request.supabaseClient
    .from('user_movie')
    .select('*')
    .eq('user_name', movieRec.name2);

  if (name2MoviesError) throw new Error(`Error fetching movies for ${movieRec.name2}, error: ${name2MoviesError.message}`);

  const name1MoviesJson = {
    name: movieRec.name1,
    movies: name1Movies?.map(movie => ({
      title: movie.title,
      rating: movie.rating,
      status: movie.status
    }))
  };
  
  // Convert name2Movies to desired format
  const name2MoviesJson = {
    name: movieRec.name2,
    movies: name2Movies?.map(movie => ({
      title: movie.title,
      rating: movie.rating,
      status: movie.status
    }))
  };
  
  const combinedJson = {
    person1: name1MoviesJson,
    person2: name2MoviesJson
  };

  let client = new OpenAIClient(request);
  let movies = await client.createMovieRecommendation(combinedJson);

  const movieDetailsList : any = await Promise.all(movies.map((movie) => fetchMovieDetails(request, movie)));
  movieDetailsList[0]["rationale1"] = movies[0].rationale1;
  movieDetailsList[0]["rationale2"] = movies[0].rationale2;
  movieDetailsList[1]["rationale1"] = movies[1].rationale1;
  movieDetailsList[1]["rationale2"] = movies[1].rationale2;

  return movieDetailsList;
});

// router.get('/api/v1/courses/:id', async (request) => {
//     let course = new CourseManager();
//     let publicCourse = await course.getCourse(request);
//     return publicCourse;
//   });

export default router;

// async function authenticate(request: RequestWrapper, env: Env): Promise<void> {
//   let token = request.headers.get('Authorization')?.replace('Bearer ', '');
//   if (!token) throw new Error('No token provided');

//   await request.supabaseClient();

//   const userDao = new UserDao(request.supabaseClient);
//   request.user = await userDao.getUserByAuthHeader(token);
//   // Validate if the user is logged in
//   if (!request.user) throw new NotFoundError('User not found');
// }

async function fetchMovieDetails(request: RequestWrapper, movie: any) {
  try {
    const responseById = await fetch(`http://www.omdbapi.com/?i=${movie.imdbID}&apikey=${request.env.OPEN_MOVIE_DATABASE_API_KEY}`);
    if (responseById.ok) {
      return responseById.json();
    }
    throw new Error('Failed to fetch by IMDb ID');
  } catch (error) {
    console.error(`Error fetching movie details by IMDb ID for "${movie.title}":`, error);

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

const movies = [
  {
    title: 'Avengers: Endgame',
    genre: 'Action, Adventure, Sci-Fi',
    runtime: '181 min',
    imdbID: 'tt4154796',
  },
  {
    title: 'Mad Max: Fury Road',
    genre: 'Action, Adventure, Sci-Fi',
    runtime: '120 min',
    imdbID: 'tt1392190',
  },
  {
    title: 'Get Out',
    genre: 'Horror, Thriller',
    runtime: '104 min',
    imdbID: 'tt5052448',
  },
  {
    title: 'Coco',
    genre: 'Animation, Family, Fantasy',
    runtime: '105 min',
    imdbID: 'tt2380307',
  },
  {
    title: 'Inside Out',
    genre: 'Animation, Comedy, Family',
    runtime: '95 min',
    imdbID: 'tt2096673',
  },
  {
    title: 'Parasite',
    genre: 'Thriller, Drama',
    runtime: '132 min',
    imdbID: 'tt6751668',
  },
  {
    title: 'A Quiet Place',
    genre: 'Horror, Thriller',
    runtime: '90 min',
    imdbID: 'tt6644200',
  },
  {
    title: 'Black Panther',
    genre: 'Action, Adventure, Sci-Fi',
    runtime: '134 min',
    imdbID: 'tt1825683',
  },
  {
    title: 'La La Land',
    genre: 'Comedy, Drama, Music',
    runtime: '128 min',
    imdbID: 'tt3783958',
  },
  {
    title: 'The Revenant',
    genre: 'Adventure, Drama',
    runtime: '156 min',
    imdbID: 'tt1663202',
  },
  {
    title: 'Spider-Man: Into the Spider-Verse',
    genre: 'Animation, Action, Adventure',
    runtime: '117 min',
    imdbID: 'tt4633694',
  },
  {
    title: 'Dunkirk',
    genre: 'Action, Drama, History',
    runtime: '106 min',
    imdbID: 'tt5013056',
  },
  {
    title: 'Joker',
    genre: 'Crime, Drama, Thriller',
    runtime: '122 min',
    imdbID: 'tt7286456',
  },
  {
    title: 'The Shape of Water',
    genre: 'Adventure, Drama, Fantasy',
    runtime: '123 min',
    imdbID: 'tt5580390',
  },
  {
    title: 'Moana',
    genre: 'Animation, Adventure, Comedy',
    runtime: '107 min',
    imdbID: 'tt3521164',
  },
  {
    title: 'The Martian',
    genre: 'Adventure, Drama, Sci-Fi',
    runtime: '144 min',
    imdbID: 'tt3659388',
  },
  {
    title: 'Wonder Woman',
    genre: 'Action, Adventure, Fantasy',
    runtime: '141 min',
    imdbID: 'tt0451279',
  },
  {
    title: 'John Wick: Chapter 3 - Parabellum',
    genre: 'Action, Crime, Thriller',
    runtime: '130 min',
    imdbID: 'tt6146586',
  },
  {
    title: 'Baby Driver',
    genre: 'Action, Crime, Drama',
    runtime: '113 min',
    imdbID: 'tt3890160',
  },
  {
    title: 'Once Upon a Time in Hollywood',
    genre: 'Comedy, Drama',
    runtime: '161 min',
    imdbID: 'tt7131622',
  },
];
