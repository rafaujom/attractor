# Pending Tickets (buy before the draw) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user save a "My Ticket" for a concurso that hasn't been drawn yet, so it shows as a placeholder row in "Todos os Concursos" and is automatically scored once that concurso's result is fetched.

**Architecture:** `Ticket.matches`/`Ticket.hasPrize` become nullable (`null` = pending, no draw to score against yet). `POST /api/tickets` allows creating a ticket with no matching `Draw` (as long as the concurso is in the future). `POST /api/draws/fetch` scores any pending ticket whose concurso just got a real result. The frontend fetches pending tickets separately and renders them as pinned placeholder rows above the normal paginated table, with a "+ Nova Aposta" entry point and a generalized `TicketModal` that works with or without a real draw.

**Tech Stack:** Express + Mongoose (backend), React + TypeScript + Tailwind (frontend), shared types in `shared/types/index.ts`. No test framework is configured in this repo — verification is manual (curl for the API, throwaway `tsx` scripts for isolated backend logic, browser for the UI), per `CLAUDE.md`.

## Global Constraints

- No automated test suite or linter exists in this repo — do not introduce one; verify manually as described in each task.
- Backend dev server: `cd backend && npm run dev` (port 3001). Frontend dev server: `cd frontend && npm run dev` (port 5173, proxies `/api` to 3001).
- `backend/.env` with a real `MONGODB_URI` already exists — verification steps hit a real MongoDB Atlas database. Any throwaway test data created during verification must be cleaned up in the same task.
- Follow existing code style: 2-space indent, matching current formatting exactly (see existing files for reference), Portuguese (pt-BR) copy for all user-facing frontend text.

---

### Task 1: Shared types — nullable ticket scoring fields

**Files:**
- Modify: `shared/types/index.ts:78-86`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Ticket.matches: number | null`, `Ticket.hasPrize: boolean | null` — every later task (backend model, routes, frontend components) relies on this nullability to represent "pending, not yet scored."

- [ ] **Step 1: Update the `Ticket` interface**

In `shared/types/index.ts`, replace:

```ts
export interface Ticket {
  concurso: number;
  numbers: number[];
  matches: number;
  hasPrize: boolean;
  label?: string;
  description?: string;
  createdAt?: string;
}
```

with:

```ts
export interface Ticket {
  concurso: number;
  numbers: number[];
  matches: number | null;
  hasPrize: boolean | null;
  label?: string;
  description?: string;
  createdAt?: string;
}
```

`TicketInput` is unchanged — the server always computes `matches`/`hasPrize`.

- [ ] **Step 2: Typecheck both packages**

Run:
```bash
cd backend && npx tsc --noEmit
cd ../frontend && npm run typecheck
```
Expected: both exit with no errors. (Existing frontend code only reads `t.matches`/`t.hasPrize` in falsy/interpolation contexts, so widening the type to include `null` should not break compilation.)

- [ ] **Step 3: Commit**

```bash
git add shared/types/index.ts
git commit -m "feat: allow ticket matches/hasPrize to be null (pending scoring)"
```

---

### Task 2: Backend — nullable fields on the Ticket model

**Files:**
- Modify: `backend/models/Ticket.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ITicketDocument.matches: number | null`, `ITicketDocument.hasPrize: boolean | null`. Later tasks (scoring service, ticket routes, draws fetch route) read/write these as nullable.

- [ ] **Step 1: Update the model**

Replace the full contents of `backend/models/Ticket.ts` with:

```ts
import mongoose from 'mongoose';

