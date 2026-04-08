/**
 * fieldMap.ts — maps PDD_Status_Report.xlsx column headers → Prisma Vehicle field names.
 */

export const EXCEL_TO_DB: Record<string, string> = {
  "PARTNER":              "partner",
  "SHIP TO - LOCATION":   "location",
  "OEM":                  "oem",
  "ORDER DATE":           "orderDate",
  "ORDER TYPE":           "orderType",
  "ORDER #":              "orderNumber",
  "STOCK #":              "stockNumber",
  "VIN":                  "vin",
  "MODEL YEAR":           "year",
  "PAC-QID":              "pacQid",
  "SPECS":                "specs",
  "BODY APPLICATION":     "bodyApplication",
  "COLOR":                "color",
  "SALE PRICE":           "salePrice",
  "TARGET PRODUCTION":    "targetProduction",
  "OEM STATUS":           "orderStatus",
  "ETA":                  "eta",
  "RECALL STATUS":        "recalls",
  "PRITCHARD COMMENTS":   "comments",
  "BODY CODE":            "bodyCode",
  "Fuel Type":            "fuelType",
};

export const SKIP_COLUMNS = new Set<string>([]);

// Both casings exist in the wild
export const STOCK_NUMBER_COLUMN = "STOCK #";
export const STOCK_NUMBER_COLUMN_LEGACY = "Stock #";

// Only import rows where PARTNER equals this value
export const PARTNER_FILTER = "STOCK - PDD";

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function excelSerialToDateString(serial: number): string {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 86400000);
  return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

const DATE_FIELDS = new Set(["orderDate", "eta"]);

export function normalizeValue(dbField: string, raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  const str = String(raw).trim();
  if (str === "") return null;
  if (str.toLowerCase() === "n/a" || str.toLowerCase() === "tbd") return str;

  if (DATE_FIELDS.has(dbField) && typeof raw === "number") {
    return excelSerialToDateString(raw);
  }

  if (dbField === "salePrice" && typeof raw === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(raw);
  }

  if (dbField === "year") {
    return String(Math.round(Number(str)));
  }

  return str;
}
