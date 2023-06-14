ALTER TABLE profile ADD COLUMN lowercase_name text;

UPDATE profile SET lowercase_name = LOWER(name);

ALTER TABLE profile ADD CONSTRAINT lowercase_name_unique UNIQUE(lowercase_name);

ALTER TABLE user_movie DROP COLUMN user_name;
ALTER TABLE profile DROP CONSTRAINT profile_pkey;
ALTER TABLE profile ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE profile ADD PRIMARY KEY (id);

ALTER TABLE user_movie ADD COLUMN user_id uuid;

ALTER TABLE user_movie ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES profile (id);
ALTER TABLE user_movie ADD CONSTRAINT unique_imdbid_user_id UNIQUE (imdbid, user_id);