export interface ITicketDocument extends mongoose.Document {
  concurso: number;
  matches: number | null;
  hasPrize: boolean | null;
  numbers: number[];
  label?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new mongoose.Schema<ITicketDocument>(
  {
    concurso: { type: Number, required: true, unique: true, index: true },
    matches:  { type: Number, default: null },
    hasPrize: { type: Boolean, default: null },
    numbers: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          v.length === 15 && new Set(v).size === 15 && v.every((n) => n >= 1 && n <= 25),
        message: 'Ticket must have exactly 15 unique numbers between 1 and 25.',
      },
    },
    label: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITicketDocument>('Ticket', ticketSchema);
```

(Only change from the original: `matches`/`hasPrize` drop `required: true` and gain `default: null`; the TS interface widens both to `| null`.)

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors (nothing else references `ITicketDocument.matches`/`hasPrize` as non-null yet — `routes/tickets.ts` just passes them through).

- [ ] **Step 3: Commit**

```bash
git add backend/models/Ticket.ts
git commit -m "feat: make Ticket.matches/hasPrize nullable for pending tickets"
```

---

### Task 3: Backend — scoring service

**Files:**
- Create: `backend/services/scoring.ts`

**Interfaces:**
- Consumes: `Ticket` model from `backend/models/Ticket.ts` (Task 2).
- Produces:
  - `PRIZE_THRESHOLD: number` — the 11-match prize cutoff, single source of truth.
  - `scoreTicket(pickedNumbers: number[], drawNumbers: number[]): { matches: number; hasPrize: boolean }` — pure function, used by Task 4 (`routes/tickets.ts`) and internally here.
  - `scorePendingTickets(draws: { concurso: number; numbers: number[] }[]): Promise<void>` — scores any pending ticket (`matches === null`) matching one of the given draws. Used by Task 5 (`routes/draws.ts`).

- [ ] **Step 1: Write the service**

Create `backend/services/scoring.ts`:

```ts
import Ticket from '../models/Ticket.js';

export const PRIZE_THRESHOLD = 11; // 11+ matches wins a prize in Lotofácil

export function scoreTicket(
  pickedNumbers: number[],
  drawNumbers: number[]
): { matches: number; hasPrize: boolean } {
  const drawSet = new Set(drawNumbers);
  const matches = pickedNumbers.filter((n) => drawSet.has(n)).length;
  return { matches, hasPrize: matches >= PRIZE_THRESHOLD };
}

// Scores any pending ticket (matches === null) whose concurso matches one of the
// given draws. Called after new draws are inserted so tickets bought ahead of a
// result get resolved automatically.
export async function scorePendingTickets(
  draws: { concurso: number; numbers: number[] }[]
): Promise<void> {
  for (const draw of draws) {
    const pending = await Ticket.findOne({ concurso: draw.concurso, matches: null });
    if (!pending) continue;
    const { matches, hasPrize } = scoreTicket(pending.numbers, draw.numbers);
    pending.matches = matches;
    pending.hasPrize = hasPrize;
    await pending.save();
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify `scorePendingTickets` against the real database with throwaway data**

Make sure the backend dev server does NOT need to be running for this (it connects to Mongo directly). From `backend/`, create a scratch script:

```bash
cd backend
cat > scratch-verify-scoring.ts << 'EOF'
import 'dotenv/config';
import mongoose from 'mongoose';
import Ticket from './models/Ticket.js';
import { scorePendingTickets } from './services/scoring.js';

const TEST_CONCURSO = 987654321; // clearly fake, won't collide with real data

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  // Seed a pending ticket directly (bypassing the API/route validation this task doesn't touch)
  await Ticket.deleteOne({ concurso: TEST_CONCURSO });
  await Ticket.create({
    concurso: TEST_CONCURSO,
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    matches: null,
    hasPrize: null,
  });

  await scorePendingTickets([
    { concurso: TEST_CONCURSO, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20, 21, 22, 23] },
  ]);

  const scored = await Ticket.findOne({ concurso: TEST_CONCURSO });
  console.log('matches:', scored?.matches, 'hasPrize:', scored?.hasPrize);
  // 11 of the ticket's 15 numbers (1-11) are in the draw -> matches=11, hasPrize=true

  await Ticket.deleteOne({ concurso: TEST_CONCURSO }); // cleanup
  await mongoose.disconnect();
}

main();
EOF
npx tsx scratch-verify-scoring.ts
rm scratch-verify-scoring.ts
```

Expected output: `matches: 11 hasPrize: true`

- [ ] **Step 4: Commit**

```bash
git add backend/services/scoring.ts
git commit -m "feat: extract ticket scoring into a shared service"
```

---

### Task 4: Backend — pending ticket creation + pending list endpoint

**Files:**
- Modify: `backend/routes/tickets.ts`

**Interfaces:**
- Consumes: `scoreTicket` from `backend/services/scoring.ts` (Task 3).
- Produces:
  - `POST /api/tickets` no longer 404s when the draw doesn't exist yet — it saves a pending ticket (`matches: null, hasPrize: null`) as long as `concurso` is greater than the latest known draw; otherwise 400.
  - `GET /api/tickets/pending` — new endpoint, returns `Ticket[]` where `matches === null`, sorted by `concurso` desc. Consumed by Task 7 (frontend `api.ts`).

- [ ] **Step 1: Replace the file contents**

Replace the full contents of `backend/routes/tickets.ts` with:

```ts
import express, { Request, Response } from 'express';
import Ticket, { ITicketDocument } from '../models/Ticket.js';
import Draw from '../models/Draw.js';
import { scoreTicket } from '../services/scoring.js';
import type { Ticket as TicketType } from '../../shared/types/index.js';

const router = express.Router();

function serialize(t: ITicketDocument): TicketType {
  return {
    concurso:  t.concurso,
    numbers:   t.numbers,
    matches:   t.matches,
    hasPrize:  t.hasPrize,
    label:     t.label,
    description: t.description,
    createdAt: t.createdAt?.toISOString(),
  };
}

// ── GET /api/tickets?concursos=1,2,3 ──────────────────────────────────────────
// Returns the player's saved tickets. When `concursos` is provided, only the
// tickets for those draws are returned (used to hydrate the results table).
router.get('/', async (req: Request, res: Response) => {
  try {
    const raw = typeof req.query.concursos === 'string' ? req.query.concursos : '';
    const concursos = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n));

    const filter = concursos.length > 0 ? { concurso: { $in: concursos } } : {};
    const tickets = await Ticket.find(filter).sort({ concurso: -1 });
    res.json(tickets.map(serialize));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /api/tickets/pending ───────────────────────────────────────────────────
// Tickets bought for a concurso that hasn't been drawn yet (matches is null).
// Used to render placeholder rows in "Todos os Concursos" before the result exists.
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find({ matches: null }).sort({ concurso: -1 });
    res.json(tickets.map(serialize));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────
// Upsert the player's ticket for a draw. If the draw hasn't happened yet, the
// ticket is saved as pending (matches/hasPrize null); POST /api/draws/fetch scores
// it later once that concurso's result comes in. matches/hasPrize are always
// computed on the server so they can't be spoofed by the client.
router.post('/', async (req: Request, res: Response) => {
  try {
    const { concurso, numbers, label, description } = req.body as {
      concurso: unknown;
      numbers: unknown;
      label?: unknown;
      description?: unknown;
    };

    if (!Number.isInteger(concurso)) {
      res.status(400).json({ error: 'A valid concurso number is required.' });
      return;
    }

    if (!Array.isArray(numbers) || numbers.length !== 15) {
      res.status(400).json({ error: 'Ticket must contain exactly 15 numbers.' });
      return;
    }

    const nums = numbers as number[];

    if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 25)) {
      res.status(400).json({ error: 'All numbers must be integers between 1 and 25.' });
      return;
    }

    if (new Set(nums).size !== 15) {
      res.status(400).json({ error: 'All 15 numbers must be unique.' });
      return;
    }

    const draw = await Draw.findOne({ concurso });

    let matches: number | null = null;
    let hasPrize: boolean | null = null;

    if (draw) {
      ({ matches, hasPrize } = scoreTicket(nums, draw.numbers));
    } else {
      const latest = await Draw.findOne().sort({ concurso: -1 });
      const latestConcurso = latest?.concurso ?? 0;
      if (concurso <= latestConcurso) {
        res
          .status(400)
          .json({ error: `Draw #${concurso} not found and is not a future concurso.` });
        return;
      }
      // concurso is in the future: save as pending, scored later by POST /api/draws/fetch
    }

