import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, message } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    // Log the contact submission (email sending can be wired up here later)
    console.log("Contact submission:", {
      fullName,
      email,
      message,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact submission error:", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
