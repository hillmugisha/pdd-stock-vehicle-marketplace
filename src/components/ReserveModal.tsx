"use client";

import { useState, useEffect, useRef } from "react";
import { Vehicle } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Mail, Plus, X, Search } from "lucide-react";

interface AdditionalVehicle {
  vehicle: Vehicle;
  quantity: string;
}

interface ReserveModalProps {
  vehicle: Vehicle;
  availableQty?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialAdditionalVehicles?: { vehicle: Vehicle; qty: number }[];
}

export function ReserveModal({
  vehicle,
  availableQty = 1,
  open,
  onOpenChange,
  onSuccess,
  initialAdditionalVehicles,
}: ReserveModalProps) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [additionalVehicles, setAdditionalVehicles] = useState<AdditionalVehicle[]>(
    initialAdditionalVehicles?.map((a) => ({ vehicle: a.vehicle, quantity: "1" })) ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Vehicle picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [groupedPicker, setGroupedPicker] = useState<{ vehicle: Vehicle; qty: number }[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const vehicleName = vehicle.specs || [vehicle.year, vehicle.oem].filter(Boolean).join(" ");

  // Sync pre-selected vehicles when modal opens with initialAdditionalVehicles
  useEffect(() => {
    if (open) {
      setAdditionalVehicles(
        initialAdditionalVehicles?.map((a) => ({ vehicle: a.vehicle, quantity: "1" })) ?? []
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pre-fetch and group vehicles as soon as modal opens
  useEffect(() => {
    if (open && groupedPicker.length === 0) {
      setPickerLoading(true);
      fetch("/api/vehicles?limit=200")
        .then((r) => r.json())
        .then((d) => {
          const vehicles: Vehicle[] = d.vehicles || [];
          const map = new Map<string, { vehicle: Vehicle; qty: number }>();
          for (const v of vehicles) {
            const key = v.pacQid ?? v.stockNumber ?? v.id;
            if (map.has(key)) {
              map.get(key)!.qty += 1;
            } else {
              map.set(key, { vehicle: v, qty: 1 });
            }
          }
          setGroupedPicker(Array.from(map.values()));
        })
        .finally(() => setPickerLoading(false));
    }
  }, [open, groupedPicker.length]);

  const getVehicleQty = (v: Vehicle) =>
    groupedPicker.find((g) => g.vehicle.id === v.id)?.qty ?? availableQty;

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setPickerSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedIds = new Set([vehicle.id, ...additionalVehicles.map((a) => a.vehicle.id)]);

  const filteredPicker = groupedPicker.filter(({ vehicle: v }) => {
    if (selectedIds.has(v.id)) return false;
    const name = [v.specs, v.oem, v.bodyApplication, v.pacQid].filter(Boolean).join(" ").toLowerCase();
    return pickerSearch === "" || name.includes(pickerSearch.toLowerCase());
  });

  const addVehicle = (v: Vehicle) => {
    setAdditionalVehicles((prev) => [...prev, { vehicle: v, quantity: "1" }]);
    setShowPicker(false);
    setPickerSearch("");
  };

  const removeAdditional = (id: string) => {
    setAdditionalVehicles((prev) => prev.filter((a) => a.vehicle.id !== id));
  };

  const updateQty = (id: string, qty: string) => {
    setAdditionalVehicles((prev) =>
      prev.map((a) => (a.vehicle.id === id ? { ...a, quantity: qty } : a))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !company.trim() || !email.trim()) {
      setError("Full name, company and email are required.");
      return;
    }
    if (Number(quantity) > availableQty) {
      setError(`Quantity for the primary vehicle cannot exceed ${availableQty}.`);
      return;
    }
    for (const a of additionalVehicles) {
      const maxQty = getVehicleQty(a.vehicle);
      if (Number(a.quantity) > maxQty) {
        const name = a.vehicle.specs || [a.vehicle.year, a.vehicle.oem].filter(Boolean).join(" ");
        setError(`Quantity for "${name}" cannot exceed ${maxQty}.`);
        return;
      }
    }
    setLoading(true);
    setError(null);

    try {
      const vehicles = [
        { vehicleId: vehicle.id, vehicleName, bodyApplication: vehicle.bodyApplication, stockNumber: vehicle.stockNumber, quantity },
        ...additionalVehicles.map((a) => ({
          vehicleId: a.vehicle.id,
          vehicleName: a.vehicle.specs || [a.vehicle.year, a.vehicle.oem].filter(Boolean).join(" "),
          bodyApplication: a.vehicle.bodyApplication,
          stockNumber: a.vehicle.stockNumber,
          quantity: a.quantity,
        })),
      ];

      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, company, email, message: message.trim() || undefined, vehicles }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setSuccess(false);
    setFullName("");
    setCompany("");
    setEmail("");
    setQuantity("1");
    setAdditionalVehicles([]);
    setShowPicker(false);
    setPickerSearch("");
    setGroupedPicker([]);
    if (success) onSuccess();
    onOpenChange(false);
  };

  const totalVehicles = 1 + additionalVehicles.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-auto sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900">Interest Submitted!</h2>
            <p className="text-gray-500 text-sm max-w-xs">
              The PDD team will be in touch with you shortly regarding your{" "}
              <span className="font-semibold text-gray-700">
                {totalVehicles} vehicle{totalVehicles > 1 ? "s" : ""}
              </span>.
            </p>
            <Button onClick={handleClose} className="mt-2 bg-[#1a3a6e] hover:bg-[#142d56] text-white">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">Express Interest</DialogTitle>
            </DialogHeader>

            {/* Primary vehicle */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 text-sm">
              <p className="text-xs text-[#1a3a6e] font-semibold uppercase tracking-wide mb-2">
                Vehicle You&apos;re Interested In
              </p>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900 text-base">{vehicleName || "Unknown Vehicle"}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-600">
                    {vehicle.bodyApplication && <span><span className="font-medium">Body Application:</span> {vehicle.bodyApplication}</span>}
                  </div>
                </div>
                <div className="shrink-0">
                  <label className="text-xs text-gray-500 block mb-0.5">Qty (max {availableQty})</label>
                  <input
                    type="number"
                    min="1"
                    max={availableQty}
                    value={quantity}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), availableQty);
                      setQuantity(String(val));
                    }}
                    className={`w-16 h-7 text-sm border rounded px-2 focus:outline-none focus:ring-1 focus:ring-[#1a3a6e] ${Number(quantity) > availableQty ? "border-red-400" : "border-gray-300"}`}
                  />
                </div>
              </div>
            </div>

            {/* Additional vehicles */}
            {additionalVehicles.map((a) => {
              const name = a.vehicle.specs || [a.vehicle.year, a.vehicle.oem].filter(Boolean).join(" ");
              return (
                <div key={a.vehicle.id} className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 text-sm relative">
                  <button
                    type="button"
                    onClick={() => removeAdditional(a.vehicle.id)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-start justify-between gap-2 pr-6">
                    <div>
                      <p className="font-bold text-gray-900">{name || "Unknown Vehicle"}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-600">
                        {a.vehicle.bodyApplication && <span><span className="font-medium">Body Application:</span> {a.vehicle.bodyApplication}</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {(() => {
                        const maxQty = getVehicleQty(a.vehicle);
                        return (
                          <>
                            <label className="text-xs text-gray-500 block mb-0.5">Qty (max {maxQty})</label>
                            <input
                              type="number"
                              min="1"
                              max={maxQty}
                              value={a.quantity}
                              onChange={(e) => {
                                const val = Math.min(Number(e.target.value), maxQty);
                                updateQty(a.vehicle.id, String(val));
                              }}
                              className={`w-16 h-7 text-sm border rounded px-2 focus:outline-none focus:ring-1 focus:ring-[#1a3a6e] ${Number(a.quantity) > maxQty ? "border-red-400" : "border-gray-300"}`}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Vehicle picker */}
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-1.5 text-sm text-[#1a3a6e] font-medium border border-[#1a3a6e] rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Vehicle
              </button>

              {showPicker && (
                <div className="absolute z-50 top-10 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl min-w-[340px]">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                      <input
                        autoFocus
                        type="text"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1a3a6e]"
                        placeholder="Search by specs, OEM, body application..."
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {pickerLoading ? (
                      <li className="px-3 py-3 text-sm text-gray-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading vehicles...
                      </li>
                    ) : filteredPicker.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-gray-400">No vehicles found</li>
                    ) : (
                      filteredPicker.map(({ vehicle: v, qty: vQty }) => {
                        const name = v.specs || [v.year, v.oem].filter(Boolean).join(" ");
                        return (
                          <li
                            key={v.id}
                            onClick={() => addVehicle(v)}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{name}</p>
                              <p className="text-xs text-gray-500">
                                {[v.bodyApplication && `Body: ${v.bodyApplication}`, v.pacQid && `PAC-QID: ${v.pacQid}`].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full">
                              Qty: {vQty}
                            </span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                <Input id="fullName" placeholder="e.g. John Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Company <span className="text-red-500">*</span></Label>
                <Input id="company" placeholder="e.g. ABC Dealership" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" placeholder="e.g. john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <textarea
                  id="message"
                  rows={3}
                  maxLength={1000}
                  placeholder="Any questions or additional details..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                <p className="text-xs text-gray-400 text-right">{message.length}/1000</p>
              </div>

              {/* Sales rep note */}
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <p>
                  We&apos;ll send your Sales rep{" "}
                  <span className="font-semibold">Brady Christianson</span> an email letting him know you&apos;re interested.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-[#1a3a6e] hover:bg-[#142d56] text-white">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? "Submitting..." : "Submit Interest"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
