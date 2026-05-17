# Interactive US Retail Locations Map

A full-stack interactive map of 134,436 US retail store locations across three zoom tiers: state-level aggregates → clustered markers → individual stores. Built for the Ignosis interview assignment.

---

## Quick Start

From the repo root (runs frontend + backend concurrently):

```bash
npm install                  # installs root deps (concurrently)
npm run install:all          # installs frontend + backend deps
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# fill in GOOGLE_MAPS_API_KEY in both .env files
npm run import-csv           # one-time: imports 134k rows into SQLite (~30s)
npm run dev                  # starts both servers
```

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3000 |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable   | Default            | Description                             |
| ---------- | ------------------ | --------------------------------------- |
| `PORT`     | `3000`             | Express server port                     |
| `DB_PATH`  | `./data/stores.db` | Path to the SQLite database file        |
| `CSV_PATH` | `../my_pois.csv`   | Path to the source CSV (used by import) |

> `GOOGLE_MAPS_API_KEY` is not required on the backend — the key is used only by the browser client.

### Frontend (`frontend/.env`)

| Variable                   | Default                 | Description                       |
| -------------------------- | ----------------------- | --------------------------------- |
| `VITE_GOOGLE_MAPS_API_KEY` | —                       | Google Maps JS API key (required) |
| `VITE_API_BASE_URL`        | `http://localhost:3000` | Backend base URL                  |

---

## Available Scripts (root)

| Command               | What it does                                           |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Runs frontend + backend concurrently                   |
| `npm run build`       | TypeScript-compiles backend, then Vite-builds frontend |
| `npm run install:all` | `npm install` in both `frontend/` and `backend/`       |
| `npm run import-csv`  | Imports `my_pois.csv` into SQLite (run once)           |
| `npm run lint`        | ESLint on the frontend                                 |
| `npm run start`       | Starts the compiled backend (`dist/index.js`)          |

---

## Architecture

### Three Zoom Tiers

The dataset has 134k points — rendering all of them at every zoom level is neither useful nor performant. The map operates in three distinct tiers based on zoom level:

| Zoom   | Tier | What Renders                          | Data Source                       |
| ------ | ---- | ------------------------------------- | --------------------------------- |
| ≤ 7    | 1    | One circle per US state (store count) | In-memory cache, built at startup |
| 8 – 11 | 2    | Cluster bubbles (count + expand)      | Supercluster in-process R-tree    |
| ≥ 12   | 3    | Individual brand markers + info popup | SQLite bounding-box query         |

Each tier is a separate API endpoint. The frontend calls only the endpoint matching the current zoom — the other two endpoints are never hit.

### Viewport-Based Fetching

The backend never returns the full dataset. Every request includes the map's current bounding box (SW + NE lat/lng corners). At Tier 3, the SQLite query is:

```sql
SELECT ... FROM stores
WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
  AND status = ? AND brand_name = ? ...
LIMIT 500
```

The lat/lng columns are indexed. At street-level zoom, a typical viewport holds 20–80 stores — the query is fast and the response is small.

### Debouncing & Cache Bucketing

Camera change events fire continuously while panning or zooming. Two layers of protection prevent over-fetching:

1. **500 ms debounce** on the frontend — the API is not called until the camera has been still for half a second.
2. **Bounds bucketing** — the React Query cache key snaps coordinates to a grid before hashing (`0.1°` buckets for Tier 2, `0.005°` for Tier 3). Panning slightly within the same bucket hits the cache instead of the network.

React Query stale times: `Infinity` for unfiltered state counts (they never change at runtime), `120 s` for cluster and point tiles.

### Startup Caches

Three things are computed once when the backend starts and held in memory:

- **Supercluster index** — all 134k points loaded into an R-tree. Queried per viewport in < 10 ms.
- **State counts cache** — a single aggregated `GROUP BY state` query, stored as an array.
- **Filter options cache** — distinct `states`, `brands`, and `statuses` for populating the filter dropdowns.

These caches make the three most common read patterns instantaneous.

---

## API

