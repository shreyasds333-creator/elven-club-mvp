-- ELVN CLUB MVP schema — safe to re-run
-- Run this in Supabase dashboard → SQL Editor

-- ── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  handle     TEXT NOT NULL DEFAULT '',
  initials   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_profile_select" ON profiles;
DROP POLICY IF EXISTS "own_profile_insert" ON profiles;
DROP POLICY IF EXISTS "own_profile_update" ON profiles;
CREATE POLICY "own_profile_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own_profile_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── Core game state ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_app_state (
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  coins          INTEGER DEFAULT 25000,
  streak         INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_proof_date DATE,
  shields        INTEGER DEFAULT 2,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_app_state" ON user_app_state;
CREATE POLICY "own_app_state" ON user_app_state FOR ALL USING (auth.uid() = user_id);

-- ── Coin transactions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label      TEXT NOT NULL,
  coins      INTEGER NOT NULL,
  is_debit   BOOLEAN DEFAULT FALSE,
  emoji      TEXT DEFAULT '💰',
  category   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_transactions" ON transactions;
CREATE POLICY "own_transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- ── Challenge memberships ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_memberships (
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id BIGINT NOT NULL,
  entry_coins  INTEGER DEFAULT 0,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_id)
);
ALTER TABLE challenge_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_memberships" ON challenge_memberships;
CREATE POLICY "own_memberships" ON challenge_memberships FOR ALL USING (auth.uid() = user_id);

-- ── Daily proof submissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proof_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id    BIGINT NOT NULL,
  challenge_title TEXT NOT NULL,
  streak_at_time  INTEGER NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE proof_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_proofs" ON proof_submissions;
CREATE POLICY "own_proofs" ON proof_submissions FOR ALL USING (auth.uid() = user_id);

-- ── Claimed prizes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claimed_challenges (
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id BIGINT NOT NULL,
  prize_coins  INTEGER DEFAULT 0,
  claimed_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_id)
);
ALTER TABLE claimed_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_claimed" ON claimed_challenges;
CREATE POLICY "own_claimed" ON claimed_challenges FOR ALL USING (auth.uid() = user_id);

-- ── Shield activations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shielded_challenges (
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, challenge_id)
);
ALTER TABLE shielded_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_shielded" ON shielded_challenges;
CREATE POLICY "own_shielded" ON shielded_challenges FOR ALL USING (auth.uid() = user_id);

-- ── User-created challenges ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS created_challenges (
  id         BIGINT PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE created_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_created_challenges" ON created_challenges;
CREATE POLICY "own_created_challenges" ON created_challenges FOR ALL USING (auth.uid() = user_id);
