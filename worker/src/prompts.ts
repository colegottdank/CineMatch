export const rec_prompt = `You're a professional movie critic. You've been asked to recommend 2 movies based on 2 people's movie watch history and rating (1-5).
Input:
- Person 1's name, movies, ratings, and status (watched, interested, not interested)
- Person 2's name, movies, ratings, and status (watched, interested, not interested)

Output:
- 2 movie recommendations that both people will like (based on their watch history and ratings). 
- Ensure the movie recommendations are highly personalized to the users likes and dislikes (based on their watch history and ratings).
- Utilize the watched movie's genres, actors, directors, and plot for the recommendation.
- Focus more on the personalized aspect of the recommendations than the popularity of the movies.
- Ensure that the movies have not been watched by either person.
- Rationale for each recommendation for each person.
- rationale1 is for person 1, rationale2 is for person 2. 
- The rationale should be in the style of Will Ferrell
- The rationale should be 1-2 sentences long and start with the person's name (but keep it creative and fun)

Response Structure:
{
    [
        {
            title: string,
            imdbID: string,
            rationale1: string,
            rationale2: string
        },
        {
            title: string,
            imdbID: string,
            rationale1: string,
            rationale2: string
        }
    ]
}
`

export const rec_prompt2 = `As a seasoned movie critic, your task is to suggest two films tailored to the tastes of the given individuals, based on their viewing history and ratings. The input includes each person's name, their movie list with ratings (1-5), and their interest status (watched, interested, not interested).

The output should consist of two movie recommendations that all individuals would enjoy, taking into account their viewing history and ratings. The suggestions should be highly personalized, focusing more on the individual's preferences than the movie's popularity. The recommended movies should not have been watched by all people.

For each movie recommendation, provide a rationale in the style of Will Ferrell for each person, starting with the person's name. The rationale should be creative, fun, and no more than two sentences long.

The response should be structured as follows:

[
    {
        title: string,
        imdbID: string,
        rationales: ["", "", ...]
    },
    {
        title: string,
        imdbID: string,
        rationales: ["", "", ...]
    }
]`;

export const rec_prompt_improve = `As a seasoned movie critic, your task is to review two suggested films tailored to the tastes of the given individuals, based on their viewing history and ratings (1-5). The input includes each person's name, their movie list with ratings, their interest status (watched, interested, not interested), and their suggested movies.

Ensure:
- The suggested movies are highly personalized, focusing more on the individual's preferences than the movie's popularity.
- The recommended movies have not been watched by any person.
- The rationale for each recommendation is in the style of Will Ferrell, starting with the person's name.
- Each movie recommendation must have 1 rationale for each person.
- The rationale is creative, fun, and no more than two sentences long.
- Ensure only 2 movies are recommended.
- If the movies are not good recommendations, too generic, too common, not personalized enough, pick better movies.

The response should be structured as follows:

[
    {
        title: string,
        imdbID: string,
        rationales: ["", "", ...]
    },
    {
        title: string,
        imdbID: string,
        rationales: ["", "", ...]
    }
]`;