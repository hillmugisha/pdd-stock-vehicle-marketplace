import * as XLSX from "xlsx";
import {
  EXCEL_TO_DB,
  SKIP_COLUMNS,
  STOCK_NUMBER_COLUMN,
  STOCK_NUMBER_COLUMN_LEGACY,
  PARTNER_FILTER,
  normalizeValue,
} from "./fieldMap";

export interface ExcelVehicleRow {
  stockNumber: string;
  [field: string]: string | null;
}

export interface ReadResult {
  rows: ExcelVehicleRow[];
  skippedRows: { rowIndex: number; reason: string }[];
}

export function readExcelFile(filePath: string): ReadResult {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
  });

  const rows: ExcelVehicleRow[] = [];
  const skippedRows: { rowIndex: number; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2; // 1-indexed + header row

    // ── Filter: only PARTNER = "STOCK - PDD" ────────────────────────────────
    const partnerKey = Object.keys(raw).find((k) => k.trim() === "PARTNER") ?? null;
    const partnerVal = partnerKey ? String(raw[partnerKey] ?? "").trim() : "";
    if (partnerVal !== PARTNER_FILTER) {
      skippedRows.push({ rowIndex: rowNum, reason: `PARTNER "${partnerVal}" ≠ "${PARTNER_FILTER}"` });
      continue;
    }

    // ── Resolve stock number ─────────────────────────────────────────────────
    const rawStockKey =
      Object.keys(raw).find(
        (k) => k.trim() === STOCK_NUMBER_COLUMN || k.trim() === STOCK_NUMBER_COLUMN_LEGACY
      ) ?? null;
    const stockNumber = rawStockKey ? String(raw[rawStockKey] ?? "").trim() : "";

    const normalizedStock = stockNumber.toLowerCase();
    if (!stockNumber || normalizedStock === "n/a" || normalizedStock === "tbd") {
      skippedRows.push({ rowIndex: rowNum, reason: `Invalid Stock # (${stockNumber || "empty"})` });
      continue;
    }

    const record: ExcelVehicleRow = { stockNumber };

    for (const [excelHeader, rawValue] of Object.entries(raw)) {
      const trimmedHeader = excelHeader.trim();
      if (SKIP_COLUMNS.has(trimmedHeader)) continue;

      const dbField = EXCEL_TO_DB[excelHeader] ?? EXCEL_TO_DB[trimmedHeader] ?? null;
      if (!dbField || dbField === "stockNumber") continue;

      record[dbField] = normalizeValue(dbField, rawValue);
    }

    rows.push(record);
  }

  return { rows, skippedRows };
}
