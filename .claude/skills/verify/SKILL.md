---
name: verify
description: How to build, run, and drive this app to verify changes end-to-end
---

# Verifying changes in this repo

## Servers — check before starting your own

The user usually has both dev servers already running. Probe first:

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN   # backend (tsx watch — hot-reloads your edits)
lsof -nP -iTCP:5173 -sTCP:LISTEN   # frontend (Vite)
```

- If they're up, **use them** — `tsx watch` and Vite HMR pick up your edits automatically. Starting your own copies gets EADDRINUSE (backend) or a silent fallback to port 5174 (Vite), and you end up driving the wrong instance.
- Only if down: `cd backend && npm run dev` and `cd frontend && npm run dev`.

## Gotcha: mongod squats 127.0.0.1:3001

A local `mongod` listens on **IPv4 127.0.0.1:3001**; the Express backend listens on **IPv6 [::]:3001**. `curl localhost:3001` can hit either. Always curl the backend via `http://[::1]:3001/...`.

## Gotcha: GET /api/tickets without params returns []

`''.split(',')` → `['']` → `Number('')` = 0, so the no-param route filters by `concurso ∈ [0]` and returns nothing. To list tickets, always pass `?concursos=<n1>,<n2>`.

## Driving the UI headlessly

The Claude-in-Chrome extension may not be connected. Playwright's headless Chromium is cached locally — no download needed:

```js
// npm install playwright-core (in scratchpad), then:
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/rafael/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell',
});
```

Drive `http://localhost:5173/`. Useful selectors: `+ My Ticket` buttons per table row, ball buttons named `01`–`25`, `Salvar` / `Fechar` buttons. Target a specific row with `page.locator('tr', { hasText: '#<concurso>' })` — the first row often already has a saved ticket (✅ button), so `.first()` on ticket buttons is unreliable.

## Real data warning

The backend talks to the user's **real MongoDB Atlas** cluster (`backend/.env`). Tickets you save during verification land in their data — note which concursos you touched and delete your test docs afterwards (no DELETE endpoint; use a one-off mongoose script with `MONGODB_URI` from `backend/.env`). Don't touch tickets you didn't create.
