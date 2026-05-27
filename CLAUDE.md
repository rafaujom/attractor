# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Express + MongoDB, port 3001)
```bash
cd backend
npm run dev       # nodemon watch mode
npm run seed      # one-time seed of historical draws into MongoDB
npm start         # production (no watch)
```

### Frontend (React + Vite, port 5173)
```bash
cd frontend
npm run dev       # Vite dev server with HMR
npm run build     # production build
npm run preview   # preview production build
```

Both servers must run concurrently for local development. The frontend Vite config proxies all `/api/*` requests to `http://localhost:3001`, so there is no CORS friction in dev.

## Environment

Backend requires `backend/.env` with:
```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/lotofacil?retryWrites=true&w=majority
PORT=3001
```

Copy from `backend/.env.example`. MongoDB Atlas is required — there is no local DB fallback.

## Architecture

**Data flow:** `asloterias.com.br` → `backend/services/scraper.js` (Axios + Cheerio) → `backend/services/classifier.js` → MongoDB (`Draw` collection) → REST API → React frontend.

**Gravity classification** (`backend/services/classifier.js`) is the core business logic. It takes an array of 15 numbers and returns a category based solely on `min` and `max`:
- `small-gravity`: max ≤ 21
- `mid-gravity`: min ≥ 4 AND max ≥ 22
- `high-gravity`: min ≤ 3 AND max ≥ 22

The `min`, `max`, and `category` fields are computed at write time (scrape or seed) and stored denormalised on the `Draw` document — do not recompute them on reads.

**Backend routes** (`backend/routes/draws.js`):
- `GET /api/draws` — paginated list, supports `page`, `limit`, `category`, `month` (YYYY-MM) query params
- `GET /api/draws/stats` — aggregated KPIs + monthly breakdown via MongoDB aggregation pipeline
- `POST /api/draws/fetch` — triggers scrape and upserts new draws via `bulkWrite`

**Frontend** has no API layer abstraction beyond direct `axios` calls in component files. Recharts is used for the donut and stacked-bar charts. Tailwind for styling.

There are no tests and no linter configured in either package.
