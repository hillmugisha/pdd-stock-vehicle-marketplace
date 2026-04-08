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
import * as path from "path";

// Load .env from the marketplace directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const EXCEL_FILE_PATH =
  process.env.EXCEL_FILE_PATH ??
  path.resolve(__dirname, "..", "..", "PDD_Status_Report.xlsx");

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
