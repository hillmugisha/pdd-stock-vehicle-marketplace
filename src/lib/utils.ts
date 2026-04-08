import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMSRP(msrp: string | null | undefined): string {
  if (!msrp) return "—";
  const cleaned = msrp.replace(/[$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return msrp.trim();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function getStatusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "bg-green-100 text-green-800";
    case "in transit":
      return "bg-yellow-400 text-yellow-900";
    case "in production":
      return "bg-yellow-100 text-yellow-800";
    case "ordered":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
