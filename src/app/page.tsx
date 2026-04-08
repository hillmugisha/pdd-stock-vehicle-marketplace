"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Vehicle, VehicleFilters, FilterOptions } from "@/types";
import { VehicleCard } from "@/components/VehicleCard";
import { FilterPanel } from "@/components/FilterPanel";
import { ReserveModal } from "@/components/ReserveModal";
import { Loader2, PackageSearch, LayoutGrid, List, Copy, Check, X, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 12;

// Cascading filter helpers
type VehicleField = {
  year: string | null; oem: string | null; color: string | null;
  bodyApplication: string | null; fuelType: string | null; orderStatus: string | null;
  location: string | null;
};

function getAvailabilityString(status: string | null): string {
  const v = (status ?? "").toLowerCase();
  if (v === "delivered") return "On Ground";
  if (v.includes("transit")) return "In Transit";
  if (v.includes("scheduled") && !v.includes("unscheduled")) return "In Build";
  return "Unscheduled";
}

function matchesFilters(v: VehicleField, filters: VehicleFilters, exclude?: keyof VehicleFilters): boolean {
  if (exclude !== "years"            && filters.years?.length            && !filters.years.includes(v.year ?? ""))            return false;
  if (exclude !== "oems"             && filters.oems?.length             && !filters.oems.includes(v.oem ?? ""))              return false;
  if (exclude !== "colors"           && filters.colors?.length           && !filters.colors.includes(v.color ?? ""))          return false;
  if (exclude !== "bodyApplications" && filters.bodyApplications?.length && !filters.bodyApplications.includes(v.bodyApplication ?? "")) return false;
  if (exclude !== "fuelTypes"        && filters.fuelTypes?.length        && !filters.fuelTypes.includes(v.fuelType ?? ""))    return false;
  if (exclude !== "availabilities"   && filters.availabilities?.length   && !filters.availabilities.includes(getAvailabilityString(v.orderStatus))) return false;
  return true;
}

function uniqueSorted(arr: (string | null)[]): string[] {
  return [...new Set(arr.filter((v): v is string => !!v && v.trim() !== ""))].sort();
}

// List view columns
const COL_DEFS = [
  { key: "checkbox",        minWidth: 44,  maxWidth: 44,  width: 44  },
  { key: "qty",             minWidth: 55,  maxWidth: 100, width: 65  },
  { key: "vehicle",         minWidth: 160, maxWidth: 500, width: 240 },
  { key: "year",            minWidth: 60,  maxWidth: 100, width: 70  },
  { key: "oem",             minWidth: 80,  maxWidth: 160, width: 100 },
  { key: "vin",             minWidth: 130, maxWidth: 220, width: 160 },
  { key: "stockNumber",     minWidth: 90,  maxWidth: 180, width: 120 },
  { key: "pacQid",          minWidth: 90,  maxWidth: 180, width: 120 },
  { key: "bodyApplication", minWidth: 90,  maxWidth: 200, width: 130 },
  { key: "color",           minWidth: 90,  maxWidth: 260, width: 150 },
  { key: "fuelType",        minWidth: 80,  maxWidth: 160, width: 100 },
  { key: "availability",    minWidth: 95,  maxWidth: 180, width: 120 },
  { key: "actions",         minWidth: 170, maxWidth: 320, width: 210 },
];

const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  years: [], oems: [], colors: [], bodyApplications: [], fuelTypes: [], locations: [], statuses: [],
};

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-3 flex items-center justify-center cursor-col-resize z-10 group"
    >
      <div className="w-px h-4 bg-gray-300 group-hover:bg-[#1a3a6e] group-hover:h-full transition-all duration-150" />
    </div>
  );
}

