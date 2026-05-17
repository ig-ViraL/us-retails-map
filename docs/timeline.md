# Architecture Decision Timeline
## Interactive US Retail Locations Map — Ignosis Assignment

---

## Context

Building a full-stack interactive map of ~134k US retail store locations.
Three zoom tiers: state counts → clusters → individual store markers.
Key constraint: viewport-based fetching only (never return full dataset).

---

## 2026-05-17 — Initial Architecture Discussion

### Starting Point: SQLite + Supercluster

**Proposed stack:**
- Backend: Node.js + Express + TypeScript
- Data store: SQLite + `better-sqlite3` with indexed lat/lng columns
- Clustering: `supercluster` (Mapbox library) loaded in-process at startup
- Frontend: React + TypeScript + `@vis.gl/react-google-maps`

**How Supercluster works:**
- Feed it ALL 134k points once at startup
- It builds an internal R-tree spatial index in process heap (~15MB RAM)
- At query time: give it viewport bounds + zoom level → returns clusters (with count) or individual points
- Query speed: O(log n), typically <10ms per request
- Tradeoff: data lives in one process's memory — not shareable across Node workers

---

## Redis Geospatial — Considered and Deferred

### What Prompted the Discussion

Redis has native geospatial support:
- `GEOADD key lon lat member` — store points
- `GEOSEARCH key FROMLONLAT lon lat BYBOX width height km ASC COUNT n` — viewport query
- Fully in-memory → faster reads than SQLite disk I/O under concurrent load

### Arguments FOR Redis

1. **Raw read speed**: Fully in-memory, no disk I/O. Structurally faster under concurrent load.
2. **Multi-process Node.js**: With pm2 cluster mode (4 workers), Redis is a shared store. Each SQLite connection is per-process; Redis is shared naturally.
3. **1k concurrent users**: Redis handles concurrent connections without locking. SQLite WAL mode handles concurrent reads well but Redis is architecturally cleaner at scale.
4. **Production mindset**: For a real production system expecting horizontal scaling, Redis is the right instinct.

### Arguments AGAINST Redis (for this use case)

1. **Supercluster cannot live in Redis.**
   - Supercluster is a JavaScript runtime object (R-tree in process heap).
   - Each Node.js worker process must build its own Supercluster index at startup.
   - Redis helps Tier 1 and Tier 3 only — Tier 2 (clustering) remains in-process regardless.

2. **Tier split reality:**

   | Tier | Served by | Redis role |
   |------|-----------|------------|
   | Tier 1 — State counts | Pre-computed at startup | ✅ Could store as Redis Hash |
   | Tier 2 — Clusters | Supercluster in process memory | ❌ Redis cannot help |
   | Tier 3 — Raw points | DB/store bounding box query | ✅ GEOSEARCH works well |

3. **Filters become application-level logic:**
   - Redis `GEOSEARCH` returns ALL points in viewport with no WHERE clause support.
   - Filtering by `status`, `brand`, `state` must happen in Node.js after the GEOSEARCH result.
   - Example: viewport has 300 points, filter reduces to 40 → Redis returns 300, app discards 260.
   - With SQLite: `WHERE lat BETWEEN ? AND lng BETWEEN ? AND status=? AND brand_name=?` — precise.
   - At Tier 3 (deep zoom), viewports are small (20–50 stores), so overhead is tolerable but still waste.

4. **Infrastructure overhead**: Redis requires a running server. SQLite is zero-setup.

5. **The actual win is narrower than it sounds**: The hardest, most impressive tier (Tier 2 clustering) still runs fully in Supercluster in process memory. Redis only meaningfully helps Tier 3 point fetching, where viewports are small anyway.

### Decision: Defer Redis, Use SQLite + Supercluster

For this assignment scope: SQLite + Supercluster covers all three tiers cleanly, with filter support via SQL WHERE, and zero extra infrastructure.

---

## When Redis Would Be the Right Call (Scaling Path)

Use this in interviews when discussing "what would you do with more time / at production scale":

### Trigger Points to Migrate to Redis

| Signal | Why it matters |
|--------|----------------|
| Multiple Node.js processes (pm2 cluster / k8s pods) | Supercluster index must be rebuilt in each process memory. At 4 workers × 15MB = 60MB. Redis centralizes Tier 3 point queries. |
| >500 concurrent users hitting Tier 3 | SQLite WAL handles concurrent reads well but Redis is structurally faster with no contention |
| Filters become complex (multi-select, range queries) | At this point, move to PostgreSQL + PostGIS instead of Redis — SQL is better for filter complexity |
| Dataset grows to 1M+ rows | Supercluster at 1M rows ≈ 100MB in memory. Still feasible per process but Redis Tier 3 offload becomes more attractive |

### Ideal Production Stack (Beyond This Assignment)

```
PostgreSQL + PostGIS   — source of truth, complex filter queries (Tier 3 with filters)
Redis                  — cache for pre-computed state counts (Tier 1), hot viewport clusters
Supercluster           — per-worker in-process index, rebuilt from PG on startup or on invalidation
CDN / tile server      — for very high traffic, pre-render cluster tiles (e.g., protomaps)
```

### Key Interview Talking Points

- "We started with SQLite + Supercluster — zero infrastructure, fast to build, handles the 3 tiers cleanly."
- "The natural scaling path is to swap SQLite for PostgreSQL + PostGIS for richer filter queries, and add Redis as a cache layer for pre-computed hot viewports."
- "Supercluster lives in process memory and can't be shared via Redis — that's the nuance. Redis helps the raw point lookups but the clustering layer stays in-process regardless of DB choice."
- "At real production scale with horizontal Node.js scaling, you'd pre-compute cluster tiles or use a dedicated tile server rather than running Supercluster per-request in each worker."

---

## Summary

| Question | Answer |
|----------|--------|
| Why not Redis now? | Tier 2 still needs Supercluster in-process; filters need SQL; extra infra for marginal Tier 3 gain |
| Why SQLite? | Zero setup, handles bounding box queries with index, SQL WHERE for filters, Supercluster covers clustering |
| When would Redis make sense? | Multi-process horizontal scaling, high Tier 3 concurrency, hot viewport caching |
| What's the full production path? | SQLite → PostgreSQL + PostGIS → add Redis cache layer → tile server for extreme scale |
