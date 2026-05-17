import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config';
import type { StoreRecord, ViewportBounds, Filters } from '../types/index';

export const db = new Database(path.resolve(config.dbPath), { readonly: true });
let filterOptionsCache: { states: string[]; brands: string[]; statuses: string[] } | null = null;


/**
 * Retrieves up to `limit` store records within the given latitude/longitude viewport bounds,
 * applying optional filters for state, brand, and status.
 * Useful for returning only the stores currently visible on the map or matching search criteria.
 * @param bounds - Geographical bounding box with southwest and northeast coordinates.
 * @param filters - Optional filters for state, brand, and/or status fields.
 * @param limit - Maximum number of stores to return (default: 500).
 * @returns Array of StoreRecord objects inside the specified bounds and matching supplied filters.
 */
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

/**
 * Retrieves all store records that match the provided filters.
 * Useful for filtering stores by state, brand, or status.
 * @param filters - Object containing optional filter values: state, brand, and/or status.
 * @returns Array of StoreRecord objects matching the supplied filter criteria.
 */
export function getFilteredPoints(filters: Filters): StoreRecord[] {
  const conditions: string[] = [];
  if (filters.state) conditions.push('state = @state');
  if (filters.brand) conditions.push('brand_name = @brand');
  if (filters.status) conditions.push('status = @status');

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db
    .prepare(`SELECT id, brand_name, latitude, longitude, status, state, city FROM stores ${where}`)
    .all({
      state: filters.state ?? null,
      brand: filters.brand ?? null,
      status: filters.status ?? null,
    }) as StoreRecord[];
}

/**
 * Caches the list of unique states, brands, and statuses available in the stores table.
 * Queries distinct values for state, brand_name, and status, removing empty values and ordering alphabetically.
 * Populates the in-memory filterOptionsCache object for fast frontend filter option loading.
 * Intended to be called at startup and whenever the underlying data may have changed.
 */
export function buildFilterOptionsCache(): void {
  const states = (db.prepare("SELECT DISTINCT state FROM stores WHERE state != '' ORDER BY state").all() as { state: string }[]).map(
    (r) => r.state
  );
  const brands = (db.prepare("SELECT DISTINCT brand_name FROM stores WHERE brand_name != '' ORDER BY brand_name").all() as { brand_name: string }[]).map(
    (r) => r.brand_name
  );
  const statuses = (db.prepare("SELECT DISTINCT status FROM stores WHERE status != '' ORDER BY status").all() as { status: string }[]).map(
    (r) => r.status
  );
  filterOptionsCache = { states, brands, statuses };
  console.log(`Filter options cached: ${states.length} states, ${brands.length} brands, ${statuses.length} statuses`);
}

/**
 * Returns the cached filter options containing lists of available states, brands, and statuses.
 * Throws an error if the filter options cache has not yet been built.
 * Use buildFilterOptionsCache() to initialize or refresh the cache before calling this function.
 * @returns { states: string[]; brands: string[]; statuses: string[] } - Filter options for frontend dropdowns or filters.
 * @throws Error if filter options cache has not been built.
 */
export function getFilterOptions(): { states: string[]; brands: string[]; statuses: string[] } {
  if (!filterOptionsCache) throw new Error('Filter options cache not built');
  return filterOptionsCache;
}