function getAvailabilityLabel(orderStatus: string | null): { label: string; className: string } {
  const s = (orderStatus ?? "").toLowerCase();
  if (s === "delivered")                                         return { label: "On Ground",    className: "bg-purple-100 text-purple-800 border-purple-200" };
  if (s.includes("transit"))                                     return { label: "In Transit",   className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
  if (s.includes("unscheduled") || s === "tbd" || s === "")     return { label: "Unscheduled",  className: "bg-gray-100 text-gray-600 border-gray-300" };
  if (s.includes("scheduled"))                                   return { label: "In Build",     className: "bg-orange-100 text-orange-800 border-orange-200" };
  return { label: "Unscheduled", className: "bg-gray-100 text-gray-600 border-gray-300" };
}

function AvailabilityBadge({ orderStatus }: { orderStatus: string | null }) {
  const { label, className } = getAvailabilityLabel(orderStatus);
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${className}`}>{label}</span>;
}

export default function HomePage() {
  const [allGrouped, setAllGrouped]       = useState<{ vehicle: Vehicle; qty: number }[]>([]);
  const [displayed, setDisplayed]         = useState<{ vehicle: Vehicle; qty: number }[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);
  const [filters, setFilters]             = useState<VehicleFilters>({});
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(false);
  const [listPage, setListPage]           = useState(1);
  const [vehicleFieldsBase, setVehicleFieldsBase] = useState<VehicleField[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isAuthenticated]                 = useState(false);
  const [viewMode, setViewMode]           = useState<"card" | "list">("card");
  const [detailVehicle, setDetailVehicle] = useState<{ vehicle: Vehicle; qty: number } | null>(null);
  const [reserveVehicle, setReserveVehicle] = useState<{ vehicle: Vehicle; qty: number } | null>(null);
  const [copiedKey, setCopiedKey]         = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys]   = useState<Set<string>>(new Set());
  const [multiAdditional, setMultiAdditional] = useState<{ vehicle: Vehicle; qty: number }[]>([]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Row key — group by PAC-QID
  const rowKey = (v: Vehicle) => v.pacQid ?? v.stockNumber;

  // List view pagination
  const listTotalPages = Math.max(1, Math.ceil(allGrouped.length / LIST_PAGE_SIZE));
  const listDisplayed  = allGrouped.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE);

  // Cascading filter options — each dimension shows only values compatible with other active filters
  const dynamicFilterOptions = useMemo((): FilterOptions => {
    if (vehicleFieldsBase.length === 0) return filterOptions;
    const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
      k !== "search" && Array.isArray(v) && v.length > 0
    );
    if (!hasActiveFilters) return filterOptions;
    return {
      years:            uniqueSorted(vehicleFieldsBase.filter(v => matchesFilters(v, filters, "years")).map(v => v.year)),
      oems:             uniqueSorted(vehicleFieldsBase.filter(v => matchesFilters(v, filters, "oems")).map(v => v.oem)),
      colors:           uniqueSorted(vehicleFieldsBase.filter(v => matchesFilters(v, filters, "colors")).map(v => v.color)),
      bodyApplications: uniqueSorted(vehicleFieldsBase.filter(v => matchesFilters(v, filters, "bodyApplications")).map(v => v.bodyApplication)),
      fuelTypes:        uniqueSorted(vehicleFieldsBase.filter(v => matchesFilters(v, filters, "fuelTypes")).map(v => v.fuelType)),
      locations:        filterOptions.locations,
      statuses:         filterOptions.statuses,
    };
  }, [vehicleFieldsBase, filters, filterOptions]);

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleAll = () => {
    const current = viewMode === "list" ? listDisplayed : displayed;
    if (selectedKeys.size === current.length) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(current.map(({ vehicle }) => rowKey(vehicle))));
  };
  const selectedItems = (viewMode === "list" ? listDisplayed : displayed).filter(({ vehicle }) => selectedKeys.has(rowKey(vehicle)));
  const openMultiInterest = () => {
    if (selectedItems.length === 0) return;
    const [primary, ...rest] = selectedItems;
    setReserveVehicle({ vehicle: primary.vehicle, qty: primary.qty });
    setMultiAdditional(rest);
  };

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  // Column resize
  const [colWidths, setColWidths] = useState(COL_DEFS.map((c) => c.width));
  const dragState = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const rafId = useRef<number | null>(null);

  const startResize = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { colIndex, startX: e.clientX, startWidth: colWidths[colIndex] };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (!dragState.current) return;
        const { colIndex: ci, startX, startWidth } = dragState.current;
        const { minWidth, maxWidth } = COL_DEFS[ci];
        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + (ev.clientX - startX)));
        setColWidths((prev) => { const next = [...prev]; next[ci] = newWidth; return next; });
      });
    };
    const onMouseUp = () => {
      dragState.current = null;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [colWidths]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      filters.years?.forEach((v)            => params.append("years", v));
      filters.oems?.forEach((v)             => params.append("oems", v));
      filters.colors?.forEach((v)           => params.append("colors", v));
      filters.bodyApplications?.forEach((v) => params.append("bodyApplications", v));
      filters.fuelTypes?.forEach((v)        => params.append("fuelTypes", v));
      filters.availabilities?.forEach((v) => params.append("availabilities", v));
      if (filters.search) params.set("search", filters.search);
      params.set("limit", "500");

      const res  = await fetch(`/api/vehicles?${params.toString()}`);
      const data = await res.json();

      const allVehicles: Vehicle[] = data.vehicles || [];

      // Group by PAC-QID
      const groupedMap = new Map<string, { vehicle: Vehicle; qty: number }>();
      for (const v of allVehicles) {
        const key = v.pacQid ?? v.stockNumber;
        if (groupedMap.has(key)) {
          groupedMap.get(key)!.qty += 1;
        } else {
          groupedMap.set(key, { vehicle: v, qty: 1 });
        }
      }

      const availabilityOrder: Record<string, number> = {
        "On Ground": 0, "In Transit": 1, "In Build": 2, "Unscheduled": 3,
      };
      const getAvailability = (s: string | null) => {
        const v = (s ?? "").toLowerCase();
        if (v === "delivered")                                       return "On Ground";
        if (v.includes("transit"))                                   return "In Transit";
        if (v.includes("scheduled") && !v.includes("unscheduled"))  return "In Build";
        return "Unscheduled";
      };
      const grouped = Array.from(groupedMap.values()).sort((a, b) => {
        const oa = availabilityOrder[getAvailability(a.vehicle.orderStatus)] ?? 4;
        const ob = availabilityOrder[getAvailability(b.vehicle.orderStatus)] ?? 4;
        return oa !== ob ? oa - ob : b.qty - a.qty;
      });
      setAllGrouped(grouped);
      setDisplayed(grouped.slice(0, PAGE_SIZE));
      setPage(1);
      setListPage(1);
      setHasMore(grouped.length > PAGE_SIZE);
      if (data.filterOptions) setFilterOptions(data.filterOptions);
      if (data.vehicleFields) setVehicleFieldsBase(data.vehicleFields);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);


  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("vehicles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "Vehicle" }, () => fetchVehicles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchVehicles]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const next = allGrouped.slice(0, nextPage * PAGE_SIZE);
    setTimeout(() => {
      setDisplayed(next);
      setPage(nextPage);
      setHasMore(next.length < allGrouped.length);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMore, page, allGrouped]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 border-r border-[#1a1617] sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto" style={{ backgroundColor: "#231F20" }}>
        <FilterPanel filters={filters} filterOptions={dynamicFilterOptions} onChange={setFilters} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {!loading && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total Vehicles</p>
                <p className="text-2xl font-bold text-[#1a3a6e] leading-tight">
                  {allGrouped.reduce((sum, { qty }) => sum + qty, 0).toLocaleString()}
                </p>
              </div>
            )}
            {/* Mobile filter button */}
            <button
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-[#1a3a6e] text-white rounded-lg text-sm font-semibold"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {Object.entries(filters).filter(([k, v]) => k !== "search" && Array.isArray(v) && (v as string[]).length > 0).length > 0 && (
                <span className="bg-white text-[#1a3a6e] rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center">
                  {Object.entries(filters).filter(([k, v]) => k !== "search" && Array.isArray(v) && (v as string[]).length > 0).length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors text-xs font-medium ${viewMode === "card" ? "bg-white shadow text-[#1a3a6e]" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutGrid className="w-4 h-4" /> Card
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors text-xs font-medium ${viewMode === "list" ? "bg-white shadow text-[#1a3a6e]" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh] overflow-y-auto" style={{ backgroundColor: "#231F20" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 sticky top-0" style={{ backgroundColor: "#231F20" }}>
                <h2 className="text-white font-bold text-sm">Filters</h2>
                <button onClick={() => setMobileFiltersOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterPanel filters={filters} filterOptions={dynamicFilterOptions} onChange={(f) => { setFilters(f); }} />
              <div className="px-4 pb-6 pt-2">
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full py-3 bg-[#1a3a6e] text-white font-semibold rounded-xl text-sm"
                >
                  Show Results ({allGrouped.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {(() => {
          const tagEntries: { key: string; value: string }[] = [];
          const arrKeys: (keyof typeof filters)[] = ["years","oems","colors","bodyApplications","fuelTypes","availabilities"];
          for (const key of arrKeys) {
            const arr = filters[key] as string[] | undefined;
            arr?.forEach((v) => tagEntries.push({ key, value: v }));
          }
          if (tagEntries.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tagEntries.map(({ key, value }) => (
                <span key={`${key}-${value}`} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-sm px-3 py-1 rounded-full">
                  {value}
                  <button
                    onClick={() => {
                      const arr = (filters[key as keyof typeof filters] as string[]) || [];
                      const next = arr.filter((v) => v !== value);
                      setFilters({ ...filters, [key]: next.length ? next : undefined });
                    }}
                    className="ml-1 hover:text-blue-900 font-bold leading-none"
                  >×</button>
                </span>
              ))}
              <button
                onClick={() => setFilters({ search: filters.search })}
                className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-sm px-3 py-1 rounded-full hover:bg-red-100"
              >
                Clear Filters ×
              </button>
            </div>
          );
        })()}

        {/* Vehicle Grid / List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#1a3a6e]" />
            </div>
          ) : allGrouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <PackageSearch className="w-12 h-12" />
              <p className="font-medium">No vehicles match your filters</p>
              <button onClick={() => setFilters({})} className="text-sm text-[#1a3a6e] hover:underline">Clear all filters</button>
            </div>
          ) : viewMode === "card" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                {displayed.map(({ vehicle, qty }) => (
                  <VehicleCard
                    key={rowKey(vehicle)}
                    vehicle={vehicle}
                    qty={qty}
                    isAuthenticated={isAuthenticated}
                    onReserved={fetchVehicles}
                  />
                ))}
              </div>
              <div ref={sentinelRef} className="h-4" />
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button onClick={loadMore} disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1a3a6e] hover:bg-[#142d56] text-white text-sm font-semibold rounded-lg disabled:opacity-60">
                    {loadingMore ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : `Load More (${allGrouped.length - displayed.length} remaining)`}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* List View */
            <>
              <div className="overflow-x-scroll rounded-xl border border-gray-200 shadow-sm">
                <table style={{ tableLayout: "fixed", width: colWidths.reduce((a, b) => a + b, 0) }} className="text-sm">
                  <colgroup>
                    {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 relative" style={{ width: colWidths[0] }}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#1a3a6e] focus:ring-[#1a3a6e] cursor-pointer"
                          checked={listDisplayed.length > 0 && selectedKeys.size === listDisplayed.length}
                          ref={(el) => { if (el) el.indeterminate = selectedKeys.size > 0 && selectedKeys.size < listDisplayed.length; }}
                          onChange={toggleAll}
                        />
                        <ResizeHandle onMouseDown={(e) => startResize(0, e)} />
                      </th>
                      {([
                        [1, "Qty"], [2, "Vehicle"], [3, "Year"], [4, "OEM"], [5, "VIN"],
                        [6, "Stock #"], [7, "PAC-QID"], [8, "Body Application"], [9, "Color"],
                        [10, "Fuel Type"], [11, "Availability"], [12, "Actions"],
                      ] as [number, string][]).map(([ci, label]) => (
                        <th
                          key={ci}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 tracking-wide relative overflow-hidden"
                          style={{ width: colWidths[ci] }}
                        >
                          <span className="block truncate">{label}</span>
                          {ci < 12 && <ResizeHandle onMouseDown={(e) => startResize(ci, e)} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listDisplayed.map(({ vehicle, qty }) => {
                      const title = vehicle.specs || [vehicle.year, vehicle.oem].filter(Boolean).join(" ");
                      return (
                        <tr
                          key={rowKey(vehicle)}
                          className={`border-b border-gray-100 transition-colors ${selectedKeys.has(rowKey(vehicle)) ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-4 py-3">
                            <input type="checkbox" className="rounded border-gray-300 text-[#1a3a6e] focus:ring-[#1a3a6e] cursor-pointer"
                              checked={selectedKeys.has(rowKey(vehicle))} onChange={() => toggleRow(rowKey(vehicle))} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-green-100 text-green-800 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full">{qty}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 truncate">{title || "Unknown Vehicle"}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700 truncate">{vehicle.year || "—"}</td>
                          <td className="px-4 py-3 text-gray-700 truncate">{vehicle.oem || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 group">
                              <span className="text-gray-700 truncate">{vehicle.vin || "—"}</span>
                              {vehicle.vin && (
                                <button onClick={() => copyToClipboard(vehicle.vin!, `vin-${vehicle.id}`)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#1a3a6e] shrink-0" title="Copy VIN">
                                  {copiedKey === `vin-${vehicle.id}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 group">
                              <span className="text-gray-700 truncate">{vehicle.stockNumber || "—"}</span>
                              {vehicle.stockNumber && (
                                <button onClick={() => copyToClipboard(vehicle.stockNumber!, `stock-${vehicle.id}`)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#1a3a6e] shrink-0" title="Copy Stock #">
                                  {copiedKey === `stock-${vehicle.id}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 group">
                              <span className="text-gray-700 truncate">{vehicle.pacQid || "—"}</span>
                              {vehicle.pacQid && (
                                <button onClick={() => copyToClipboard(vehicle.pacQid!, `pacQid-${vehicle.id}`)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#1a3a6e] shrink-0" title="Copy PAC-QID">
                                  {copiedKey === `pacQid-${vehicle.id}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 truncate">{vehicle.bodyApplication || "—"}</td>
                          <td className="px-4 py-3 text-gray-700 truncate">{vehicle.color || "—"}</td>
                          <td className="px-4 py-3 text-gray-700 truncate">{vehicle.fuelType || "—"}</td>
                          <td className="px-4 py-3">
                            <AvailabilityBadge orderStatus={vehicle.orderStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button onClick={() => setDetailVehicle({ vehicle, qty })}
                                className="text-[13px] text-[#1a3a6e] hover:underline font-medium whitespace-nowrap">
                                View Details
                              </button>
                              <button onClick={() => setReserveVehicle({ vehicle, qty })}
                                className="text-[13px] bg-[#1a3a6e] hover:bg-[#142d56] text-white font-semibold px-3 py-1.5 rounded-md transition-colors whitespace-nowrap">
                                I&apos;m Interested
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {listTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-1 gap-3">
                  <p className="text-xs text-gray-500">
                    Showing {(listPage - 1) * LIST_PAGE_SIZE + 1}–{Math.min(listPage * LIST_PAGE_SIZE, allGrouped.length)} of {allGrouped.length} vehicles
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setListPage((p) => Math.max(1, p - 1)); setSelectedKeys(new Set()); }}
                      disabled={listPage === 1}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: listTotalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === listTotalPages || Math.abs(p - listPage) <= 1)
                      .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-xs">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => { setListPage(p as number); setSelectedKeys(new Set()); }}
                            className={`w-8 h-8 text-xs font-semibold rounded-md ${p === listPage ? "bg-[#1a3a6e] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      onClick={() => { setListPage((p) => Math.min(listTotalPages, p + 1)); setSelectedKeys(new Set()); }}
                      disabled={listPage === listTotalPages}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* List-view: Vehicle Details Modal */}
      {detailVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailVehicle(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 text-base leading-tight">
                  {[detailVehicle.vehicle.year, detailVehicle.vehicle.oem, detailVehicle.vehicle.specs].filter(Boolean).join(" ") || "Vehicle Details"}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">Full vehicle information</p>
              </div>
              <button onClick={() => setDetailVehicle(null)} className="text-gray-500 hover:text-gray-800 text-xl leading-none ml-4">✕</button>
            </div>
            <div className="divide-y divide-gray-100 text-sm">
              {([
                [{ label: "Stock #",  value: detailVehicle.vehicle.stockNumber },       { label: "VIN",              value: detailVehicle.vehicle.vin, small: true }],
                [{ label: "PAC-QID", value: detailVehicle.vehicle.pacQid },             { label: "OEM",              value: detailVehicle.vehicle.oem }],
                [{ label: "Year",    value: detailVehicle.vehicle.year },               { label: "Body Application", value: detailVehicle.vehicle.bodyApplication }],
                [{ label: "Color",   value: detailVehicle.vehicle.color },              { label: "Fuel Type",        value: detailVehicle.vehicle.fuelType }],
                [{ label: "Order Date", value: detailVehicle.vehicle.orderDate },       { label: "Order Type",       value: detailVehicle.vehicle.orderType }],
                [{ label: "Order #", value: detailVehicle.vehicle.orderNumber },        { label: "Location",         value: detailVehicle.vehicle.location }],
                [{ label: "Recall Status", value: detailVehicle.vehicle.recalls },      { label: "OEM Status",       value: detailVehicle.vehicle.orderStatus }],
              ] as { label: string; value: string | null; small?: boolean }[][]).map((row, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 px-5 py-3">
                  {row.map(({ label, value, small = false }) => (
                    <div key={label}>
                      <p className="text-xs text-[#1a3a6e] font-medium tracking-wide">{label}</p>
                      <p className={`font-semibold text-gray-800 mt-0.5 ${small ? "break-all text-xs" : ""}`}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
              ))}
              {detailVehicle.vehicle.comments && (
                <div className="px-5 py-3">
                  <p className="text-xs text-[#1a3a6e] font-medium tracking-wide">Pritchard Comments</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{detailVehicle.vehicle.comments}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reserve / I'm Interested Modal */}
      {reserveVehicle && (
        <ReserveModal
          vehicle={reserveVehicle.vehicle}
          availableQty={reserveVehicle.qty}
          open={true}
          onOpenChange={(open) => { if (!open) { setReserveVehicle(null); setMultiAdditional([]); } }}
          onSuccess={() => { setReserveVehicle(null); setMultiAdditional([]); setSelectedKeys(new Set()); fetchVehicles(); }}
          initialAdditionalVehicles={multiAdditional}
        />
      )}

      {/* Floating multi-select bar */}
      {viewMode === "list" && selectedKeys.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-40 flex items-center gap-3 bg-[#1a3a6e] text-white px-5 py-3 rounded-full shadow-xl justify-center">
          <span className="text-sm font-semibold">{selectedKeys.size} vehicle{selectedKeys.size > 1 ? "s" : ""} selected</span>
          <button onClick={openMultiInterest}
            className="bg-white text-[#1a3a6e] text-sm font-bold px-4 py-1.5 rounded-full hover:bg-blue-50 transition-colors">
            I&apos;m Interested
          </button>
          <button onClick={() => setSelectedKeys(new Set())} className="text-white/70 hover:text-white transition-colors ml-1" title="Clear selection">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
