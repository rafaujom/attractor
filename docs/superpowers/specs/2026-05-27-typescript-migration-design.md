# TypeScript Migration Design

**Date:** 2026-05-27  
**Approach:** Big-bang rename (all 15 source files in one pass)  
**Strictness:** `strict: true` on both packages  
**Backend runner:** `tsx` (no compile step in dev)  
**Shared types:** `shared/types/index.ts` at repo root

---

## 1. Shared Types (`shared/types/index.ts`)

Single file, imported by both backend and frontend. No runtime code — type declarations only.

```
shared/
└── types/
    └── index.ts
```

**Exports:**

```ts
export type GravityCategory = 'high-gravity' | 'mid-gravity' | 'small-gravity';

export interface Draw {
  concurso: number;
  date: string;           // ISO string on the wire
  numbers: number[];
  min: number;
  max: number;
  category: GravityCategory;
  dateFormatted?: string; // virtual, present in toJSON
}

export interface MonthlyEntry {
  month: string;          // "YYYY-MM"
  label: string;          // "jan/26"
  total: number;
  highGravity: number;
  midGravity: number;
  smallGravity: number;
  special: number;
}

export interface StatsResponse {
  total: number;
  categories: Record<GravityCategory, number>;
  monthly: MonthlyEntry[];
  latestConcurso: number;
}

export interface DrawsResponse {
  draws: Draw[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DrawInput {
  concurso: number;
  date: Date;
  numbers: number[];
  min: number;
  max: number;
  category: GravityCategory;
}
```

Both `backend/tsconfig.json` and `frontend/tsconfig.json` map the alias `shared/*` → `../../shared/*` (or `../shared/*` depending on nesting). Vite config mirrors the alias for the frontend bundler.

---

## 2. Backend

### 2.1 Dependencies

Added to `devDependencies`:

| Package | Purpose |
|---|---|
| `typescript` | Compiler |
| `tsx` | Dev/script runner (replaces `nodemon` + `node`) |
| `@types/node` | Node.js types |
| `@types/express` | Express types |
| `@types/cors` | cors middleware types |

Mongoose 8+ ships its own types — no `@types/mongoose` needed.  
Axios and Cheerio ship their own types — no `@types/*` needed.

### 2.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "paths": { "shared/*": ["../shared/*"] }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.3 Script changes (`package.json`)

```json
"scripts": {
  "dev":   "tsx watch server.ts",
  "start": "node dist/server.js",
  "build": "tsc",
  "seed":  "tsx services/seeder.ts"
}
```

### 2.4 File-by-file changes

**`server.ts`**
- Type `process.env.MONGODB_URI` as `string` (throw at startup if missing, avoiding `string | undefined` throughout)
- No other structural changes

**`models/Draw.ts`**
- Add `IDrawDocument` interface extending `mongoose.Document` with all schema fields
- Export it alongside the model for use in route handlers

**`routes/draws.ts`**
- `req.query` params cast from `string | string[] | ParsedQs` to `string` via `String(req.query.x)` or `as string`
- Aggregation results typed with inline interfaces (category count rows, monthly rows)
- Return types on async handlers inferred by Express generics

**`services/classifier.ts`**
- Return type: `{ category: GravityCategory; min: number; max: number }`
- Parameter: `numbers: number[]`

**`services/scraper.ts`**
- `fetchYear(year: number): Promise<DrawInput[]>`
- `fetchLatest(afterConcurso?: number): Promise<DrawInput[]>`
- Import `DrawInput` from shared types

**`services/seeder.ts`**
- Minimal changes — top-level await already works with `module: NodeNext`

---

## 3. Frontend

### 3.1 Dependencies

Added to `devDependencies`:

| Package | Purpose |
|---|---|
| `typescript` | Compiler (Vite invokes it for type-checking) |

`@types/react` and `@types/react-dom` are already present.

### 3.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": { "shared/*": ["../shared/*"] }
  },
  "include": ["src"]
}
```

### 3.3 `vite.config.ts`

Add `resolve.alias` to match the `shared/*` path:

```ts
resolve: {
  alias: { shared: path.resolve(__dirname, '../shared') }
}
```

### 3.4 File-by-file changes

**`services/api.ts`**
- `getStats(): Promise<StatsResponse>`
- `getDraws(params?: Record<string, unknown>): Promise<DrawsResponse>`
- `fetchLatest(): Promise<{ inserted: number; modified: number; message: string }>`

**`App.tsx`**
- `useState<StatsResponse | null>(null)`
- Error state: `useState<string | null>(null)`

**Component props** (each component gets an explicit `Props` interface):

| Component | Props |
|---|---|
| `Header` | `{ onRefresh: () => void }` |
| `StatsCards` | `{ stats: StatsResponse \| null; loading: boolean }` |
| `GravityPieChart` | `{ stats: StatsResponse \| null; loading: boolean }` |
| `MonthlyBarChart` | `{ stats: StatsResponse \| null; loading: boolean }` |
| `MonthlyBreakdown` | `{ stats: StatsResponse \| null; loading: boolean }` |
| `ResultsTable` | `{ onDataChange: () => void }` |

Recharts data arrays typed as `MonthlyEntry[]` from shared types.

---

## 4. What is NOT changing

- No logic changes — pure type annotation pass
- No file moves or restructuring beyond the `shared/` folder addition
- No tests added (project has none)
- No linter added (project has none)
- `.env` and `MONGODB_URI` handling unchanged in substance
- The `.js` import extensions in ESM imports become `.js` pointing to `.ts` source (Node + `tsx` resolve `.ts` when extensions say `.js` under `NodeNext`)

---

## 5. Verification

After migration, the following must pass without errors:

```bash
# Backend
cd backend && npx tsc --noEmit

# Frontend
cd frontend && npx tsc --noEmit
```

Both servers must still start and serve data correctly.
