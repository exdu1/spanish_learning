// Idempotent migrations + seed. Runs on every server start; safe to run repeatedly.
// Usage: `npm run migrate` (standalone) or imported by server/index.js.
import { pathToFileURL } from 'node:url';
import { pool } from './db.js';
import { WEEKS, EXIT_CRITERIA, DAILY_BLOCKS, WEEKLY_TARGET_MINUTES } from './seed/content.js';

const MIGRATIONS = [
  {
    id: '001_init',
    sql: `
      CREATE TABLE settings (
        key   text PRIMARY KEY,
        value text NOT NULL
      );
      CREATE TABLE content (
        key  text PRIMARY KEY,
        data jsonb NOT NULL
      );
      CREATE TABLE block_logs (
        day        date NOT NULL,
        block      text NOT NULL,
        minutes    integer NOT NULL DEFAULT 0 CHECK (minutes >= 0),
        done       boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (day, block)
      );
      CREATE TABLE checks (
        item_id    text PRIMARY KEY,
        done       boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE sentences (
        id         serial PRIMARY KEY,
        es         text NOT NULL,
        ipa        text,
        note       text,
        week       smallint CHECK (week BETWEEN 1 AND 4),
        source     text,
        mined_on   date NOT NULL DEFAULT CURRENT_DATE,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX sentences_mined_on_idx ON sentences (mined_on);
      CREATE TABLE errors (
        id         serial PRIMARY KEY,
        day        date NOT NULL DEFAULT CURRENT_DATE,
        said       text NOT NULL,
        correct    text NOT NULL,
        pattern    text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
];

export async function migrateAndSeed() {
  const client = await pool.connect();
  try {
    // Spanish accents and IPA symbols need a UTF-8 database; fail loudly rather than mangle text.
    const { rows: [{ server_encoding: enc }] } = await client.query('SHOW server_encoding');
    if (enc !== 'UTF8') throw new Error(`Database encoding is ${enc}; it must be UTF8.`);

    // Advisory lock so two instances starting at once don't race.
    await client.query('SELECT pg_advisory_lock(424242)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await client.query('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.id));

    for (const m of MIGRATIONS) {
      if (applied.has(m.id)) continue;
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
        await client.query('COMMIT');
        console.log(`migration applied: ${m.id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Seed: static plan content is upserted every time so edits to seed/content.js ship on deploy.
    // User progress lives in other tables and is never touched here.
    const content = {
      weeks: WEEKS,
      exit: EXIT_CRITERIA,
      blocks: DAILY_BLOCKS,
      weeklyTargetMinutes: WEEKLY_TARGET_MINUTES,
    };
    for (const [key, data] of Object.entries(content)) {
      await client.query(
        `INSERT INTO content (key, data) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
        [key, JSON.stringify(data)],
      );
    }
    console.log('seed complete');
  } finally {
    await client.query('SELECT pg_advisory_unlock(424242)').catch(() => {});
    client.release();
  }
}

// Allow `node server/migrate.js`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrateAndSeed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
