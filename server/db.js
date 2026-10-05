import './env.js';
import pg from 'pg';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates (avoids timezone shifts).
pg.types.setTypeParser(1082, (v) => v);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Render's internal URL needs no SSL; its external hostnames (*.render.com) require it.
const ssl = /render\.com/.test(connectionString) || process.env.DATABASE_SSL === 'true'
  ? { rejectUnauthorized: false }
  : false;

export const pool = new pg.Pool({ connectionString, ssl, max: 5 });

pool.on('connect', (client) => client.query("SET client_encoding = 'UTF8'"));

export const query = (text, params) => pool.query(text, params);
