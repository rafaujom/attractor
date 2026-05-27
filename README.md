# 🎯 Lotofácil Gravity Dashboard

A full-stack web app to track and visualise Lotofácil draw results classified by **gravity category** (high / mid / small).

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18 + Vite + Tailwind + Recharts |
| Backend  | Node.js + Express                 |
| Database | MongoDB Atlas (Mongoose)          |
| Scraper  | Axios + Cheerio → asloterias.com.br |

---

## Project Structure

```
lotofacil-app/
├── backend/
│   ├── server.js              # Express entry point
│   ├── .env.example           # Environment variables template
│   ├── models/Draw.js         # Mongoose schema
│   ├── routes/draws.js        # REST API routes
│   └── services/
│       ├── classifier.js      # Gravity classification logic
│       ├── scraper.js         # Web scraper for new results
│       └── seeder.js          # One-time seed script (99 historical draws)
└── frontend/
    ├── vite.config.js         # Vite + proxy config
    └── src/
        ├── App.jsx
        ├── services/api.js    # Axios API calls
        └── components/
            ├── Header.jsx          # Title + "Fetch latest" button
            ├── StatsCards.jsx      # KPI cards
            ├── GravityPieChart.jsx # Donut chart
            ├── MonthlyBarChart.jsx # Stacked bar chart
            ├── MonthlyBreakdown.jsx# Monthly summary table
            └── ResultsTable.jsx    # Paginated results + filter
```

---

## Setup

### 1. MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and whitelist your IP
3. Copy the connection string (format: `mongodb+srv://...`)

### 2. Backend

```bash
cd backend
npm install

# Create your .env from the example
cp .env.example .env
# Edit .env and paste your MongoDB URI

# Seed the database with 99 historical draws (23/01/2026 – 23/05/2026)
npm run seed

# Start the server (port 3001)
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install

# Start the dev server (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## API Reference

| Method | Endpoint              | Description                                      |
|--------|-----------------------|--------------------------------------------------|
| GET    | `/api/draws`          | Paginated list of draws. Query: `page`, `limit`, `category`, `month` |
| GET    | `/api/draws/stats`    | Overall stats + monthly breakdown                |
| GET    | `/api/draws/:concurso`| Single draw by concurso number                   |
| POST   | `/api/draws/fetch`    | Scrape latest results and upsert into MongoDB    |
| GET    | `/api/health`         | Health check                                     |

---

## Gravity Classification

| Category       | Condition               | Meaning                          |
|----------------|-------------------------|----------------------------------|
| 🟢 small-gravity | max ≤ 21              | All numbers in the lower range   |
| 🔵 mid-gravity   | min ≥ 4 AND max ≥ 22  | All numbers in the upper range   |
| 🔴 high-gravity  | min ≤ 3 AND max ≥ 22  | Numbers span the full 1–25 range |

---

## Dashboard Features

- **KPI Cards** — total draws, and count + % for each category
- **Donut Chart** — gravity distribution at a glance
- **Stacked Bar Chart** — monthly breakdown of all three categories
- **Monthly Summary Table** — special events count and percentage per month
- **Results Table** — paginated, filterable by category, newest first
- **Fetch Latest Button** — scrapes asloterias.com.br and inserts new draws automatically
