import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Only allow owner or admin to cancel
    if (reservation.userId !== dbUser.id && dbUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.reservation.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return NextResponse.json(
      { error: "Failed to cancel reservation" },
      { status: 500 }
    );
  }
}
