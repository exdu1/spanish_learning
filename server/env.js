// Minimal .env loader for local development. On Render, env vars come from the dashboard/Blueprint.
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), '.env');
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
