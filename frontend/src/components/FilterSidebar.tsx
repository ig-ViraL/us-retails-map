import { useState } from 'react';
import type { Filters } from '../types/index';

interface Props {
  filters: Filters;
  options: { states: string[]; brands: string[]; statuses: string[] };
  onUpdate: (key: keyof Filters, value: string) => void;
  onClear: () => void;
}

function hasActiveFilters(filters: Filters): boolean {
  return !!(filters.state || filters.brand || filters.status);
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FilterSidebar({ filters, options, onUpdate, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const active = hasActiveFilters(filters);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-row-reverse items-center gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Toggle filters"
        className={[
          'w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer',
          active
            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
            : 'bg-white text-gray-600 hover:bg-gray-50',
        ].join(' ')}
      >
        {open ? (
          /* X / close icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          /* Filter funnel icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        )}
        {!open && active && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl w-56 overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Filters</span>
            {active && (
              <button
                onClick={() => { onClear(); }}
                className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="px-4 pb-4 flex flex-col gap-3">
            {/* State */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">State</label>
              <select
                value={filters.state}
                onChange={(e) => onUpdate('state', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                <option value="">All states</option>
                {options.states.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{toTitleCase(s)}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Brand</label>
              <select
                value={filters.brand}
                onChange={(e) => onUpdate('brand', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                <option value="">All brands</option>
                {options.brands.filter(Boolean).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</label>
              <select
                value={filters.status}
                onChange={(e) => onUpdate('status', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                <option value="">All statuses</option>
                {options.statuses.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{toTitleCase(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
