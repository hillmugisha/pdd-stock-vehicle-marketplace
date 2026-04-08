import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, company, email, message, vehicles } = body;

    if (!fullName || !email || !vehicles?.length) {
      return NextResponse.json({ error: "Full name, email and at least one vehicle are required." }, { status: 400 });
    }

    console.log("Interest submission:", {
      fullName,
      company,
      email,
      message,
      vehicles,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Interest submission error:", error);
    return NextResponse.json({ error: "Failed to submit interest." }, { status: 500 });
  }
}