| Method | Path                         | Tier | Description                        |
| ------ | ---------------------------- | ---- | ---------------------------------- |
| GET    | `/api/stores/states`         | 1    | State-level counts with centroids  |
| GET    | `/api/stores/clusters`       | 2    | Clustered GeoJSON features         |
| GET    | `/api/stores/points`         | 3    | Individual stores in viewport      |
| GET    | `/api/stores/filter-options` | —    | Available states, brands, statuses |
| GET    | `/health`                    | —    | Liveness check                     |

All viewport endpoints accept `swLat`, `swLng`, `neLat`, `neLng` query params. Cluster endpoint also requires `zoom`. Optional filter params: `state`, `brand`, `status`.

---

## Tech Stack & Decisions

### Backend

**Node.js + Express + TypeScript**
Standard choice for a JSON API with no compute-heavy work beyond spatial indexing. TypeScript provides end-to-end type safety shared with the frontend via the `types/index.ts` contract.

**SQLite + better-sqlite3**
Zero infrastructure — no server process, no connection pool, no migrations to run. `better-sqlite3` is synchronous, which simplifies code and performs well for the read-heavy, single-process workload here. The indexed bounding-box query handles 134k rows comfortably. At production scale with multiple processes, the natural migration is PostgreSQL + PostGIS.

**Supercluster**
Mapbox's geospatial clustering library. All 134k points are fed into it once at startup, building an in-process R-tree index (~15 MB RAM). Any subsequent viewport query returns clusters or individual points in under 10 ms. The tradeoff is that the index lives in one process's heap and cannot be shared — covered in the Redis section below.

### Frontend

**React + TypeScript + Vite**
Vite's near-instant HMR made iteration fast during the time-limited build. React 19 + TypeScript ensures the component tree is type-safe throughout.

**@vis.gl/react-google-maps**
More idiomatic React wrapper over the Google Maps JS API than the older `@react-google-maps/api`. Exposes `AdvancedMarker` (the current Maps API primitive) and clean hooks like `useMap()`.

**TanStack Query (React Query)**
Handles server state: caching, background refetching, stale-while-revalidate, and `keepPreviousData` so the map doesn't flash empty while a new tile loads. Cache keys are built from bucketed bounds + filters, so the cache is spatially aware.

**Tailwind CSS v4**
Utility-first styling with the Vite plugin — no PostCSS config needed. All marker and sidebar styles live inline in components, avoiding context-switching to a CSS file.

---

## Redis: Considered and Deferred

Redis geospatial was explicitly evaluated (`GEOSEARCH` for viewport queries, hashes for state counts). The decision to defer it came down to one fundamental constraint: **Supercluster cannot live in Redis**.

Supercluster is a JavaScript runtime object — an R-tree built in process heap. Each Node.js worker must build its own copy at startup. Redis could cache Tier 1 (state counts) and accelerate Tier 3 (raw point lookups), but Tier 2 — the most complex and performance-critical tier — stays in-process regardless of what data store sits behind it.

| Tier             | Data source                    | Redis role                                                                                                                              |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — State counts | In-memory cache (startup)      | Could store as a Redis Hash — marginal benefit given it's already in-memory                                                             |
| 2 — Clusters     | Supercluster in-process R-tree | Not applicable — Redis cannot hold a JS runtime object                                                                                  |
| 3 — Raw points   | SQLite bounding-box query      | `GEOSEARCH` works, but `GEOSEARCH` has no `WHERE` clause — filters become post-fetch application logic, discarding most returned points |

The filter incompatibility at Tier 3 is the sharper problem. `GEOSEARCH` returns all points in a viewport; filtering by `brand`, `status`, or `state` then happens in Node.js. SQLite's `WHERE` clause handles this natively — the query only touches matching rows.

For this assignment's scope (single process, 134k rows, no horizontal scaling requirement), SQLite + Supercluster covers all three tiers cleanly with zero extra infrastructure.

**When Redis becomes the right call:** multiple Node.js workers (pm2 cluster / Kubernetes), sustained high concurrency on Tier 3, or a need to share pre-computed hot-viewport caches across processes. At that point the full production path is PostgreSQL + PostGIS for filter-rich spatial queries, Redis as a cache layer for pre-computed tiles, and Supercluster rebuilt per-worker from the database on startup.

