import { Router, Request, Response, NextFunction } from 'express';
import { getStateCounts, getFilteredStateCounts } from '../services/stateService';
import { getClusters, clusterStores } from '../services/clusterService';
import { getPointsInBounds, getFilterOptions, getFilteredPoints } from '../services/db';
import { ValidationError } from '../errors';
import type { ViewportBounds, Filters } from '../types/index';

export const storesRouter = Router();

function parseBounds(q: Record<string, string>): ViewportBounds | null {
  const { swLat, swLng, neLat, neLng } = q;
  if (!swLat || !swLng || !neLat || !neLng) return null;
  const parsed = {
    swLat: parseFloat(swLat),
    swLng: parseFloat(swLng),
    neLat: parseFloat(neLat),
    neLng: parseFloat(neLng),
  };
  if (Object.values(parsed).some(isNaN)) return null;
  return parsed;
}

function parseFilters(q: Record<string, string>): Filters {
  return {
    state: q.state || undefined,
    brand: q.brand || undefined,
    status: q.status || undefined,
  };
}

storesRouter.get('/states', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = parseFilters(req.query as Record<string, string>);
    const hasFilters = !!(filters.state || filters.brand || filters.status);
    res.json(hasFilters ? getFilteredStateCounts(filters) : getStateCounts());
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
    const hasFilters = !!(filters.state || filters.brand || filters.status);
    if (hasFilters) {
      const filteredStores = getFilteredPoints(filters);
      res.json(clusterStores(filteredStores, bounds, zoom));
    } else {
      res.json(getClusters(bounds, zoom, filters));
    }
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
