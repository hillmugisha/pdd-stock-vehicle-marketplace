import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildContactEmail } from "@/lib/email/contactTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, company, email, message } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const html = buildContactEmail({ fullName, company, email, message });

    const { error } = await resend.emails.send({
      from:    "PDD Stock <onboarding@resend.dev>",
      to:      ["hill3563@gmail.com"],
      replyTo: email,
      subject: "Interest in PDD Stock",
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact submission error:", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