---

## Code Structure

```
ignosis/
├── backend/
│   └── src/
│       ├── config.ts              # port, db path, csv path
│       ├── index.ts               # express app + startup caches
│       ├── constants/
│       │   └── state-centroids.ts # lat/lng centroid per US state
│       ├── middleware/
│       │   └── error-handler.ts   # centralised error middleware
│       ├── routes/
│       │   └── stores.ts          # /api/stores/* endpoints
│       ├── services/
│       │   ├── cluster-service.ts # Supercluster index + query
│       │   ├── db.ts              # SQLite queries
│       │   └── state-service.ts   # state count cache
│       ├── scripts/
│       │   └── import-csv.ts      # one-time CSV → SQLite import
│       ├── types/index.ts
│       └── utils/
│           └── params.ts          # parseBounds, parseFilters
│
└── frontend/
    └── src/
        ├── config.ts              # API URL, Maps key, zoom tier thresholds
        ├── App.tsx
        ├── components/
        │   ├── cluster-marker.tsx  # Tier 2: cluster bubble markers
        │   ├── filter-sidebar.tsx  # collapsible filter panel
        │   ├── map-container.tsx   # root map component, tier switching
        │   ├── state-marker.tsx    # Tier 1: state count circles
        │   ├── store-info-window.tsx # Tier 3: selected store popup
        │   └── store-marker.tsx   # Tier 3: individual brand markers
        ├── constants/
        │   └── index.ts           # PALETTE, STATUS_STYLES
        ├── hooks/
        │   ├── use-debounce.ts
        │   ├── use-filters.ts     # filter state + filter-options fetch
        │   └── use-map-data.ts    # React Query tier orchestration
        ├── services/
        │   └── api.ts             # fetch wrappers for all endpoints
        ├── types/index.ts
        └── utils/
            └── index.ts           # all pure helper functions
```

### Structural Decisions

**Zoom tier constants in `config.ts`** — `TIER1_MAX_ZOOM`, `TIER2_MAX_ZOOM`, `TIER3_MIN_ZOOM` live alongside the other app-level configuration rather than in a separate constants file. Any change to tier boundaries is made in one place and propagates to both the hooks and components that reference them.

**All utility functions in `utils/index.ts`** — helper functions that were co-located with components (`clusterSize`, `formatCount`, `hasActiveFilters`, `parseBounds`, etc.) were extracted to dedicated utils files. Because all frontend helpers are small and cohesive, they were consolidated into a single barrel file rather than one file per function. Backend route helpers (`parseBounds`, `parseFilters`) live in `backend/src/utils/params.ts` for the same reason.

**Singular component names** — components are named `ClusterMarker`, `StateMarker`, `StoreMarker` (singular) rather than the plural `*Markers`. A component describes what one instance renders, not a collection.

**Kebab-case file names** — all source files use lowercase kebab-case (`cluster-service.ts`, `use-map-data.ts`, `store-info-window.tsx`). PascalCase file names are a React community convention but not a technical requirement, and kebab-case is consistent with the broader Node.js and web ecosystem.

---

## Trade-offs

| Area                | Decision made                                                                                                | What was deferred                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Cluster filters** | Tier 2 cluster counts reflect the full dataset; individual (non-cluster) points are post-filtered in Node.js | Per-filter Supercluster indexes, or moving to a tile-based approach                 |
| **Data store**      | SQLite (single-file, zero infra)                                                                             | PostgreSQL + PostGIS for multi-process and richer spatial queries                   |
| **Caching**         | In-process memory caches at startup                                                                          | Redis for shared cross-process caching                                              |
| **Tests**           | None — time was allocated to correctness and architecture                                                    | Unit tests for `parseBounds`/`getZoomTier`, integration tests for the API endpoints |
| **Auth**            | None                                                                                                         | API key middleware if exposed beyond localhost                                      |
| **Error states**    | Basic error banner on the map                                                                                | Per-tier retry UI, toast notifications                                              |
| **Scalability**     | Single Node.js process                                                                                       | pm2 cluster mode, tile server (e.g. Protomaps) for extreme load                     |

---
