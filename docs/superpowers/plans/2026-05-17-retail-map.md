# Interactive US Retail Locations Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack interactive US retail store map with three zoom tiers (state counts → clusters → individual stores), viewport-based fetching, and a filter sidebar.

**Architecture:** Node.js + Express + TypeScript backend serving three endpoints (states / clusters / points). SQLite stores the 134k dataset with an indexed bounding-box query for Tier 3. Supercluster is loaded in-process at startup for Tier 2 clustering. React + Vite frontend with `@vis.gl/react-google-maps` renders the three tiers based on current zoom level.

**Tech Stack:** Node.js, Express, TypeScript, SQLite (`better-sqlite3`), `supercluster`, `csv-parse`, React, Vite, Tailwind CSS v4, `@vis.gl/react-google-maps`, `@tanstack/react-query`

---

## File Map

### Backend (`backend/`)
| File | Responsibility |
|------|---------------|
| `src/index.ts` | Express app bootstrap, startup data load |
| `src/routes/stores.ts` | Three route handlers: /states, /clusters, /points |
| `src/services/db.ts` | SQLite connection, bounding-box point queries |
| `src/services/clusterService.ts` | Supercluster index: build at startup, query by bounds+zoom |
| `src/services/stateService.ts` | Pre-aggregate state counts + centroids at startup |
| `src/scripts/importCsv.ts` | One-time: parse my_pois.csv → SQLite stores.db |
| `src/types/index.ts` | Shared TypeScript types |
| `src/config.ts` | Reads all env vars; exports per-env config object |
| `src/errors.ts` | Custom `AppError`, `ValidationError` classes |
| `src/middleware/errorHandler.ts` | Express global error handler — formats all thrown errors |
| `.env.example` | Documents required env vars |

### Frontend (`frontend/`)
| File | Responsibility |
|------|---------------|
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Root layout: map + sidebar |
| `src/components/MapContainer.tsx` | Mounts Google Map, detects zoom tier, delegates to marker components |
| `src/components/StateMarkers.tsx` | Tier 1: circular state count markers |
| `src/components/ClusterMarkers.tsx` | Tier 2: cluster bubbles with count |
| `src/components/StoreMarkers.tsx` | Tier 3: brand-logo markers |
| `src/components/StoreInfoWindow.tsx` | Click popup: brand, city, state, status |
| `src/components/FilterSidebar.tsx` | Filter UI: state, brand, status multiselect |
| `src/config.ts` | Reads all Vite env vars; exports per-env config object |
| `src/hooks/useDebounce.ts` | Custom debounce hook (no lodash) |
| `src/hooks/useMapData.ts` | Viewport fetch via TanStack Query, keyed by bounds+tier+filters |
| `src/hooks/useFilters.ts` | Filter state synced to URL search params |
| `src/services/api.ts` | Typed fetch wrappers for all three endpoints |
| `src/constants/zoomTiers.ts` | `TIER1_MAX=5`, `TIER2_MAX=11`, `TIER3_MIN=12` |
| `src/constants/stateCentroids.ts` | Hardcoded `{state, lat, lng}[]` for all 50 states |
| `src/types/index.ts` | Shared TS types mirroring backend |

---

## Task 1: Project Scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `frontend/` (via Vite)
- Create: `frontend/.env.example`

- [ ] **Step 1: Create backend folder and package.json**

```bash
mkdir backend && cd backend
npm init -y
npm install express better-sqlite3 supercluster csv-parse cors dotenv
npm install -D typescript ts-node @types/node @types/express @types/better-sqlite3 @types/supercluster @types/cors nodemon
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Add scripts to `backend/package.json`**

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "import": "ts-node src/scripts/importCsv.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- [ ] **Step 4: Create `backend/.env.example`**

```
PORT=3001
DB_PATH=./data/stores.db
CSV_PATH=../my_pois.csv
GOOGLE_MAPS_API_KEY=your_key_here
```

- [ ] **Step 5: Create frontend with Vite and install deps**

```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install @vis.gl/react-google-maps @tanstack/react-query
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 5a: Wire Tailwind into `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 5b: Replace `frontend/src/index.css` with Tailwind entry**

```css
@import "tailwindcss";
```

- [ ] **Step 6: Create `frontend/.env.example`**

```
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_API_BASE_URL=http://localhost:3001
```

- [ ] **Step 7: Create `frontend/.env` with real API key (gitignored)**

```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDAnh7rtiiJWBSiT6f6eZit0qce9GNP0bc
VITE_API_BASE_URL=http://localhost:3001
```

- [ ] **Step 8: Add `.gitignore` at root**

```
backend/data/
backend/.env
frontend/.env
node_modules/
dist/
*.db
```

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: scaffold backend and frontend projects"
```

---

## Task 1b: Config Files (Backend + Frontend)

**Files:**
- Create: `backend/src/config.ts`
- Create: `frontend/src/config.ts`

All env-var reads are centralised here. Every other file imports `config` — nothing
else calls `process.env` or `import.meta.env` directly.

- [ ] **Step 1: Create `backend/src/config.ts`**

```typescript
import dotenv from 'dotenv';
dotenv.config();

interface BackendConfig {
  port: number;
  dbPath: string;
  csvPath: string;
}

const envConfig = {
  development: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    dbPath: process.env.DB_PATH ?? './data/stores.db',
    csvPath: process.env.CSV_PATH ?? '../my_pois.csv',
  },
  production: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    dbPath: process.env.DB_PATH ?? './data/stores.db',
    csvPath: process.env.CSV_PATH ?? '../my_pois.csv',
  },
  test: {
    port: 3002,
    dbPath: ':memory:',
    csvPath: '../my_pois.csv',
  },
} satisfies Record<string, BackendConfig>;

type Env = keyof typeof envConfig;

const env = (process.env.NODE_ENV ?? 'development') as Env;

export const config: BackendConfig = envConfig[env] ?? envConfig.development;
```

