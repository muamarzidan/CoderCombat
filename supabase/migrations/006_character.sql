ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS character TEXT NOT NULL DEFAULT 'shinobi';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_character_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_character_check
  CHECK (character IN ('samurai', 'shinobi'));
