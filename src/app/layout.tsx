import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { createClient } from "@/lib/supabase/server";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Available PDD Stock Inventory",
  description: "Browse available commercial vehicle inventory",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-white flex flex-col`}>
        <AnnouncementBanner />
        <Navbar
          user={
            user
              ? {
                  email: user.email!,
                  name: user.user_metadata?.full_name,
                }
              : null
          }
        />
        <main>{children}</main>
        <Analytics />
        <footer className="border-t border-gray-200 bg-white py-6 mt-auto">
          <p className="text-center text-sm text-gray-500">
            © 2026 Pritchard Commercial. All rights reserved.
          </p>
        </footer>
      </body>
    </html>
  );
}
