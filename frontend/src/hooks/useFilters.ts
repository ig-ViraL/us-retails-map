import { useState, useEffect, useCallback } from 'react';
import { fetchFilterOptions } from '../services/api';
import type { Filters } from '../types/index';

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
