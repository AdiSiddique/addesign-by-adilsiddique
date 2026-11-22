/*
  Thin wrapper around @neondatabase/serverless.

  "Vercel Postgres" (the old native product, env var POSTGRES_URL) was sunset
  in Dec 2024 - Postgres on Vercel now comes from Neon via the Vercel
  Marketplace, and the env var it sets is DATABASE_URL instead.

  fullResults: true keeps the same `{ rows }` shape the rest of this project
  uses, so nothing else needed to change.
*/
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('[db] DATABASE_URL is not set - attach a Postgres database to this project in Vercel → Storage.');
}

const sql = neon(process.env.DATABASE_URL, { fullResults: true });
module.exports = { sql };
