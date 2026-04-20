/**
 * scripts/run-sync.ts
 *
 * Standalone sync script — runs one full sync cycle then exits.
 * Used by Windows Task Scheduler (or any external scheduler).
 *
 * Run with:
 *   npx ts-node --project tsconfig.scripts.json scripts/run-sync.ts
 *
 * Or via the npm script:
 *   npm run sync
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load .env from the marketplace directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function resolveExcelPath(): string {
  if (process.env.EXCEL_FILE_PATH) return process.env.EXCEL_FILE_PATH;
  const dir = path.resolve(__dirname, "..", "..", "Prod Data Files");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".xlsx") && !f.startsWith("~$"));
  if (files.length === 0) throw new Error(`No xlsx files found in ${dir}`);
  files.sort(
    (a, b) =>
      fs.statSync(path.join(dir, b)).mtimeMs -
      fs.statSync(path.join(dir, a)).mtimeMs
  );
  return path.join(dir, files[0]);
}

const EXCEL_FILE_PATH = resolveExcelPath();

async function main() {
  console.log(`[sync] Starting at ${new Date().toISOString()}`);
  console.log(`[sync] Excel source: ${EXCEL_FILE_PATH}`);

  // Lazy-import after env is loaded so Prisma picks up DATABASE_URL
  const { runSync } = await import("../src/lib/sync/syncEngine");

  try {
    const result = await runSync(EXCEL_FILE_PATH, "scheduler");
    console.log("[sync] Result:", JSON.stringify(result, null, 2));
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("[sync] Fatal error:", err);
    process.exit(2);
  }
}

main();