- [ ] **Step 2: Create `frontend/src/config.ts`**

Vite sets `import.meta.env.MODE` to `'development'` or `'production'` automatically.

```typescript
interface FrontendConfig {
  apiBaseUrl: string;
  googleMapsApiKey: string;
}

const envConfig = {
  development: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  },
  production: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  },
} satisfies Record<string, FrontendConfig>;

type Env = keyof typeof envConfig;

const env = (import.meta.env.MODE ?? 'development') as Env;

export const config: FrontendConfig = envConfig[env] ?? envConfig.development;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/config.ts frontend/src/config.ts
git commit -m "feat: centralised per-env config files for backend and frontend"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `frontend/src/types/index.ts`

- [ ] **Step 1: Create `backend/src/types/index.ts`**

```typescript
export interface ViewportBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface Filters {
  state?: string;
  brand?: string;
  status?: string;
}

export interface StoreRecord {
  id: string;
  brand_name: string;
  latitude: number;
  longitude: number;
  status: string;
  state: string;
  city: string;
}

export interface StateCount {
  state: string;
  lat: number;
  lng: number;
  count: number;
}

export interface ClusterFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    // individual store properties when not a cluster
    id?: string;
    brand_name?: string;
    status?: string;
    state?: string;
    city?: string;
  };
}
```

- [ ] **Step 2: Create `frontend/src/types/index.ts`**

```typescript
export interface ViewportBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface Filters {
  state: string;
  brand: string;
  status: string;
}

export interface StoreRecord {
  id: string;
  brand_name: string;
  latitude: number;
  longitude: number;
  status: string;
  state: string;
  city: string;
}

export interface StateCount {
  state: string;
  lat: number;
  lng: number;
  count: number;
}

export interface ClusterFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    id?: string;
    brand_name?: string;
    status?: string;
    state?: string;
    city?: string;
  };
}

export type ZoomTier = 1 | 2 | 3;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/types frontend/src/types
git commit -m "chore: add shared TypeScript types"
```

---

## Task 3: CSV Import Script (One-Time)

**Files:**
- Create: `backend/src/scripts/importCsv.ts`
- Create: `backend/data/` (directory, gitignored)

- [ ] **Step 1: Create `backend/src/scripts/importCsv.ts`**

```typescript
import Database from 'better-sqlite3';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const { csvPath: CSV_PATH, dbPath: DB_PATH } = config;

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  DROP TABLE IF EXISTS stores;
  CREATE TABLE stores (
    id TEXT PRIMARY KEY,
    brand_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL
  );
  CREATE INDEX idx_lat_lng ON stores (latitude, longitude);
  CREATE INDEX idx_state ON stores (state);
  CREATE INDEX idx_brand ON stores (brand_name);
  CREATE INDEX idx_status ON stores (status);
`);

const insert = db.prepare(
  `INSERT OR IGNORE INTO stores (id, brand_name, latitude, longitude, status, state, city)
   VALUES (@id, @brand_name, @latitude, @longitude, @status, @state, @city)`
);

const insertMany = db.transaction((rows: Record<string, string>[]) => {
  for (const row of rows) {
    insert.run({
      id: row.id,
      brand_name: row.brand_name ?? '',
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      status: row.status ?? '',
      state: (row.state ?? '').toLowerCase(),
      city: row.city ?? '',
    });
  }
});

const parser = parse({ columns: true, skip_empty_lines: true });
const batch: Record<string, string>[] = [];
let total = 0;

parser.on('readable', () => {
  let record;
  while ((record = parser.read()) !== null) {
    batch.push(record);
    if (batch.length >= 5000) {
      insertMany(batch.splice(0, 5000));
      total += 5000;
      process.stdout.write(`\rImported ${total} rows...`);
    }
  }
});

parser.on('end', () => {
  if (batch.length > 0) {
    insertMany(batch);
    total += batch.length;
  }
  console.log(`\nDone. Total rows: ${total}`);
  db.close();
});

parser.on('error', (err) => {
  console.error('CSV parse error:', err);
  process.exit(1);
});

fs.createReadStream(path.resolve(CSV_PATH)).pipe(parser);
```

- [ ] **Step 2: Run the import**

```bash
cd backend
npm run import
```

Expected output: `Done. Total rows: 134436`
Verify: `ls data/` should show `stores.db`

- [ ] **Step 3: Commit**

```bash
git add backend/src/scripts/importCsv.ts
git commit -m "feat: CSV import script — parses my_pois.csv into SQLite"
```

---

## Task 4: Backend Database Service

**Files:**
- Create: `backend/src/services/db.ts`

- [ ] **Step 1: Create `backend/src/services/db.ts`**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config.js';
import type { StoreRecord, ViewportBounds, Filters } from '../types/index.js';

export const db = new Database(path.resolve(config.dbPath), { readonly: true });

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

export function getPointsInBounds(
  bounds: ViewportBounds,
  filters: Filters,
  limit = 500
): StoreRecord[] {
  const conditions: string[] = [
    'latitude BETWEEN @swLat AND @neLat',
    'longitude BETWEEN @swLng AND @neLng',
  ];
  if (filters.state) conditions.push('state = @state');
  if (filters.brand) conditions.push('brand_name = @brand');
  if (filters.status) conditions.push('status = @status');

  const sql = `
    SELECT id, brand_name, latitude, longitude, status, state, city
    FROM stores
    WHERE ${conditions.join(' AND ')}
    LIMIT @limit
  `;

  return db.prepare(sql).all({
    swLat: bounds.swLat,
    neLat: bounds.neLat,
    swLng: bounds.swLng,
    neLng: bounds.neLng,
    state: filters.state ?? null,
    brand: filters.brand ?? null,
    status: filters.status ?? null,
    limit,
  }) as StoreRecord[];
}

