import { useState, useEffect, useCallback } from 'react';
import { fetchFilterOptions } from '../services/api';
import type { Filters } from '../types/index';
import { readFiltersFromURL, writeFiltersToURL } from '../utils';

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
