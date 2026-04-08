"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { ContactModal } from "@/components/ContactModal";

interface NavbarProps {
  user: { email: string; name?: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <header className="bg-[#1a3a6e] text-white shadow-md sticky top-0 z-40 relative">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: company logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="Pritchard Commercial"
            width={90}
            height={36}
            className="object-contain brightness-0 invert h-12 w-auto"
            priority
          />
        </Link>

        {/* Center: site title */}
        <span className="absolute left-1/2 -translate-x-1/2 font-bold text-lg text-white hidden md:block">
          Available PDD Stock Inventory
        </span>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4">
          <a
            href="https://www.nhtsa.gov/recalls?utm_source=google&utm_medium=search&utm_campaign=safecarssavelives2025-2026&gad_source=1&gad_campaignid=23383552240&gbraid=0AAAAAoa-qF2sKHJK44pmW2d2OilwXsexB&gclid=Cj0KCQiAvtzLBhCPARIsALwhxdoxb3IkUYslqXfAgtghSU607l4uxerX7dTlN20wq2p4VChi5XI5wQIaAguqEALw_wcB"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-sm font-semibold border border-white/40 text-white rounded-md hover:bg-white/10 transition-colors"
          >
            NHTSA - Recalls
          </a>
          <a
            href="https://pritchards.shaed.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-sm font-semibold border border-white/40 text-white rounded-md hover:bg-white/10 transition-colors"
          >
            Track Orders
          </a>
          <Button
            size="sm"
            onClick={() => setContactOpen(true)}
            className="bg-white text-[#1a3a6e] hover:bg-white/90 font-semibold text-sm"
          >
            Contact PDD Team
          </Button>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-white/80 hover:text-white transition-colors flex items-center gap-1"
              >
                <LayoutDashboard className="w-4 h-4" />
                My Reservations
              </Link>
              <span className="text-white/50 text-sm">{user.email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-white/40 text-white bg-transparent hover:bg-white/10 hover:text-white text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </>
          ) : null}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#142d56] border-t border-white/10 px-4 pb-4 pt-2 flex flex-col gap-3">
          <Link
            href="/"
            className="text-sm text-white/80 py-1"
            onClick={() => setMenuOpen(false)}
          >
            Inventory
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-white/80 py-1"
                onClick={() => setMenuOpen(false)}
              >
                My Reservations
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-white/80 py-1 text-left"
              >
                Sign Out
              </button>
            </>
          ) : null}
        </div>
      )}
    </header>
  );
}
