import { prisma } from "@/lib/prisma";
import { readExcelFile, ExcelVehicleRow } from "./excelReader";
import type { Prisma } from "@prisma/client";

const COMPARABLE_FIELDS: (keyof Prisma.VehicleUpdateInput)[] = [
  "partner", "location", "oem", "orderDate", "orderType", "orderNumber",
  "vin", "year", "pacQid", "specs", "bodyApplication", "color",
  "salePrice", "targetProduction", "orderStatus", "eta", "recalls",
  "comments", "bodyCode", "fuelType",
];

export interface SyncResult {
  inserted: number;
  updated: number;
  inactivated: number;
  reactivated: number;
  failed: number;
  totalRows: number;
  errors: { stockNumber: string; error: string }[];
  duration_ms: number;
}

function hasChanges(excelRow: ExcelVehicleRow, dbRow: Record<string, unknown>): boolean {
  for (const field of COMPARABLE_FIELDS) {
    const excelVal = (excelRow[field as string] ?? null) as string | null;
    const dbVal = (dbRow[field as string] ?? null) as string | null;
    if (excelVal !== dbVal) return true;
  }
  return false;
}

export async function runSync(
  filePath: string,
  triggeredBy: "scheduler" | "manual" | "api" = "scheduler"
): Promise<SyncResult> {
  const startedAt = Date.now();

  const syncLog = await prisma.syncLog.create({
    data: { triggeredBy, status: "running" },
  });

  const result: SyncResult = {
    inserted: 0, updated: 0, inactivated: 0, reactivated: 0,
    failed: 0, totalRows: 0, errors: [], duration_ms: 0,
  };

  try {
    const { rows: excelRows, skippedRows } = readExcelFile(filePath);
    result.totalRows = excelRows.length;

    if (skippedRows.length > 0) {
      console.warn(`[sync] Skipped ${skippedRows.length} rows (partner filter or invalid stock #)`);
    }

    const excelMap = new Map<string, ExcelVehicleRow>();
    for (const row of excelRows) {
      excelMap.set(row.stockNumber, row);
    }

    const dbVehicles = await prisma.vehicle.findMany({
      select: {
        id: true, stockNumber: true, isActive: true,
        partner: true, location: true, oem: true, orderDate: true,
        orderType: true, orderNumber: true, vin: true, year: true,
        pacQid: true, specs: true, bodyApplication: true, color: true,
        salePrice: true, targetProduction: true, orderStatus: true,
        eta: true, recalls: true, comments: true, bodyCode: true, fuelType: true,
      },
    });

    const dbMap = new Map<string, typeof dbVehicles[number]>();
    for (const v of dbVehicles) dbMap.set(v.stockNumber, v);

    for (const excelRow of excelRows) {
      const { stockNumber, ...fields } = excelRow;
      try {
        const dbRecord = dbMap.get(stockNumber);

        if (!dbRecord) {
          await prisma.vehicle.create({
            data: { stockNumber, isActive: true, ...fields } as unknown as Prisma.VehicleUncheckedCreateInput,
          });
          result.inserted++;
          console.log(`[sync] INSERT  ${stockNumber}`);
        } else if (!dbRecord.isActive) {
          await prisma.vehicle.update({
            where: { stockNumber },
            data: { isActive: true, ...fields } as unknown as Prisma.VehicleUncheckedUpdateInput,
          });
          result.reactivated++;
          console.log(`[sync] REACTIVATE  ${stockNumber}`);
        } else if (hasChanges(excelRow, dbRecord)) {
          await prisma.vehicle.update({
            where: { stockNumber },
            data: fields as unknown as Prisma.VehicleUncheckedUpdateInput,
          });
          result.updated++;
          console.log(`[sync] UPDATE  ${stockNumber}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.failed++;
        result.errors.push({ stockNumber, error: msg });
        console.error(`[sync] FAILED  ${stockNumber}: ${msg}`);
      }
    }

    // Inactivate DB vehicles no longer in filtered Excel set
    for (const dbRecord of dbVehicles) {
      if (!excelMap.has(dbRecord.stockNumber) && dbRecord.isActive) {
        try {
          await prisma.vehicle.update({
            where: { stockNumber: dbRecord.stockNumber },
            data: { isActive: false },
          });
          result.inactivated++;
          console.log(`[sync] INACTIVATE  ${dbRecord.stockNumber}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.failed++;
          result.errors.push({ stockNumber: dbRecord.stockNumber, error: msg });
        }
      }
    }

    result.duration_ms = Date.now() - startedAt;
    const status =
      result.failed === 0 ? "success" :
      result.failed < result.totalRows ? "partial" : "failed";

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        inserted: result.inserted, updated: result.updated,
        inactivated: result.inactivated, reactivated: result.reactivated,
        failed: result.failed, totalRows: result.totalRows,
        errors: result.errors.length > 0 ? result.errors : undefined,
        status,
      },
    });

    console.log(
      `[sync] Done in ${result.duration_ms}ms — ` +
      `inserted=${result.inserted} updated=${result.updated} ` +
      `inactivated=${result.inactivated} reactivated=${result.reactivated} failed=${result.failed}`
    );
  } catch (fatalErr) {
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    result.duration_ms = Date.now() - startedAt;
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { finishedAt: new Date(), status: "failed", errors: [{ stockNumber: "__fatal__", error: msg }] },
    });
    console.error(`[sync] FATAL: ${msg}`);
    throw fatalErr;
  }

  return result;
}
