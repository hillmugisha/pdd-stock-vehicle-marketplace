/**
 * Seed script — imports PDD_Stock_4_6_26.xlsx data into the database.
 *
 * Run:  npm run db:seed
 *
 * The script reads the pre-exported stock_data.json that lives next to the
 * Excel file, maps every row to the Vehicle schema, and upserts into the DB.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface RawRow {
  BU?: string;
  OEM?: string;
  "New/Used"?: string;
  "Body Code"?: string;
  "Spec ID"?: string;
  Model?: string;
  Year?: string;
  Color?: string;
  "Fuel Type"?: string;
  Engine?: string;
  "Trans."?: string;
  Drive?: string;
  Wheelbase?: string;
  "Cab to Axle"?: string;
  "Order Date "?: string;
  "Stock #"?: string;
  VON?: string;
  VIN?: string;
  Recalls?: string;
  "Order Status"?: string;
  "Last Status Update"?: string;
  "Delivered Date"?: string;
  "Ship to/Current Location"?: string;
  MSRP?: string;
  Comments?: string;
  "Reserved By"?: string;
  "Reserved For"?: string;
  "Reserve Date"?: string;
}

function clean(v: string | undefined): string | null {
  if (!v || v.trim() === "" || v.trim() === "N/A" || v.trim() === "-") return null;
  return v.trim();
}

async function main() {
  // Find the JSON export (adjust path if needed)
  const jsonPath = path.resolve(__dirname, "../../stock_data.json");

  if (!fs.existsSync(jsonPath)) {
    console.error(`\n❌  stock_data.json not found at: ${jsonPath}`);
    console.error(
      "   Run the PowerShell export step from the README first, or place\n" +
        "   stock_data.json in 'C:\\\\Stock PDD Project\\\\stock_data.json'\n"
    );
    process.exit(1);
  }

  const raw: RawRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`\n📦  Found ${raw.length} rows in stock_data.json`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of raw) {
    const stockNumber = clean(row["Stock #"]);
    if (!stockNumber) {
      skipped++;
      continue;
    }

    const data = {
      bu: clean(row.BU),
      oem: clean(row.OEM),
      condition: clean(row["New/Used"]),
      bodyCode: clean(row["Body Code"]),
      specId: clean(row["Spec ID"]),
      model: clean(row.Model),
      year: clean(row.Year),
      color: clean(row.Color),
      fuelType: clean(row["Fuel Type"]),
      engine: clean(row.Engine),
      transmission: clean(row["Trans."]),
      drivetrain: clean(row.Drive),
      wheelbase: clean(row.Wheelbase),
      cabToAxle: clean(row["Cab to Axle"]),
      orderDate: clean(row["Order Date "]),
      von: clean(row.VON),
      vin: clean(row.VIN),
      recalls: clean(row.Recalls),
      orderStatus: clean(row["Order Status"]),
      lastStatusUpdate: clean(row["Last Status Update"]),
      deliveredDate: clean(row["Delivered Date"]),
      location: clean(row["Ship to/Current Location"]),
      msrp: clean(row.MSRP),
      comments: clean(row.Comments),
    };

    const existing = await prisma.vehicle.findUnique({ where: { stockNumber } });

    if (existing) {
      await prisma.vehicle.update({ where: { stockNumber }, data });
      updated++;
    } else {
      await prisma.vehicle.create({ data: { stockNumber, ...data } });
      created++;
    }
  }

  console.log(`\n✅  Seed complete:`);
  console.log(`   Created : ${created}`);
  console.log(`   Updated : ${updated}`);
  console.log(`   Skipped : ${skipped} (no stock #)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
