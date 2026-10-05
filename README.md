# Etapa 1 — Spanish Stage 1 tracker

A single-user, mobile-first tracker for a 4-week Spanish study plan. React (Vite) frontend and an Express API run as one Render web service, backed by Render Postgres.

## Deploy (Render Blueprint)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, then pick the repo. Render reads `render.yaml` and creates:
   - `spanish-stage1`, a Node web service on the free plan, with `/health` as its health check
   - `spanish-stage1-db`, a Postgres database on the free plan
3. When prompted, enter **`APP_PASSWORD`** (the password you'll log in with). Render generates `SESSION_SECRET` and wires up `DATABASE_URL` automatically.
4. Migrations and seeding run every time the server starts. They're safe to repeat.

**Redeploy:** push to `main`. Auto-deploy is on. To deploy manually, use **Manual Deploy → Deploy latest commit** in the Render dashboard.

**Change the password:** update `APP_PASSWORD` under the service's Environment tab. Every device is logged out.

### Free-tier caveats
- The web service sleeps after 15 minutes idle, and the first request takes about 1 minute to wake it.
- **The free Postgres database expires 30 days after creation** and is deleted 14 days later. To keep your data, upgrade the database's plan in the dashboard before then, or change `plan: free` under `databases` in `render.yaml`.

## Local development

You need Node 20+ and a **UTF-8** Postgres database.

```bash
cp .env.example .env     # then edit DATABASE_URL / APP_PASSWORD
npm install
npm run dev              # API on :3000, Vite on :5173 (proxies /api)
```

`npm run build && npm start` runs the production build locally.

## Editing plan content

Week tables, chunks, checklists, exit criteria and daily blocks live in `server/seed/content.js`. The content is re-seeded on every deploy. Your progress is stored against checklist item **ids**, so you can change a label freely but shouldn't change an id.
