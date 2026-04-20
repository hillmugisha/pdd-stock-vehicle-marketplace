import { NextResponse } from "next/server";

/** GET /api/sync/last-refreshed — public endpoint returning the most recent completed sync timestamp */
export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const log = await prisma.syncLog.findFirst({
    where: { status: { in: ["success", "partial"] } },
    orderBy: { finishedAt: "desc" },
    select: { finishedAt: true },
  });
  return NextResponse.json({ lastRefreshed: log?.finishedAt ?? null });
}