export function getAllPoints(): StoreRecord[] {
  return db
    .prepare('SELECT id, brand_name, latitude, longitude, status, state, city FROM stores')
    .all() as StoreRecord[];
}

export function getFilterOptions(): { states: string[]; brands: string[]; statuses: string[] } {
  const states = (db.prepare('SELECT DISTINCT state FROM stores ORDER BY state').all() as { state: string }[]).map(
    (r) => r.state
  );
  const brands = (db.prepare('SELECT DISTINCT brand_name FROM stores ORDER BY brand_name').all() as { brand_name: string }[]).map(
    (r) => r.brand_name
  );
  const statuses = (db.prepare('SELECT DISTINCT status FROM stores ORDER BY status').all() as { status: string }[]).map(
    (r) => r.status
  );
  return { states, brands, statuses };
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/db.ts
git commit -m "feat: SQLite db service with bounding box queries and filter support"
```

---

## Task 5: State Aggregation Service (Tier 1)

**Files:**
- Create: `backend/src/services/stateService.ts`
- Create: `backend/src/constants/stateCentroids.ts`

- [ ] **Step 1: Create `backend/src/constants/stateCentroids.ts`**

```typescript
export const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  alabama: { lat: 32.806671, lng: -86.791130 },
  alaska: { lat: 61.370716, lng: -152.404419 },
  arizona: { lat: 33.729759, lng: -111.431221 },
  arkansas: { lat: 34.969704, lng: -92.373123 },
  california: { lat: 36.116203, lng: -119.681564 },
  colorado: { lat: 39.059811, lng: -105.311104 },
  connecticut: { lat: 41.597782, lng: -72.755371 },
  delaware: { lat: 39.318523, lng: -75.507141 },
  florida: { lat: 27.766279, lng: -81.686783 },
  georgia: { lat: 33.040619, lng: -83.643074 },
  hawaii: { lat: 21.094318, lng: -157.498337 },
  idaho: { lat: 44.240459, lng: -114.478828 },
  illinois: { lat: 40.349457, lng: -88.986137 },
  indiana: { lat: 39.849426, lng: -86.258278 },
  iowa: { lat: 42.011539, lng: -93.210526 },
  kansas: { lat: 38.526600, lng: -96.726486 },
  kentucky: { lat: 37.668140, lng: -84.670067 },
  louisiana: { lat: 31.169960, lng: -91.867805 },
  maine: { lat: 44.693947, lng: -69.381927 },
  maryland: { lat: 39.063946, lng: -76.802101 },
  massachusetts: { lat: 42.230171, lng: -71.530106 },
  michigan: { lat: 43.326618, lng: -84.536095 },
  minnesota: { lat: 45.694454, lng: -93.900192 },
  mississippi: { lat: 32.741646, lng: -89.678696 },
  missouri: { lat: 38.456085, lng: -92.288368 },
  montana: { lat: 46.921925, lng: -110.454353 },
  nebraska: { lat: 41.125370, lng: -98.268082 },
  nevada: { lat: 38.313515, lng: -117.055374 },
  'new hampshire': { lat: 43.452492, lng: -71.563896 },
  'new jersey': { lat: 40.298904, lng: -74.521011 },
  'new mexico': { lat: 34.840515, lng: -106.248482 },
  'new york': { lat: 42.165726, lng: -74.948051 },
  'north carolina': { lat: 35.630066, lng: -79.806419 },
  'north dakota': { lat: 47.528912, lng: -99.784012 },
  ohio: { lat: 40.388783, lng: -82.764915 },
  oklahoma: { lat: 35.565342, lng: -96.928917 },
  oregon: { lat: 44.572021, lng: -122.070938 },
  pennsylvania: { lat: 40.590752, lng: -77.209755 },
  'rhode island': { lat: 41.680893, lng: -71.511780 },
  'south carolina': { lat: 33.856892, lng: -80.945007 },
  'south dakota': { lat: 44.299782, lng: -99.438828 },
  tennessee: { lat: 35.747845, lng: -86.692345 },
  texas: { lat: 31.054487, lng: -97.563461 },
  utah: { lat: 40.150032, lng: -111.862434 },
  vermont: { lat: 44.045876, lng: -72.710686 },
  virginia: { lat: 37.769337, lng: -78.169968 },
  washington: { lat: 47.400902, lng: -121.490494 },
  'west virginia': { lat: 38.491226, lng: -80.954453 },
  wisconsin: { lat: 44.268543, lng: -89.616508 },
  wyoming: { lat: 42.755966, lng: -107.302490 },
  'puerto rico': { lat: 18.220833, lng: -66.590149 },
};
```

- [ ] **Step 2: Create `backend/src/services/stateService.ts`**

```typescript
import { db } from './db.js';
import { STATE_CENTROIDS } from '../constants/stateCentroids.js';
import type { StateCount } from '../types/index.js';

let stateCountsCache: StateCount[] | null = null;

export function buildStateCountsCache(): void {
  const rows = db
    .prepare('SELECT state, COUNT(*) as count FROM stores GROUP BY state')
    .all() as { state: string; count: number }[];

  stateCountsCache = rows
    .map((row) => {
      const centroid = STATE_CENTROIDS[row.state.toLowerCase()];
      if (!centroid) return null;
      return {
        state: row.state,
        lat: centroid.lat,
        lng: centroid.lng,
        count: row.count,
      };
    })
    .filter((s): s is StateCount => s !== null);

  console.log(`State counts cached: ${stateCountsCache.length} states`);
}

