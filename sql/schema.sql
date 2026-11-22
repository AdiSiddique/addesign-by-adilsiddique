-- Run this once against your Vercel Postgres database
-- (Vercel dashboard → Storage → your DB → Query, or `psql "$POSTGRES_URL" -f sql/schema.sql`)

CREATE TABLE IF NOT EXISTS items (
  cat         TEXT NOT NULL,
  id          TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  tag         TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  prompt      TEXT NOT NULL DEFAULT '',
  youtube     TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  price       TEXT NOT NULL DEFAULT '',
  buy         TEXT NOT NULL DEFAULT '',
  download    TEXT NOT NULL DEFAULT '',
  images      JSONB NOT NULL DEFAULT '[]',   -- [{ t, f, w, h }, ...]
  status      TEXT NOT NULL DEFAULT 'pending',  -- published | pending | rejected
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cat, id)
);

CREATE INDEX IF NOT EXISTS items_public_idx ON items (cat, status, date DESC);
CREATE INDEX IF NOT EXISTS items_status_idx ON items (status, date DESC);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id      TEXT PRIMARY KEY,
  visible BOOLEAN NOT NULL DEFAULT true
);
