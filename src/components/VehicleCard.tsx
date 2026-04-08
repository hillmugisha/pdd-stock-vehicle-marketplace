"use client";

import { useState } from "react";
import { Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { ReserveModal } from "@/components/ReserveModal";
import { Truck } from "lucide-react";

interface VehicleCardProps {
  vehicle: Vehicle;
  qty?: number;
  isAuthenticated: boolean;
  onReserved?: () => void;
}

function getAvailabilityBadge(orderStatus: string | null): { label: string; className: string } {
  const s = (orderStatus ?? "").toLowerCase();
  if (s === "delivered")                   return { label: "On Ground",    className: "bg-purple-100 text-purple-800 border border-purple-200" };
  if (s.includes("transit"))               return { label: "In Transit",   className: "bg-yellow-100 text-yellow-800 border border-yellow-200" };
  if (s.includes("unscheduled") || s === "tbd" || s === "") return { label: "Unscheduled", className: "bg-gray-100 text-gray-600 border border-gray-300" };
  if (s.includes("scheduled"))             return { label: "In Build",     className: "bg-orange-100 text-orange-800 border border-orange-200" };
  return { label: "Unscheduled", className: "bg-gray-100 text-gray-600 border border-gray-300" };
}

export function VehicleCard({ vehicle, qty = 1, onReserved }: VehicleCardProps) {
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

  const title = vehicle.specs || [vehicle.year, vehicle.oem].filter(Boolean).join(" ");
  const badge = getAvailabilityBadge(vehicle.orderStatus);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">

        {/* Header — fixed height so all cards align uniformly */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 pt-4 pb-5 relative overflow-hidden h-[158px] flex flex-col">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />

          {/* Qty badge + price label */}
          <div className="flex items-start justify-between mb-3 relative z-10">
            <span className="bg-green-100 text-green-800 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full">
              Qty: {qty}
            </span>
            <span className="text-xs font-semibold text-[#1a3a6e] border border-[#1a3a6e]/30 bg-[#1a3a6e]/5 px-2.5 py-1 rounded-full">
              Email for Price
            </span>
          </div>

          {/* Icon + Title */}
          <div className="flex items-start gap-3 relative z-10">
            <div className="bg-gray-200/60 rounded-lg p-2.5 border border-white/10 shrink-0 mt-0.5">
              <Truck className="w-8 h-8 text-gray-500" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-500 text-xs font-medium tracking-widest mb-0.5">
                {vehicle.oem || "Vehicle"}
              </p>
              <h3 className="text-gray-900 font-bold text-sm leading-snug line-clamp-2">
                {title || "Unknown Vehicle"}
              </h3>
              <p className="text-gray-400 text-xs font-medium mt-1 tracking-wide truncate">
                VIN: {vehicle.vin || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex flex-col gap-3 mb-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-x-4">
              <div className="min-h-[38px]">
                <p className="text-[#1a3a6e] text-xs font-medium tracking-wide">PAC-QID</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5 leading-snug">{vehicle.pacQid || "-"}</p>
              </div>
              <div className="min-h-[38px]">
                <p className="text-[#1a3a6e] text-xs font-medium tracking-wide">Year</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5 leading-snug">{vehicle.year || "-"}</p>
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-x-4">
              <div className="min-h-[38px]">
                <p className="text-[#1a3a6e] text-xs font-medium tracking-wide">Color</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5 leading-snug">{vehicle.color || "-"}</p>
              </div>
              <div className="min-h-[38px]">
                <p className="text-[#1a3a6e] text-xs font-medium tracking-wide">Body Application</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5 leading-snug">{vehicle.bodyApplication || "-"}</p>
              </div>
            </div>
            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-x-4">
              <div className="min-h-[38px]">
                <p className="text-[#1a3a6e] text-xs font-medium tracking-wide">Fuel Type</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5 leading-snug">{vehicle.fuelType || "-"}</p>
              </div>
              <div className="min-h-[38px]">
                <p className="text-[#1a3a6e] text-xs font-medium tracking-wide">Availability</p>
                <div className="mt-1">
                  <span className={`${badge.className} text-xs font-semibold px-2.5 py-1 rounded-full`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* View Details */}
          <div className="mt-auto pt-3 border-t border-gray-100 mb-3 text-center">
            <button
              onClick={() => setShowMoreModal(true)}
              className="text-[13px] text-[#1a3a6e] hover:underline font-medium"
            >
              View Details
            </button>
          </div>

          <Button
            onClick={() => setShowReserveModal(true)}
            className="w-full text-sm font-semibold py-2 rounded-lg bg-[#1a3a6e] hover:bg-[#142d56] text-white transition-colors"
          >
            I&apos;m Interested
          </Button>
        </div>
      </div>

      <ReserveModal
        vehicle={vehicle}
        availableQty={qty}
        open={showReserveModal}
        onOpenChange={setShowReserveModal}
        onSuccess={() => { setShowReserveModal(false); onReserved?.(); }}
      />

      {/* View Details Modal */}
      {showMoreModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowMoreModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 text-base leading-tight">{title || "Vehicle Details"}</h2>
                <p className="text-gray-500 text-xs mt-0.5">Full vehicle information</p>
              </div>
              <button onClick={() => setShowMoreModal(false)} className="text-gray-500 hover:text-gray-800 text-xl leading-none ml-4">✕</button>
            </div>

            <div className="divide-y divide-gray-100 text-sm">
              {[
                [{ label: "Stock #",   value: vehicle.stockNumber },        { label: "VIN",              value: vehicle.vin, small: true }],
                [{ label: "PAC-QID",   value: vehicle.pacQid },             { label: "OEM",              value: vehicle.oem }],
                [{ label: "Year",      value: vehicle.year },               { label: "Body Application", value: vehicle.bodyApplication }],
                [{ label: "Color",     value: vehicle.color },              { label: "Fuel Type",        value: vehicle.fuelType }],
                [{ label: "Order Date",value: vehicle.orderDate },          { label: "Order Type",       value: vehicle.orderType }],
                [{ label: "Order #",   value: vehicle.orderNumber },        { label: "Location",         value: vehicle.location }],
                [{ label: "Recall Status", value: vehicle.recalls },        { label: "OEM Status",       value: vehicle.orderStatus }],
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-2 gap-x-6 px-5 py-3">
                  {row.map(({ label, value, small }) => (
                    <div key={label}>
                      <p className="text-xs text-[#1a3a6e] font-medium tracking-wide">{label}</p>
                      <p className={`font-semibold text-gray-800 mt-0.5 ${small ? "break-all text-xs" : ""}`}>{value || "-"}</p>
                    </div>
                  ))}
                </div>
              ))}
              {vehicle.comments && (
                <div className="px-5 py-3">
                  <p className="text-xs text-[#1a3a6e] font-medium tracking-wide">Pritchard Comments</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{vehicle.comments}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