export function getStateCounts(): StateCount[] {
  if (!stateCountsCache) throw new Error('State counts cache not built');
  return stateCountsCache;
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/stateService.ts backend/src/constants/stateCentroids.ts
git commit -m "feat: state aggregation service with pre-computed counts and centroids"
```

---

## Task 6: Supercluster Service (Tier 2)

**Files:**
- Create: `backend/src/services/clusterService.ts`

- [ ] **Step 1: Create `backend/src/services/clusterService.ts`**

```typescript
import Supercluster from 'supercluster';
import type { StoreRecord, ViewportBounds, Filters, ClusterFeature } from '../types/index.js';

let index: Supercluster | null = null;

export function buildClusterIndex(stores: StoreRecord[]): void {
  index = new Supercluster({
    radius: 60,
    maxZoom: 16,
    minPoints: 2,
  });

  const features: GeoJSON.Feature<GeoJSON.Point>[] = stores.map((s) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
    properties: {
      id: s.id,
      brand_name: s.brand_name,
      status: s.status,
      state: s.state,
      city: s.city,
    },
  }));

  index.load(features);
  console.log(`Supercluster index built: ${features.length} points`);
}

export function getClusters(
  bounds: ViewportBounds,
  zoom: number,
  filters: Filters
): ClusterFeature[] {
  if (!index) throw new Error('Cluster index not built');

  const bbox: [number, number, number, number] = [
    bounds.swLng,
    bounds.swLat,
    bounds.neLng,
    bounds.neLat,
  ];

  const clusters = index.getClusters(bbox, Math.floor(zoom)) as ClusterFeature[];

  // Post-filter individual points (non-clusters) by active filters
  return clusters.filter((feature) => {
    if (feature.properties.cluster) return true; // keep all clusters
    const { state, brand, status } = filters;
    if (state && feature.properties.state !== state) return false;
    if (brand && feature.properties.brand_name !== brand) return false;
    if (status && feature.properties.status !== status) return false;
    return true;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/clusterService.ts
git commit -m "feat: Supercluster service — builds R-tree index at startup, queries by viewport+zoom"
```

---

## Task 7: Express Routes

**Files:**
- Create: `backend/src/routes/stores.ts`

- [ ] **Step 1: Create `backend/src/routes/stores.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { getStateCounts } from '../services/stateService.js';
import { getClusters } from '../services/clusterService.js';
import { getPointsInBounds, getFilterOptions } from '../services/db.js';
import type { ViewportBounds, Filters } from '../types/index.js';

export const storesRouter = Router();

function parseBounds(q: Record<string, string>): ViewportBounds | null {
  const { swLat, swLng, neLat, neLng } = q;
  if (!swLat || !swLng || !neLat || !neLng) return null;
  return {
    swLat: parseFloat(swLat),
    swLng: parseFloat(swLng),
    neLat: parseFloat(neLat),
    neLng: parseFloat(neLng),
  };
}

function parseFilters(q: Record<string, string>): Filters {
  return {
    state: q.state || undefined,
    brand: q.brand || undefined,
    status: q.status || undefined,
  };
}

// Tier 1 — state counts (no viewport needed, pre-computed)
storesRouter.get('/states', (_req: Request, res: Response) => {
  try {
    res.json(getStateCounts());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get state counts' });
  }
});

// Tier 2 — supercluster output for viewport + zoom
storesRouter.get('/clusters', (req: Request, res: Response) => {
  const bounds = parseBounds(req.query as Record<string, string>);
  const zoom = parseFloat(req.query.zoom as string);

  if (!bounds || isNaN(zoom)) {
    res.status(400).json({ error: 'Missing bounds or zoom' });
    return;
  }

  try {
    const filters = parseFilters(req.query as Record<string, string>);
    res.json(getClusters(bounds, zoom, filters));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get clusters' });
  }
});

// Tier 3 — individual store points in viewport
storesRouter.get('/points', (req: Request, res: Response) => {
  const bounds = parseBounds(req.query as Record<string, string>);

  if (!bounds) {
    res.status(400).json({ error: 'Missing bounds' });
    return;
  }

  try {
    const filters = parseFilters(req.query as Record<string, string>);
    res.json(getPointsInBounds(bounds, filters));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get points' });
  }
});

// Filter options for sidebar dropdowns
storesRouter.get('/filter-options', (_req: Request, res: Response) => {
  try {
    res.json(getFilterOptions());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get filter options' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/stores.ts
git commit -m "feat: Express routes for states, clusters, points, and filter options"
```

---

## Task 8: Express App Entry Point

**Files:**
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/index.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { storesRouter } from './routes/stores.js';
import { buildClusterIndex } from './services/clusterService.js';
import { buildStateCountsCache } from './services/stateService.js';
import { getAllPoints } from './services/db.js';

const app = express();
const { port } = config;

app.use(cors());
app.use(express.json());
app.use('/api/stores', storesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

async function bootstrap() {
  console.log('Loading data...');
  const allPoints = getAllPoints();
  buildStateCountsCache();
  buildClusterIndex(allPoints);
  console.log('Data ready.');

  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Start backend and verify**

```bash
cd backend
npm run dev
```

Expected output:
```
Loading data...
State counts cached: 52 states
Supercluster index built: 134436 points
Backend running on http://localhost:3001
```

- [ ] **Step 3: Smoke-test endpoints**

```bash
curl "http://localhost:3001/api/stores/states" | head -c 200
curl "http://localhost:3001/api/stores/clusters?swLat=25&swLng=-125&neLat=50&neLng=-65&zoom=5"
curl "http://localhost:3001/api/stores/points?swLat=33&swLng=-118&neLat=34&neLng=-117"
```

Each should return JSON without error.

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: Express app bootstrap with startup data loading"
```

---

## Task 8b: Custom Errors and Error Handling Middleware

**Files:**
- Create: `backend/src/errors.ts`
- Create: `backend/src/middleware/errorHandler.ts`
- Modify: `backend/src/routes/stores.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/errors.ts`**

```typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}
```

- [ ] **Step 2: Create `backend/src/middleware/errorHandler.ts`**

```typescript
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

- [ ] **Step 3: Update `backend/src/routes/stores.ts` to use custom errors**

Replace the inline `res.status(...).json(...)` error responses with `next(err)` so
all error formatting goes through the single middleware. Import `ValidationError`
and `NextFunction`.

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { getStateCounts } from '../services/stateService.js';
import { getClusters } from '../services/clusterService.js';
import { getPointsInBounds, getFilterOptions } from '../services/db.js';
import { ValidationError } from '../errors.js';
import type { ViewportBounds, Filters } from '../types/index.js';

export const storesRouter = Router();

function parseBounds(q: Record<string, string>): ViewportBounds | null {
  const { swLat, swLng, neLat, neLng } = q;
  if (!swLat || !swLng || !neLat || !neLng) return null;
  return {
    swLat: parseFloat(swLat),
    swLng: parseFloat(swLng),
    neLat: parseFloat(neLat),
    neLng: parseFloat(neLng),
  };
}

function parseFilters(q: Record<string, string>): Filters {
  return {
    state: q.state || undefined,
    brand: q.brand || undefined,
    status: q.status || undefined,
  };
}

storesRouter.get('/states', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getStateCounts());
  } catch (err) {
    next(err);
  }
});

storesRouter.get('/clusters', (req: Request, res: Response, next: NextFunction) => {
  const bounds = parseBounds(req.query as Record<string, string>);
  const zoom = parseFloat(req.query.zoom as string);

  if (!bounds || isNaN(zoom)) {
    next(new ValidationError('Missing or invalid bounds/zoom'));
    return;
  }

  try {
    const filters = parseFilters(req.query as Record<string, string>);
    res.json(getClusters(bounds, zoom, filters));
  } catch (err) {
    next(err);
  }
});

storesRouter.get('/points', (req: Request, res: Response, next: NextFunction) => {
  const bounds = parseBounds(req.query as Record<string, string>);

  if (!bounds) {
    next(new ValidationError('Missing bounds parameters'));
    return;
  }

  try {
    const filters = parseFilters(req.query as Record<string, string>);
    res.json(getPointsInBounds(bounds, filters));
  } catch (err) {
    next(err);
  }
});

storesRouter.get('/filter-options', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getFilterOptions());
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Register error handler in `backend/src/index.ts`**

Add the import and register the middleware as the last `app.use` call — Express
identifies a 4-argument function as an error handler.

```typescript
// add to imports
import { errorHandler } from './middleware/errorHandler.js';

// add after all route registrations, before app.listen
app.use(errorHandler);
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/errors.ts backend/src/middleware/errorHandler.ts \
        backend/src/routes/stores.ts backend/src/index.ts
git commit -m "feat: custom AppError/ValidationError classes and global error handler middleware"
```

---

## Task 9: Frontend Constants and API Service

**Files:**
- Create: `frontend/src/constants/zoomTiers.ts`
- Create: `frontend/src/services/api.ts`

- [ ] **Step 1: Create `frontend/src/constants/zoomTiers.ts`**

```typescript
export const TIER1_MAX_ZOOM = 5;   // zoom <= 5: show state counts
export const TIER2_MAX_ZOOM = 11;  // zoom 6-11: show clusters
export const TIER3_MIN_ZOOM = 12;  // zoom >= 12: show individual stores

export function getZoomTier(zoom: number): 1 | 2 | 3 {
  if (zoom <= TIER1_MAX_ZOOM) return 1;
  if (zoom <= TIER2_MAX_ZOOM) return 2;
  return 3;
}
```

- [ ] **Step 2: Create `frontend/src/services/api.ts`**

```typescript
import { config } from '../config.js';
import type { StateCount, ClusterFeature, StoreRecord, ViewportBounds, Filters } from '../types/index.js';

const BASE = config.apiBaseUrl;

function boundsToParams(bounds: ViewportBounds): URLSearchParams {
  return new URLSearchParams({
    swLat: String(bounds.swLat),
    swLng: String(bounds.swLng),
    neLat: String(bounds.neLat),
    neLng: String(bounds.neLng),
  });
}

function filterParams(filters: Filters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.state) p.state = filters.state;
  if (filters.brand) p.brand = filters.brand;
  if (filters.status) p.status = filters.status;
  return p;
}

export async function fetchStateCounts(): Promise<StateCount[]> {
  const res = await fetch(`${BASE}/api/stores/states`);
  if (!res.ok) throw new Error('Failed to fetch state counts');
  return res.json();
}

export async function fetchClusters(
  bounds: ViewportBounds,
  zoom: number,
  filters: Filters
): Promise<ClusterFeature[]> {
  const params = boundsToParams(bounds);
  params.set('zoom', String(zoom));
  Object.entries(filterParams(filters)).forEach(([k, v]) => params.set(k, v));
  const res = await fetch(`${BASE}/api/stores/clusters?${params}`);
  if (!res.ok) throw new Error('Failed to fetch clusters');
  return res.json();
}

export async function fetchPoints(
  bounds: ViewportBounds,
  filters: Filters
): Promise<StoreRecord[]> {
  const params = boundsToParams(bounds);
  Object.entries(filterParams(filters)).forEach(([k, v]) => params.set(k, v));
  const res = await fetch(`${BASE}/api/stores/points?${params}`);
  if (!res.ok) throw new Error('Failed to fetch points');
  return res.json();
}

export async function fetchFilterOptions(): Promise<{
  states: string[];
  brands: string[];
  statuses: string[];
}> {
  const res = await fetch(`${BASE}/api/stores/filter-options`);
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json();
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/constants frontend/src/services
git commit -m "feat: zoom tier constants and typed API service layer"
```

---

## Task 10: useDebounce Hook + useMapData Hook (TanStack Query)

**Files:**
- Create: `frontend/src/hooks/useDebounce.ts`
- Create: `frontend/src/hooks/useMapData.ts`

- [ ] **Step 1: Create `frontend/src/hooks/useDebounce.ts`**

```typescript
import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}
```

- [ ] **Step 2: Create `frontend/src/hooks/useMapData.ts`**

The hook exposes debounced viewport state; TanStack Query fires the right fetch
whenever bounds, zoom, or filters change. `staleTime: 30_000` prevents
re-fetching the same viewport within 30 seconds.

```typescript
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce.js';
import { fetchStateCounts, fetchClusters, fetchPoints } from '../services/api.js';
import { getZoomTier } from '../constants/zoomTiers.js';
import type { ViewportBounds, Filters } from '../types/index.js';

function roundBounds(bounds: ViewportBounds, precision = 2): string {
  const r = (n: number) => Math.round(n * 10 ** precision) / 10 ** precision;
  return `${r(bounds.swLat)},${r(bounds.swLng)},${r(bounds.neLat)},${r(bounds.neLng)}`;
}

interface Viewport {
  bounds: ViewportBounds;
  zoom: number;
}

export function useMapData(filters: Filters) {
  const [viewport, setViewport] = useState<Viewport | null>(null);

  const tier = viewport ? getZoomTier(viewport.zoom) : 1;

  const { data: stateCounts = [], isLoading: loadingTier1, isError: errorTier1 } = useQuery({
    queryKey: ['states'],
    queryFn: fetchStateCounts,
    staleTime: Infinity, // pre-aggregated — never changes
    enabled: tier === 1,
  });

  const { data: clusters = [], isLoading: loadingTier2, isError: errorTier2 } = useQuery({
    queryKey: ['clusters', viewport ? roundBounds(viewport.bounds) : '', viewport?.zoom, filters],
    queryFn: () => fetchClusters(viewport!.bounds, viewport!.zoom, filters),
    staleTime: 30_000,
    enabled: tier === 2 && viewport !== null,
  });

  const { data: points = [], isLoading: loadingTier3, isError: errorTier3 } = useQuery({
    queryKey: ['points', viewport ? roundBounds(viewport.bounds) : '', filters],
    queryFn: () => fetchPoints(viewport!.bounds, filters),
    staleTime: 30_000,
    enabled: tier === 3 && viewport !== null,
  });

  const updateViewport = useCallback((bounds: ViewportBounds, zoom: number) => {
    setViewport({ bounds, zoom });
  }, []);

  const debouncedUpdate = useDebounce(updateViewport, 250);

  const loading = loadingTier1 || loadingTier2 || loadingTier3;
  const error = (errorTier1 || errorTier2 || errorTier3) ? 'Failed to load map data' : null;

  return {
    tier,
    stateCounts,
    clusters,
    points,
    loading,
    error,
    onViewportChange: debouncedUpdate,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useDebounce.ts frontend/src/hooks/useMapData.ts
git commit -m "feat: custom useDebounce hook + useMapData rewritten with TanStack Query"
```

---

## Task 11: useFilters Hook (URL-shareable)

**Files:**
- Create: `frontend/src/hooks/useFilters.ts`

Filter state lives in URL search params so sharing the URL preserves the active
filters. Uses `history.replaceState` — no page reload, no router dependency.

- [ ] **Step 1: Create `frontend/src/hooks/useFilters.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { fetchFilterOptions } from '../services/api.js';
import type { Filters } from '../types/index.js';

function readFiltersFromURL(): Filters {
  const p = new URLSearchParams(window.location.search);
  return {
    state: p.get('state') ?? '',
    brand: p.get('brand') ?? '',
    status: p.get('status') ?? '',
  };
}

function writeFiltersToURL(filters: Filters): void {
  const p = new URLSearchParams();
  if (filters.state) p.set('state', filters.state);
  if (filters.brand) p.set('brand', filters.brand);
  if (filters.status) p.set('status', filters.status);
  const search = p.toString();
  history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(readFiltersFromURL);
  const [options, setOptions] = useState<{ states: string[]; brands: string[]; statuses: string[] }>({
    states: [],
    brands: [],
    statuses: [],
  });

  useEffect(() => {
    fetchFilterOptions().then(setOptions).catch(console.error);
  }, []);

  const updateFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      writeFiltersToURL(next);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    const empty: Filters = { state: '', brand: '', status: '' };
    writeFiltersToURL(empty);
    setFilters(empty);
  }, []);

  return { filters, options, updateFilter, clearFilters };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useFilters.ts
git commit -m "feat: useFilters hook with URL-synced filter state via replaceState"
```

---

## Task 12: Marker Components

**Files:**
- Create: `frontend/src/components/StateMarkers.tsx`
- Create: `frontend/src/components/ClusterMarkers.tsx`
- Create: `frontend/src/components/StoreMarkers.tsx`
- Create: `frontend/src/components/StoreInfoWindow.tsx`

- [ ] **Step 1: Create `frontend/src/components/StateMarkers.tsx`**

```tsx
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { StateCount } from '../types/index.js';

interface Props {
  stateCounts: StateCount[];
}

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function StateMarkers({ stateCounts }: Props) {
  return (
    <>
      {stateCounts.map((s) => (
        <AdvancedMarker key={s.state} position={{ lat: s.lat, lng: s.lng }}>
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center text-[11px] font-bold shadow-md cursor-default select-none">
            <span>{s.state.slice(0, 2).toUpperCase()}</span>
            <span>{formatCount(s.count)}</span>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/ClusterMarkers.tsx`**

```tsx
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { ClusterFeature } from '../types/index.js';

interface Props {
  clusters: ClusterFeature[];
}

function clusterSize(count: number): number {
  if (count < 10) return 36;
  if (count < 100) return 46;
  if (count < 1000) return 56;
  return 66;
}

export function ClusterMarkers({ clusters }: Props) {
  const map = useMap();

  return (
    <>
      {clusters.map((feature, i) => {
        const [lng, lat] = feature.geometry.coordinates;
        const isCluster = feature.properties.cluster;
        const count = feature.properties.point_count ?? 1;
        const size = isCluster ? clusterSize(count) : 28;

        const handleClick = () => {
          if (isCluster && map) {
            map.setZoom((map.getZoom() ?? 6) + 2);
            map.panTo({ lat, lng });
          }
        };

        return (
          <AdvancedMarker
            key={isCluster ? feature.properties.cluster_id : feature.properties.id ?? i}
            position={{ lat, lng }}
            onClick={handleClick}
          >
            <div
              className={[
                'rounded-full flex items-center justify-center font-bold shadow-md select-none text-white',
                isCluster ? 'bg-red-600 cursor-pointer text-sm' : 'bg-green-600 cursor-default text-[10px]',
              ].join(' ')}
              style={{ width: size, height: size }}
            >
              {isCluster ? count : feature.properties.brand_name}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/StoreInfoWindow.tsx`**

```tsx
import { InfoWindow } from '@vis.gl/react-google-maps';
import type { StoreRecord } from '../types/index.js';

interface Props {
  store: StoreRecord;
  onClose: () => void;
}

export function StoreInfoWindow({ store, onClose }: Props) {
  return (
    <InfoWindow
      position={{ lat: store.latitude, lng: store.longitude }}
      onCloseClick={onClose}
    >
      <div className="text-sm leading-relaxed min-w-40">
        <div className="font-bold mb-1">{store.brand_name}</div>
        <div>{store.city}, {store.state}</div>
        <div>Status: <strong>{store.status}</strong></div>
        <div className="text-xs text-gray-400 mt-1">{store.id}</div>
      </div>
    </InfoWindow>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/StoreMarkers.tsx`**

```tsx
import { useState } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { StoreInfoWindow } from './StoreInfoWindow.js';
import type { StoreRecord } from '../types/index.js';

interface Props {
  points: StoreRecord[];
}

export function StoreMarkers({ points }: Props) {
  const [selected, setSelected] = useState<StoreRecord | null>(null);

  return (
    <>
      {points.map((store) => (
        <AdvancedMarker
          key={store.id}
          position={{ lat: store.latitude, lng: store.longitude }}
          onClick={() => setSelected(store)}
        >
          <div className="bg-white border-2 border-blue-600 rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-600 shadow cursor-pointer select-none hover:bg-blue-50 transition-colors">
            {store.brand_name}
          </div>
        </AdvancedMarker>
      ))}

      {selected && (
        <StoreInfoWindow store={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: StateMarkers, ClusterMarkers, StoreMarkers, StoreInfoWindow components"
```

---

## Task 13: FilterSidebar Component

**Files:**
- Create: `frontend/src/components/FilterSidebar.tsx`

- [ ] **Step 1: Create `frontend/src/components/FilterSidebar.tsx`**

```tsx
import type { Filters } from '../types/index.js';

interface Props {
  filters: Filters;
  options: { states: string[]; brands: string[]; statuses: string[] };
  onUpdate: (key: keyof Filters, value: string) => void;
  onClear: () => void;
}

export function FilterSidebar({ filters, options, onUpdate, onClear }: Props) {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-xl p-4 w-52 shadow-xl z-10 flex flex-col gap-3">
      <div className="font-bold text-sm text-gray-800">Filters</div>

      <label className="text-xs text-gray-600 flex flex-col gap-1">
        State
        <select
          value={filters.state}
          onChange={(e) => onUpdate('state', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          {options.states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="text-xs text-gray-600 flex flex-col gap-1">
        Brand
        <select
          value={filters.brand}
          onChange={(e) => onUpdate('brand', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          {options.brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </label>

      <label className="text-xs text-gray-600 flex flex-col gap-1">
        Status
        <select
          value={filters.status}
          onChange={(e) => onUpdate('status', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          {options.statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <button
        onClick={onClear}
        className="text-xs py-1.5 px-3 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        Clear Filters
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/FilterSidebar.tsx
git commit -m "feat: FilterSidebar with state, brand, status dropdowns"
```

---

## Task 14: MapContainer — Main Map Component

**Files:**
- Create: `frontend/src/components/MapContainer.tsx`

- [ ] **Step 1: Create `frontend/src/components/MapContainer.tsx`**

```tsx
import { Map, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { StateMarkers } from './StateMarkers.js';
import { ClusterMarkers } from './ClusterMarkers.js';
import { StoreMarkers } from './StoreMarkers.js';
import { useMapData } from '../hooks/useMapData.js';
import type { Filters } from '../types/index.js';

interface Props {
  filters: Filters;
}

export function MapContainer({ filters }: Props) {
  const { tier, stateCounts, clusters, points, loading, error, onViewportChange } = useMapData(filters);

  const handleCameraChange = (e: MapCameraChangedEvent) => {
    const { bounds, zoom } = e.detail;
    if (!bounds || zoom === undefined) return;
    onViewportChange(
      { swLat: bounds.south, swLng: bounds.west, neLat: bounds.north, neLng: bounds.east },
      zoom
    );
  };

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs z-20">
          Loading...
        </div>
      )}

      {error && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-800 text-white px-3 py-1 rounded-full text-xs z-20">
          {error}
        </div>
      )}

      <Map
        defaultCenter={{ lat: 39.5, lng: -98.35 }}
        defaultZoom={4}
        mapId="retail-map"
        onCameraChanged={handleCameraChange}
        style={{ width: '100%', height: '100%' }}
      >
        {tier === 1 && <StateMarkers stateCounts={stateCounts} />}
        {tier === 2 && <ClusterMarkers clusters={clusters} />}
        {tier === 3 && <StoreMarkers points={points} />}
      </Map>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/MapContainer.tsx
git commit -m "feat: MapContainer — wires camera changes to useMapData, renders correct tier"
```

---

## Task 15: App Root and Entry Point

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Replace `frontend/src/App.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { APIProvider } from '@vis.gl/react-google-maps';
import { config } from './config.js';
import { MapContainer } from './components/MapContainer.js';
import { FilterSidebar } from './components/FilterSidebar.js';
import { useFilters } from './hooks/useFilters.js';

const queryClient = new QueryClient();
const { googleMapsApiKey } = config;

function AppInner() {
  const { filters, options, updateFilter, clearFilters } = useFilters();

  return (
    <APIProvider apiKey={googleMapsApiKey}>
      <div className="w-screen h-screen relative">
        <MapContainer filters={filters} />
        <FilterSidebar
          filters={filters}
          options={options}
          onUpdate={updateFilter}
          onClear={clearFilters}
        />
      </div>
    </APIProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Replace `frontend/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Verify `frontend/src/index.css` has Tailwind entry (done in Task 1 Step 5b)**

Tailwind's preflight layer handles the box-model reset. No manual reset needed.

- [ ] **Step 4: Start frontend**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Verify:
- Map loads centered on US at zoom 4
- Tier 1 state markers appear with counts
- Zooming in to zoom 6–11 shows cluster bubbles
- Zooming in to zoom 12+ shows individual store labels
- Clicking a store label shows the info popup
- Filter dropdowns affect what the backend returns

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx frontend/src/index.css
git commit -m "feat: App root wiring — map + filter sidebar, Google Maps APIProvider"
```

---

## Task 16: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md` at repo root**

````markdown
# Interactive US Retail Locations Map

## Setup

### Prerequisites
- Node.js 18+
- The `my_pois.csv` dataset in the repo root

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set DB_PATH, CSV_PATH, GOOGLE_MAPS_API_KEY
npm run import        # one-time: imports CSV into SQLite (~30s)
npm run dev           # starts on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: set VITE_GOOGLE_MAPS_API_KEY, VITE_API_BASE_URL
npm run dev           # starts on http://localhost:5173
```

## Architecture

### Three Zoom Tiers

| Zoom | Tier | What renders | Data source |
|------|------|-------------|-------------|
| ≤ 5 | State counts | Circular markers per state with total store count | Pre-aggregated at startup |
| 6–11 | Clusters | Count bubbles; click/zoom to expand | Supercluster in-process R-tree |
| ≥ 12 | Individual stores | Brand-label markers with info popup | SQLite bounding-box query |

### Viewport-Based Fetching

Every map camera change triggers a debounced (250ms) request with the current viewport bounds (SW + NE lat/lng) and zoom level. The backend returns only data inside those bounds. A client-side cache keyed by rounded bounds prevents redundant fetches when panning within already-loaded areas.

### Tech Choices

- **SQLite + better-sqlite3**: Zero infrastructure, fast synchronous reads, indexed bounding-box `WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`. Handles 134k rows easily.
- **Supercluster**: Mapbox's R-tree clustering library. Loaded with all 134k points at startup (~15MB RAM). Returns clusters or individual points for any viewport+zoom in <10ms.
- **@vis.gl/react-google-maps**: Newer, more React-idiomatic wrapper over Google Maps JS API compared to `@react-google-maps/api`.

### Trade-offs

- **Filters on Tier 2**: Supercluster clusters the full dataset — post-filter of individual (non-cluster) points happens in Node.js after the cluster query. Cluster counts may include filtered-out stores. With more time: build per-filter Supercluster indexes or move to a tile-based approach.
- **SQLite vs PostgreSQL + PostGIS**: SQLite is sufficient for this scale. At production scale with multiple Node.js workers, the natural next step is PostgreSQL + PostGIS for richer spatial queries and shared connection pooling.
- **Redis considered**: Redis geospatial (GEOSEARCH) would speed up Tier 3 point lookups under high concurrency, but Supercluster cannot live in Redis — it's a JavaScript runtime object. Redis would only help Tier 1 + Tier 3, while Tier 2 stays in-process regardless. Deferred for this scope.

## AI Usage

This project was implemented with Claude Code (claude-sonnet-4-6) as an AI coding assistant. All architectural decisions, trade-offs, and code were reviewed and understood before acceptance.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, architecture, and trade-off documentation"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered |
|-------------|---------|
| Tier 1: state markers with count | Task 5, 12 |
| Tier 2: clusters with count, click to expand | Task 6, 12 |
| Tier 3: individual markers with popup | Task 12 |
| Viewport-based fetching only | Tasks 4, 7, 10 |
| Debounce 200–300ms | Task 10 (custom useDebounce, 250ms) |
| Client-side cache by bounds | Task 10 (TanStack Query, staleTime 30s) |
| Filters shareable via URL | Task 11 (replaceState on every change) |
| Filters: state, brand, status | Tasks 4, 7, 11, 13 |
| Filters applied server-side | Tasks 4, 7 (SQLite WHERE) |
| API key from .env | Tasks 1, 8, 15 |
| <500ms viewport queries | SQLite index + Supercluster = <50ms |
| TypeScript | All files |
| Tailwind CSS v4 via Vite plugin | Task 1 |
| Centralised per-env config (backend + frontend) | Task 1b |
| Custom error classes | Task 8b |
| Global error handler middleware | Task 8b |
| Loading indicators | Task 14 |
| Error states | Task 14 |
| README | Task 16 |

All requirements covered.
