import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildInterestEmail } from "@/lib/email/interestTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, company, email, message, vehicles } = body;

    if (!fullName || !email || !vehicles?.length) {
      return NextResponse.json(
        { error: "Full name, email and at least one vehicle are required." },
        { status: 400 }
      );
    }

    const html = buildInterestEmail({ fullName, company, email, message, vehicles });

    const { error } = await resend.emails.send({
      from:    "PDD Stock <onboarding@resend.dev>",
      to:      ["hill3563@gmail.com"],
      replyTo: email,
      subject: "Interest in PDD Stock",
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
    }

    console.log("Interest email sent:", { fullName, company, email, vehicles });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Interest submission error:", error);
    return NextResponse.json({ error: "Failed to submit interest." }, { status: 500 });
  }
}
