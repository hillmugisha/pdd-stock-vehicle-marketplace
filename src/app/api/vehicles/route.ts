import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const years            = searchParams.getAll("years");
    const oems             = searchParams.getAll("oems");
    const colors           = searchParams.getAll("colors");
    const bodyApplications = searchParams.getAll("bodyApplications");
    const fuelTypes        = searchParams.getAll("fuelTypes");
    const availabilities   = searchParams.getAll("availabilities");
    const search           = searchParams.get("search");
    const limit            = parseInt(searchParams.get("limit") || "500");

    // Build availability OR conditions from display labels
    const availabilityConditions: Prisma.VehicleWhereInput[] = [];
    if (availabilities.includes("On Ground")) {
      availabilityConditions.push({ orderStatus: { equals: "Delivered", mode: "insensitive" } });
    }
    if (availabilities.includes("In Transit")) {
      availabilityConditions.push({ orderStatus: { contains: "transit", mode: "insensitive" } });
    }
    if (availabilities.includes("In Build")) {
      // "scheduled" but NOT "unscheduled"
      availabilityConditions.push({
        AND: [
          { orderStatus: { contains: "scheduled", mode: "insensitive" } },
          { NOT: { orderStatus: { contains: "unscheduled", mode: "insensitive" } } },
        ],
      });
    }
    if (availabilities.includes("Unscheduled")) {
      availabilityConditions.push({
        OR: [
          { orderStatus: { contains: "unscheduled", mode: "insensitive" } },
          { orderStatus: { equals: "TBD", mode: "insensitive" } },
          { orderStatus: null },
        ],
      });
    }

    const andConditions: Prisma.VehicleWhereInput[] = [
      { isActive: true },
      { partner: { in: ["STOCK - PDD", "STOCK - PDD - MOD & TRANS CL"] } },
    ];

    if (years.length > 0)            andConditions.push({ year:            { in: years } });
    if (oems.length > 0)             andConditions.push({ oem:             { in: oems } });
    if (colors.length > 0)           andConditions.push({ color:           { in: colors } });
    if (bodyApplications.length > 0) andConditions.push({ bodyApplication: { in: bodyApplications } });
    if (fuelTypes.length > 0)        andConditions.push({ fuelType:        { in: fuelTypes } });
    if (availabilityConditions.length > 0) andConditions.push({ OR: availabilityConditions });

    if (search) {
      andConditions.push({
        OR: [
          { specs:       { contains: search, mode: "insensitive" } },
          { oem:         { contains: search, mode: "insensitive" } },
          { stockNumber: { contains: search, mode: "insensitive" } },
          { vin:         { contains: search, mode: "insensitive" } },
          { pacQid:      { contains: search, mode: "insensitive" } },
          { bodyCode:    { contains: search, mode: "insensitive" } },
          { color:       { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.VehicleWhereInput = { AND: andConditions };

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        reservations: {
          where: { status: "active" },
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const vehiclesWithStatus = vehicles.map((v) => ({
      ...v,
      isReserved: v.reservations.length > 0,
    }));

    // Filter options from full STOCK-PDD set
    const allVehicles = await prisma.vehicle.findMany({
      where: { isActive: true, partner: { in: ["STOCK - PDD", "STOCK - PDD - MOD & TRANS CL"] } },
      select: { year: true, oem: true, color: true, bodyApplication: true, location: true, orderStatus: true, fuelType: true },
    });

    const unique = (arr: (string | null)[]): string[] => {
      const seen = new Map<string, string>();
      for (const v of arr) {
        if (!v) continue;
        const key = v.trim().toLowerCase();
        if (!seen.has(key)) seen.set(key, v.trim());
      }
      return [...seen.values()].sort();
    };

    const filterOptions = {
      years:            unique(allVehicles.map((v) => v.year)),
      oems:             unique(allVehicles.map((v) => v.oem)),
      colors:           unique(allVehicles.map((v) => v.color)),
      bodyApplications: unique(allVehicles.map((v) => v.bodyApplication)),
      fuelTypes:        unique(allVehicles.map((v) => v.fuelType)),
      locations:        unique(allVehicles.map((v) => v.location)),
      statuses:         unique(allVehicles.map((v) => v.orderStatus)),
    };

    return NextResponse.json({ vehicles: vehiclesWithStatus, filterOptions, vehicleFields: allVehicles });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
  }
}
