import { IRequest, Router } from 'itty-router/Router';
import { Env } from './worker';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { Database } from './database.types';
import { MovieStatus } from './MovieStatus';

export type RequestWrapper = {
  env: Env;
  supabaseClient: SupabaseClient<Database>;
  user: User | null;
} & IRequest;

const router = Router<RequestWrapper>();
// router.all('*', authenticate);

router.post('/api/v1/user', async (request) => {
  try {
    let json = (await request.json()) as any;
    await request.supabaseClient.from('profile').insert({ name: json.name });
  } catch {
    // do nothing
  }
});

router.get('/api/v1/movies/quiz', async (request) => {
  try {
    const movieDetailsList = await Promise.all(movies.map((movie) => fetchMovieDetails(request, movie)));
    console.log(movieDetailsList.filter((movie) => movie !== undefined)); // Filter out undefined values
    return movieDetailsList;
  } catch (error) {
    console.error('Error fetching movie details:', error);
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

  if (error) {
    throw new Error('Error fetching user profile');
  } else if (!data || data.length === 0) {
    throw new Error('User profile not found');
  }

  // Prepare an array of movie quizzes for batch insertion
  const movieQuizzes = quizSubmission.results.map((movieQuiz) => ({
    user_name: quizSubmission.name,
    title: movieQuiz.title,
    rating: movieQuiz.rating,
    imdbid: movieQuiz.imbdID, // Note: changed imbdID to imdbid to match the expected key
    status: movieQuiz.status as MovieStatus, // <- Here, cast it to MovieStatus
  }));

  const { data: insertedData, error: insertError } = await request.supabaseClient.from('user_movie').insert(movieQuizzes);

  if (insertError) {
    throw new Error('Error posting movie quiz, error: ' + insertError.message);
  }

  return;
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