    const ticket = await Ticket.findOneAndUpdate(
      { concurso },
      {
        concurso,
        numbers: nums,
        matches,
        hasPrize,
        label: typeof label === 'string' && label.trim() ? label.trim() : undefined,
        description:
          typeof description === 'string' && description.trim() ? description.trim() : undefined,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(serialize(ticket));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify with the dev server running**

Start the backend if it's not already running:
```bash
cd backend && npm run dev
```
(Leave it running; use a second terminal for the checks below.)

Get the current latest concurso:
```bash
LATEST=$(curl -s http://localhost:3001/api/draws/stats | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).latestConcurso))")
echo $LATEST
```

Create a pending ticket far enough in the future that it can't collide with a real ticket (`LATEST + 500`):
```bash
TEST_CONCURSO=$((LATEST + 500))
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3001/api/tickets \
  -H "Content-Type: application/json" \
  -d "{\"concurso\": $TEST_CONCURSO, \"numbers\": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]}"
```
Expected: `HTTP 201` and a JSON body with `"concurso":<TEST_CONCURSO>`, `"matches":null`, `"hasPrize":null`.

Confirm it appears in the pending list:
```bash
curl -s http://localhost:3001/api/tickets/pending | grep "$TEST_CONCURSO"
```
Expected: a line containing `"concurso":<TEST_CONCURSO>` and `"matches":null`.

Confirm the typo guard rejects a concurso that's clearly not a real future draw (any negative number is always ≤ `latestConcurso` and will never have a `Draw`):
```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3001/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"concurso": -1, "numbers": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]}'
```
Expected: `HTTP 400` and body `{"error":"Draw #-1 not found and is not a future concurso."}`.

Clean up the test ticket so it doesn't linger in the real database:
```bash
cd backend
cat > scratch-cleanup-ticket.ts << 'EOF'
import 'dotenv/config';
import mongoose from 'mongoose';
import Ticket from './models/Ticket.js';

async function main() {
  const concurso = Number(process.argv[2]);
  await mongoose.connect(process.env.MONGODB_URI as string);
  const res = await Ticket.deleteOne({ concurso });
  console.log(`deleted ${res.deletedCount} ticket(s) for concurso ${concurso}`);
  await mongoose.disconnect();
}

main();
EOF
npx tsx scratch-cleanup-ticket.ts $TEST_CONCURSO
rm scratch-cleanup-ticket.ts
```
Expected: `deleted 1 ticket(s) for concurso <TEST_CONCURSO>`.

- [ ] **Step 4: Commit**

```bash
git add backend/routes/tickets.ts
git commit -m "feat: allow saving a ticket before its draw exists (pending tickets)"
```

---

### Task 5: Backend — score pending tickets when new draws are fetched

**Files:**
- Modify: `backend/routes/draws.ts:1-5` (imports), `backend/routes/draws.ts:179-208` (`POST /fetch` handler)

**Interfaces:**
- Consumes: `scorePendingTickets` from `backend/services/scoring.ts` (Task 3).
- Produces: no new external interface — this closes the loop so pending tickets from Task 4 get scored automatically.

- [ ] **Step 1: Add imports**

In `backend/routes/draws.ts`, change the top imports from:

```ts
import express, { Request, Response } from 'express';
import Draw from '../models/Draw.js';
import { fetchLatest } from '../services/scraper.js';
import { computeSequentialStreaks } from '../services/streaks.js';
import type { StatsResponse, MonthlyEntry, GravityCategory, DrawInput, RecencyEntry, SequentialStreakResponse } from '../../shared/types/index.js';
```

to:

```ts
import express, { Request, Response } from 'express';
import Draw from '../models/Draw.js';
import { fetchLatest } from '../services/scraper.js';
import { computeSequentialStreaks } from '../services/streaks.js';
import { scorePendingTickets } from '../services/scoring.js';
import type { StatsResponse, MonthlyEntry, GravityCategory, DrawInput, RecencyEntry, SequentialStreakResponse } from '../../shared/types/index.js';
```

- [ ] **Step 2: Score pending tickets after inserting new draws**

Change the `POST /fetch` handler from:

```ts
router.post('/fetch', async (_req: Request, res: Response) => {
  try {
    const latest = await Draw.findOne().sort({ concurso: -1 });
    const afterConcurso = latest?.concurso ?? 0;

    const newDraws = await fetchLatest(afterConcurso);

    if (newDraws.length === 0) {
      return res.json({ inserted: 0, modified: 0, message: 'Already up to date.' });
    }

    const ops = newDraws.map((d: DrawInput) => ({
      updateOne: {
        filter: { concurso: d.concurso },
        update: { $set: d },
        upsert: true,
      },
    }));

    const result = await Draw.bulkWrite(ops);
    res.json({
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      message:  `${result.upsertedCount} new draw(s) added.`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

to:

```ts
router.post('/fetch', async (_req: Request, res: Response) => {
  try {
    const latest = await Draw.findOne().sort({ concurso: -1 });
    const afterConcurso = latest?.concurso ?? 0;

    const newDraws = await fetchLatest(afterConcurso);

    if (newDraws.length === 0) {
      return res.json({ inserted: 0, modified: 0, message: 'Already up to date.' });
    }

    const ops = newDraws.map((d: DrawInput) => ({
      updateOne: {
        filter: { concurso: d.concurso },
        update: { $set: d },
        upsert: true,
      },
    }));

    const result = await Draw.bulkWrite(ops);
    await scorePendingTickets(newDraws.map((d: DrawInput) => ({ concurso: d.concurso, numbers: d.numbers })));

    res.json({
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      message:  `${result.upsertedCount} new draw(s) added.`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify end-to-end with the dev server**

The scoring logic itself was already verified in isolation in Task 3; this step just confirms the route wiring calls it. With the backend dev server running:

```bash
LATEST=$(curl -s http://localhost:3001/api/draws/stats | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).latestConcurso))")
NEXT=$((LATEST + 1))
curl -s -X POST http://localhost:3001/api/tickets \
  -H "Content-Type: application/json" \
  -d "{\"concurso\": $NEXT, \"numbers\": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]}"
```
Expected: `"matches":null` in the response (pending ticket for the real next concurso).

```bash
curl -s -X POST http://localhost:3001/api/draws/fetch
```

Two possible outcomes, both valid:
- If the real Lotofácil site has already drawn concurso `$NEXT` (likely, since this app requires a manual click to catch up): the response reports at least 1 inserted draw. Then run `curl -s http://localhost:3001/api/tickets/pending | grep $NEXT` — expect **no output** (the ticket graduated out of pending). Confirm it's now scored: `curl -s "http://localhost:3001/api/tickets?concursos=$NEXT"` should show a non-null `matches`.
- If the local DB is already fully caught up: the response is `{"inserted":0,...,"message":"Already up to date."}` and the ticket stays pending. This is fine — it just means there's no new result to test against right now; re-run this check after a real draw happens, or trust Task 3's isolated verification of the scoring logic itself.

If the ticket did get scored, no cleanup is needed — it's a real ticket for a real draw the user now owns. If you want to remove it anyway (it used dummy numbers `1-15`), reuse the cleanup script from Task 4, Step 3.

- [ ] **Step 5: Commit**

```bash
git add backend/routes/draws.ts
git commit -m "feat: score pending tickets automatically when their draw is fetched"
```

---

### Task 6: Frontend — generalize TicketModal for pending tickets

**Files:**
- Modify: `frontend/src/components/TicketModal.tsx`

**Interfaces:**
- Consumes: `Draw`, `Ticket`, `TicketInput` from `@shared/types` (already updated in Task 1).
- Produces new `TicketModal` props, consumed by Task 7 (`ResultsTable.tsx`):
  ```ts
  interface Props {
    draw: Draw | null;           // null = no result yet (pending)
    concurso: number;            // value to display/edit
    concursoEditable: boolean;   // true only when creating a brand-new pending ticket
    existingTicket: Ticket | null;
    onSave: (ticket: TicketInput) => void; // was (ticket: Ticket) => void
    onClose: () => void;
  }
  ```

- [ ] **Step 1: Replace the file contents**

Replace the full contents of `frontend/src/components/TicketModal.tsx` with:

```tsx
import { useState } from 'react';
import type { Draw, Ticket, TicketInput } from '@shared/types';

interface Props {
  draw: Draw | null;
  concurso: number;
  concursoEditable: boolean;
  existingTicket: Ticket | null;
  onSave: (ticket: TicketInput) => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function TicketModal({
  draw,
  concurso,
  concursoEditable,
  existingTicket,
  onSave,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(
    existingTicket ? new Set(existingTicket.numbers) : new Set()
  );
  const [concursoValue, setConcursoValue] = useState(concurso);
  const [phase, setPhase] = useState<'pick' | 'result'>(
    draw && existingTicket ? 'result' : 'pick'
  );
  const [savedTicket, setSavedTicket] = useState<Ticket | null>(existingTicket);
  const [description, setDescription] = useState(existingTicket?.description ?? '');

  const drawSet = new Set(draw?.numbers ?? []);
  const isReadOnly = phase === 'result';
  const effectiveConcurso = concursoEditable ? concursoValue : concurso;
  const isConcursoValid = Number.isInteger(effectiveConcurso) && effectiveConcurso > 0;

  function toggleNumber(n: number) {
    if (isReadOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else if (next.size < 15) {
        next.add(n);
      }
      return next;
    });
  }

  function handleSave() {
    const pickedArr = Array.from(selected).sort((a, b) => a - b);
    const ticketInput: TicketInput = {
      concurso: effectiveConcurso,
      numbers: pickedArr,
      description: description.trim() || undefined,
    };

    if (draw) {
      const matches = pickedArr.filter((n) => drawSet.has(n)).length;
      const hasPrize = matches >= 11;
      setSavedTicket({ ...ticketInput, matches, hasPrize });
      setPhase('result');
    }

    onSave(ticketInput);

    if (!draw) onClose();
  }

  function getBallClass(n: number): string {
    if (phase === 'pick') {
      if (selected.has(n)) return 'bg-blue-500 text-white border-blue-600';
      if (selected.size >= 15) return 'bg-white text-slate-300 border-slate-200 cursor-not-allowed';
      return 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
    }
    // result/view phase
    if (savedTicket?.numbers.includes(n)) {
      return drawSet.has(n)
        ? 'bg-green-500 text-white border-green-600'
        : 'bg-red-400 text-white border-red-500';
    }
    return 'bg-slate-100 text-slate-400 border-slate-200 cursor-default';
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div>
            {concursoEditable ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Concurso #</span>
                <input
                  type="number"
                  min={1}
                  value={concursoValue}
                  onChange={(e) => setConcursoValue(Number(e.target.value))}
                  className="w-24 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            ) : (
              <h3 className="font-semibold text-slate-800">
                Concurso #{concurso}
              </h3>
            )}
            <p className="text-xs text-slate-400">
              {draw ? formatDate(draw.date) : 'Aguardando resultado'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Result summary */}
          {phase === 'result' && savedTicket && (
            <div className={`rounded-lg p-3 text-sm font-semibold text-center ${
              savedTicket.hasPrize
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              {savedTicket.hasPrize
                ? `Você acertou ${savedTicket.matches} números — 🏆 Premiado!`
                : `Você acertou ${savedTicket.matches} números`}
            </div>
          )}

          {/* Picker label */}
          <p className="text-xs text-slate-500 font-medium">
            {phase === 'pick'
              ? `Selecione 15 números (${selected.size}/15 selecionados)`
              : 'Seus números — 🟢 acerto · 🔴 erro'}
          </p>

          {/* 5×5 number grid */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => toggleNumber(n)}
                disabled={isReadOnly || (selected.size >= 15 && !selected.has(n))}
                className={`rounded-full w-10 h-10 text-sm font-bold border-2 transition-colors mx-auto flex items-center justify-center ${getBallClass(n)}`}
              >
                {String(n).padStart(2, '0')}
              </button>
            ))}
          </div>

          {/* Ticket details */}
          {phase === 'pick' ? (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1.5">Detalhes (opcional)</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Anotações sobre este jogo…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>
          ) : (
            savedTicket?.description && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1.5">Detalhes</p>
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {savedTicket.description}
                </p>
              </div>
            )
          )}

          {/* Draw result reference */}
          {draw && (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1.5">Resultado do Concurso</p>
              <div className="flex flex-wrap gap-1.5">
                {draw.numbers.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold"
                  >
                    {String(n).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 justify-end border-t border-slate-100 pt-4">
          {phase === 'pick' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={selected.size !== 15 || !isConcursoValid}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Salvar
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: errors in `ResultsTable.tsx` only (it still uses the old `TicketModal` props) — that's expected and fixed in Task 7. There should be **no** errors reported inside `TicketModal.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TicketModal.tsx
git commit -m "feat: generalize TicketModal to support tickets without a draw yet"
```

---

### Task 7: Frontend — pending ticket rows, "+ Nova Aposta", and wiring

**Files:**
- Modify: `frontend/src/services/api.ts:29-35`
- Modify: `frontend/src/App.tsx:14,71`
- Modify: `frontend/src/components/ResultsTable.tsx`

**Interfaces:**
- Consumes: `TicketModal` props from Task 6; `GET /api/tickets/pending` from Task 4.
- Produces: `getPendingTickets(): Promise<Ticket[]>` in `api.ts`, used only by `ResultsTable.tsx`.

- [ ] **Step 1: Add `getPendingTickets` to the API client**

In `frontend/src/services/api.ts`, after `getTickets`:

```ts
export const getTickets = (concursos: number[]): Promise<Ticket[]> =>
  api
    .get('/tickets', { params: { concursos: concursos.join(',') } })
    .then((r) => r.data as Ticket[]);

export const getPendingTickets = (): Promise<Ticket[]> =>
  api.get('/tickets/pending').then((r) => r.data as Ticket[]);

export const saveTicket = (ticket: TicketInput): Promise<Ticket> =>
  api.post('/tickets', ticket).then((r) => r.data as Ticket);
```

(i.e. insert the new `getPendingTickets` export between the existing `getTickets` and `saveTicket` exports.)

- [ ] **Step 2: Pass `latestConcurso` down from App**

In `frontend/src/App.tsx`, change:

```tsx
        <ResultsTable refreshKey={refreshKey} />
```

to:

```tsx
        <ResultsTable refreshKey={refreshKey} latestConcurso={stats?.latestConcurso} />
```

- [ ] **Step 3: Rewrite ResultsTable**

Replace the full contents of `frontend/src/components/ResultsTable.tsx` with:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { getDraws, getTickets, getPendingTickets, saveTicket } from '../services/api';
import type { DrawsResponse, GravityCategory, Draw, Ticket, TicketInput } from '@shared/types';
import TicketModal from './TicketModal';

interface Props {
  refreshKey?: number;
  latestConcurso?: number;
}

type ModalTarget =
  | { kind: 'draw'; draw: Draw }
  | { kind: 'pending-edit'; ticket: Ticket }
  | { kind: 'pending-new' };

const CAT_BADGE: Record<GravityCategory, string> = {
  'high-gravity':  'bg-red-100 text-red-700',
  'mid-gravity':   'bg-blue-100 text-blue-700',
  'small-gravity': 'bg-green-100 text-green-700',
};

const CAT_EMOJI: Record<GravityCategory, string> = {
  'high-gravity':  '🔴',
  'mid-gravity':   '🔵',
  'small-gravity': '🟢',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function ResultsTable({ refreshKey, latestConcurso }: Props) {
  const [data,           setData]           = useState<DrawsResponse | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [page,           setPage]           = useState(1);
  const [category,       setCategory]       = useState('');
  const [tickets,        setTickets]        = useState<Record<number, Ticket>>({});
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [modalTarget,    setModalTarget]    = useState<ModalTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, pending] = await Promise.all([
        getDraws({ page, limit: 20, category: category || undefined }),
        getPendingTickets(),
      ]);
      setData(res);
      setPendingTickets(pending);
      if (res.draws.length > 0) {
        const concursos = res.draws.map((d) => d.concurso);
        const list = await getTickets(concursos);
        const map: Record<number, Ticket> = {};
        for (const t of list) map[t.concurso] = t;
        setTickets((prev) => ({ ...prev, ...map }));
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { setPage(1); }, [category]);

  function handleSave(ticket: TicketInput) {
    saveTicket(ticket).then((saved) => {
      if (saved.matches !== null) {
        setTickets((prev) => ({ ...prev, [saved.concurso]: saved }));
        setPendingTickets((prev) => prev.filter((t) => t.concurso !== saved.concurso));
      } else {
        setPendingTickets((prev) => {
          const others = prev.filter((t) => t.concurso !== saved.concurso);
          return [saved, ...others].sort((a, b) => b.concurso - a.concurso);
        });
      }
    });
  }

  function ticketButton(draw: Draw) {
    const t = tickets[draw.concurso];
    if (!t) {
      return (
        <button
          onClick={() => setModalTarget({ kind: 'draw', draw })}
          className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          + My Ticket
        </button>
      );
    }
    return (
      <button
        onClick={() => setModalTarget({ kind: 'draw', draw })}
        className={`px-2 py-1 text-xs rounded-lg font-semibold border transition-colors whitespace-nowrap ${
          t.hasPrize
            ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
        }`}
      >
        ✅ {t.matches}/15
      </button>
    );
  }

  function pendingTicketButton(ticket: Ticket) {
    return (
      <button
        onClick={() => setModalTarget({ kind: 'pending-edit', ticket })}
        className="px-2 py-1 text-xs rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors whitespace-nowrap"
      >
        🕒 {ticket.numbers.length} números
      </button>
    );
  }

  const showPending = page === 1 && !category && pendingTickets.length > 0;
  const isEmpty = (data?.draws?.length ?? 0) === 0 && !showPending;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-base font-semibold text-slate-700">
          📋 Todos os Concursos
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalTarget({ kind: 'pending-new' })}
            className="text-sm px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            + Nova Aposta
          </button>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Todas as categorias</option>
            <option value="high-gravity">🔴 High-Gravity</option>
            <option value="mid-gravity">🔵 Mid-Gravity</option>
            <option value="small-gravity">🟢 Small-Gravity</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-left">
              {['Concurso', 'Data', 'Categoria', 'Números Sorteados', 'My Ticket'].map((h) => (
                <th key={h} className="px-4 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            ) : (
              <>
                {showPending && pendingTickets.map((ticket) => (
                  <tr
                    key={`pending-${ticket.concurso}`}
                    className="border-b border-slate-100 bg-amber-50/60 hover:bg-amber-50 transition-colors"
                  >
                    <td className="px-4 py-2 font-mono font-medium text-slate-600">
                      #{ticket.concurso}
                    </td>
                    <td className="px-4 py-2 text-slate-400 italic whitespace-nowrap">—</td>
                    <td className="px-4 py-2 text-slate-400 italic">—</td>
                    <td className="px-4 py-2 text-slate-400 italic">—</td>
                    <td className="px-4 py-2">
                      {pendingTicketButton(ticket)}
                    </td>
                  </tr>
                ))}
                {data?.draws?.map((draw, i) => (
                  <tr
                    key={draw.concurso}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-4 py-2 font-mono font-medium text-slate-600">
                      #{draw.concurso}
                    </td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {formatDate(draw.date)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_BADGE[draw.category]}`}>
                        {CAT_EMOJI[draw.category]} {draw.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600 tracking-wide">
                      {draw.numbers.map((n) => String(n).padStart(2, '0')).join(' · ')}
                    </td>
                    <td className="px-4 py-2">
                      {ticketButton(draw)}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>
            Mostrando {((page - 1) * 20) + 1}–{Math.min(page * 20, data.pagination.total)} de{' '}
            <strong>{data.pagination.total}</strong> concursos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="px-2 font-medium">{page} / {data.pagination.pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
              disabled={page === data.pagination.pages}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {modalTarget?.kind === 'draw' && (
        <TicketModal
          draw={modalTarget.draw}
          concurso={modalTarget.draw.concurso}
          concursoEditable={false}
          existingTicket={tickets[modalTarget.draw.concurso] ?? null}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
      {modalTarget?.kind === 'pending-edit' && (
        <TicketModal
          draw={null}
          concurso={modalTarget.ticket.concurso}
          concursoEditable={false}
          existingTicket={modalTarget.ticket}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
      {modalTarget?.kind === 'pending-new' && (
        <TicketModal
          draw={null}
          concurso={(latestConcurso ?? data?.draws?.[0]?.concurso ?? 0) + 1}
          concursoEditable={true}
          existingTicket={null}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual browser verification**

Start both dev servers if not already running:
```bash
cd backend && npm run dev
```
```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` in a browser and:
1. Scroll to "Todos os Concursos". Confirm the **"+ Nova Aposta"** button appears next to the category dropdown.
2. Click it. Confirm the modal opens with an editable "Concurso #" number input pre-filled with `latestConcurso + 1`, and "Aguardando resultado" instead of a date.
3. Pick 15 numbers, add a description, click "Salvar". Confirm the modal closes and a new row appears **pinned above** the normal rows, with `—` for Data/Categoria/Números Sorteados and a `🕒 15 números` button.
4. Click that button again. Confirm it reopens the modal in edit mode (concurso number is now static, not editable), with the same 15 numbers pre-selected and the description preserved. Change a couple of numbers and save; confirm the row updates.
5. Click "Buscar Novos Resultados" in the header. If it reports a new draw was added and that draw's concurso matches your pending ticket's concurso, confirm the placeholder row disappears and the concurso now shows up as a normal scored row further down, with the ticket button showing a real `✅ N/15` match count.
6. Select a category filter. Confirm the pending row disappears while the filter is active, and reappears when the filter is cleared (if still page 1).

If step 5's fetch reports "Already up to date," this only confirms the create/edit UI — the graduation path was already verified end-to-end in Task 5, Step 4.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/App.tsx frontend/src/components/ResultsTable.tsx
git commit -m "feat: add pending ticket rows and Nova Aposta button to Todos os Concursos"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1–2 cover the nullable data model; Task 3 covers the scoring extraction + auto-scoring; Task 4 covers pending ticket creation + the typo guard + the pending-list endpoint; Task 5 covers auto-scoring on fetch; Task 6–7 cover all frontend UI requirements from the spec (button, placeholder rows, editable concurso, category-filter hiding, graduation). All spec sections are represented.
- **Type consistency:** `TicketModal`'s `onSave` type (`(ticket: TicketInput) => void`) matches `ResultsTable`'s `handleSave(ticket: TicketInput)`. `ModalTarget` kinds (`draw`, `pending-edit`, `pending-new`) are used consistently in both the button handlers and the three `TicketModal` render blocks. `scorePendingTickets`'s parameter shape (`{ concurso, numbers }[]`) matches how it's called from `routes/draws.ts` (`newDraws.map(...)`).
- **No placeholders:** every step has complete, runnable code or exact commands with expected output.
