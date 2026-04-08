import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, reservedBy, reservedFor, notes } = body;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      );
    }

    // Check vehicle exists and is not already reserved
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        reservations: { where: { status: "active" } },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (vehicle.reservations.length > 0) {
      return NextResponse.json(
        { error: "Vehicle is already reserved" },
        { status: 409 }
      );
    }

    // Get or create user record in our DB
    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || null,
        },
      });
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        vehicleId,
        userId: dbUser.id,
        reservedBy: reservedBy || dbUser.name || dbUser.email,
        reservedFor: reservedFor || null,
        notes: notes || null,
        status: "active",
      },
      include: {
        vehicle: true,
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ reservations: [] });
    }

    const isAdmin = dbUser.role === "admin";
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const reservations = await prisma.reservation.findMany({
      where: {
        ...(isAdmin ? {} : { userId: dbUser.id }),
        ...(status ? { status } : {}),
      },
      include: {
        vehicle: true,
        user: { select: { name: true, email: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}
