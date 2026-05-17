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
