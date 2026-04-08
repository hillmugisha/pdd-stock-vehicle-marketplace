import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  const reservations = dbUser
    ? await prisma.reservation.findMany({
        where: { userId: dbUser.id },
        include: { vehicle: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Serialize dates to strings for client component
  const serialized = reservations.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    vehicle: {
      ...r.vehicle,
      createdAt: r.vehicle.createdAt.toISOString(),
      updatedAt: r.vehicle.updatedAt.toISOString(),
    },
  }));

  return <DashboardClient user={{ email: user.email! }} reservations={serialized} />;
}
