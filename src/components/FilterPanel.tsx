"use client";

import { useState, useRef, useEffect } from "react";
import { VehicleFilters, FilterOptions } from "@/types";
import { ChevronDown, Search, X, Check } from "lucide-react";

interface FilterPanelProps {
  filters: VehicleFilters;
  filterOptions: FilterOptions;
  onChange: (filters: VehicleFilters) => void;
}

function MultiSelect({
  label,
  selected,
  options,
  searchable,
  onChange,
}: {
  label: string;
  selected: string[];
  options: string[];
  searchable?: boolean;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const displayLabel = selected.length === 0 ? "All" : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  const hasSelection = selected.length > 0;

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-xs font-semibold text-gray-300 tracking-widest">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => { setOpen(!open); setSearch(""); }}
          className={`w-full h-9 px-2.5 text-xs rounded-md flex items-center justify-between focus:outline-none transition-colors border ${
            hasSelection
              ? "bg-white border-gray-300 text-gray-900"
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <span className="truncate">{displayLabel}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasSelection && (
              <span
                className="text-xs bg-[#1a3a6e]/15 text-[#1a3a6e] rounded-full w-5 h-5 flex items-center justify-center font-bold"
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
              >
                {selected.length}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 top-11 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg">
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                    placeholder={`Search ${label}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            )}
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-400">No results</li>
              ) : (
                filtered.map((opt) => {
                  const isSelected = selected.includes(opt);
                  return (
                    <li
                      key={opt}
                      onClick={() => toggle(opt)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50 text-[#1a3a6e] font-medium" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-[#1a3a6e]/15 border-[#1a3a6e]/40" : "border-gray-300"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-[#1a3a6e]" strokeWidth={3} />}
                      </div>
                      {opt}
                    </li>
                  );
                })
              )}
            </ul>
            {hasSelection && (
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={() => { onChange([]); setOpen(false); }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium w-full text-left"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const AVAILABILITY_OPTIONS = ["Unscheduled", "In Build", "In Transit", "On Ground"];

export function FilterPanel({ filters, filterOptions, onChange }: FilterPanelProps) {
  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== "search" && Array.isArray(v) && v.length > 0);

  return (
    <div className="px-3 pt-5 pb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white text-sm tracking-wide">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ search: filters.search })}
            className="text-[10px] text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <MultiSelect
            label="Availability"
            selected={filters.availabilities || []}
            options={AVAILABILITY_OPTIONS}
            onChange={(v) => onChange({ ...filters, availabilities: v.length ? v : undefined })}
          />
        </div>

        <div className="border-b border-gray-600" />

        {[
          { label: "Body Application", key: "bodyApplications" as const, options: filterOptions.bodyApplications },
          { label: "OEM",              key: "oems"             as const, options: filterOptions.oems },
          { label: "Year",             key: "years"            as const, options: filterOptions.years },
          { label: "Color",            key: "colors"           as const, options: filterOptions.colors },
          { label: "Fuel Type",        key: "fuelTypes"        as const, options: filterOptions.fuelTypes },
        ].map(({ label, key, options, searchable }, i, arr) => (
          <div key={key}>
            <MultiSelect
              label={label}
              selected={(filters[key] as string[]) || []}
              options={options}
              searchable={searchable}
              onChange={(v) => onChange({ ...filters, [key]: v.length ? v : undefined })}
            />
            {i < arr.length - 1 && <div className="border-b border-gray-600 mt-3" />}
          </div>
        ))}
      </div>
    </div>
  );
}
