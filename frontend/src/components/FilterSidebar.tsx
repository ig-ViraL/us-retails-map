import type { Filters } from '../types/index';

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
            <option key={s} value={s}>{s.replace(/\b\w/g, (c) => c.toUpperCase())}</option>
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
