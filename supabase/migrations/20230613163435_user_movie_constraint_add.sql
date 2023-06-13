ALTER TABLE user_movie
ADD CONSTRAINT user_movie_unique_username_imbid UNIQUE (user_name, imdbid);