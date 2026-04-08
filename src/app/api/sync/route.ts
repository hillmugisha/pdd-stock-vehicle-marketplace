/**
 * POST /api/sync
 *
 * Triggers a manual inventory sync.
 *
 * Security: protected by a shared secret in the Authorization header.
 * Set SYNC_SECRET in your .env file.
 *
 * Usage:
 *   curl -X POST https://your-site.com/api/sync \
 *     -H "Authorization: Bearer <SYNC_SECRET>"
 *
 * Returns:
 *   200 { inserted, updated, inactivated, reactivated, failed, totalRows, duration_ms }
 *   401 Unauthorized
 *   500 { error: "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync/syncEngine";
import path from "path";

const EXCEL_FILE_PATH =
  process.env.EXCEL_FILE_PATH ??
  path.join(process.cwd(), "..", "PDD_Stock_4_6_26.xlsx");

const SYNC_SECRET = process.env.SYNC_SECRET ?? "";

// Simple in-memory lock to prevent concurrent syncs
let syncInProgress = false;

export async function POST(request: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────
  if (SYNC_SECRET) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    if (token !== SYNC_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Concurrency guard ─────────────────────────────────────────────────────
  if (syncInProgress) {
    return NextResponse.json(
      { error: "Sync already in progress — try again in a moment." },
      { status: 429 }
    );
  }

  syncInProgress = true;
  try {
    const result = await runSync(EXCEL_FILE_PATH, "api");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    syncInProgress = false;
  }
}

/** GET /api/sync — returns the last 10 sync logs */
export async function GET(request: NextRequest) {
  if (SYNC_SECRET) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (token !== SYNC_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { prisma } = await import("@/lib/prisma");
  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ logs });
}
