"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMSRP, getStatusColor, cn } from "@/lib/utils";
import { Truck, Calendar, MapPin, Hash, BadgeCheck, Loader2 } from "lucide-react";

interface VehicleData {
  id: string;
  year: string | null;
  oem: string | null;
  specs: string | null;
  bodyApplication: string | null;
  stockNumber: string;
  color: string | null;
  salePrice: string | null;
  orderStatus: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReservationData {
  id: string;
  status: string;
  reservedBy: string | null;
  reservedFor: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: VehicleData;
}

interface DashboardClientProps {
  user: { email: string };
  reservations: ReservationData[];
}

export function DashboardClient({ user, reservations: initial }: DashboardClientProps) {
  const [reservations, setReservations] = useState(initial);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r))
        );
      }
    } finally {
      setCancellingId(null);
    }
  };

  const active = reservations.filter((r) => r.status === "active");
  const past = reservations.filter((r) => r.status !== "active");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
        <p className="text-gray-500 text-sm mt-1">
          {user.email} &mdash; {active.length} active reservation
          {active.length !== 1 ? "s" : ""}
        </p>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">No reservations yet</h2>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Browse available inventory and reserve a vehicle.
          </p>
          <Link
            href="/"
            className="inline-flex items-center bg-[#1a3a6e] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#142d56] transition-colors"
          >
            Browse Inventory
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-green-500" />
                Active Reservations ({active.length})
              </h2>
              <div className="grid gap-4">
                {active.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    cancelling={cancellingId === r.id}
                    onCancel={() => handleCancel(r.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Past Reservations ({past.length})
              </h2>
              <div className="grid gap-4 opacity-60">
                {past.map((r) => (
                  <ReservationCard key={r.id} reservation={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ReservationCard({
  reservation,
  onCancel,
  cancelling = false,
}: {
  reservation: ReservationData;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const { vehicle } = reservation;
  const title = [vehicle.year, vehicle.oem, vehicle.bodyApplication || vehicle.specs].filter(Boolean).join(" ");
  const isActive = reservation.status === "active";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{title || "Unknown Vehicle"}</h3>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-3 text-sm">
            <div className="flex items-start gap-1.5">
              <Hash className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Stock #</p>
                <p className="font-medium text-gray-800">{vehicle.stockNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Truck className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Vehicle Status</p>
                <span
                  className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block",
                    getStatusColor(vehicle.orderStatus)
                  )}
                >
                  {vehicle.orderStatus || "-"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="font-medium text-gray-800">{vehicle.location || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Reserved On</p>
                <p className="font-medium text-gray-800">
                  {new Date(reservation.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
            {vehicle.color && <span>Color: {vehicle.color}</span>}
            {vehicle.salePrice && <span>Price: {vehicle.salePrice}</span>}
            {reservation.reservedFor && <span>For: {reservation.reservedFor}</span>}
            {reservation.notes && <span>Notes: {reservation.notes}</span>}
          </div>
        </div>

        {isActive && onCancel && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="text-xs text-red-500 hover:text-red-700 hover:underline font-medium whitespace-nowrap disabled:opacity-50 flex items-center gap-1"
          >
            {cancelling && <Loader2 className="w-3 h-3 animate-spin" />}
            {cancelling ? "Cancelling..." : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
