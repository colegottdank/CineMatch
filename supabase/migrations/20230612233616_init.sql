-- First, let's create the enum type for the status field
CREATE TYPE movie_status AS ENUM ('watched', 'interested', 'not_interested');

CREATE TABLE profile (
    name TEXT NOT NULL PRIMARY KEY
);

-- Now, let's create the table
CREATE TABLE user_movie (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    imdbid TEXT,
    user_name TEXT NOT NULL REFERENCES profile(name),
    status movie_status NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_movies_pkey PRIMARY KEY (id),
    CONSTRAINT user_name_unique UNIQUE (user_name)
);
