import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Sync user to our database
      await prisma.user.upsert({
        where: { supabaseId: data.user.id },
        update: {
          email: data.user.email!,
          name: data.user.user_metadata?.full_name || null,
        },
        create: {
          supabaseId: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name || null,
        },
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
