"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, company, email, message }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setSuccess(false);
    setFullName("");
    setCompany("");
    setEmail("");
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900">Message Sent!</h2>
            <p className="text-gray-500 text-sm max-w-xs">
              Thanks for reaching out. The PDD team will get back to you shortly.
            </p>
            <Button
              onClick={handleClose}
              className="mt-2 bg-[#1a3a6e] hover:bg-[#142d56] text-white"
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Contact PDD Team
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-1">
              <div className="space-y-1.5">
                <Label htmlFor="contactName">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactName"
                  placeholder="e.g. John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactCompany">
                  Company <span className="text-gray-400 font-normal text-xs">optional</span>
                </Label>
                <Input
                  id="contactCompany"
                  placeholder="e.g. ABC Dealership"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactMessage">
                  Message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="contactMessage"
                  placeholder="How can we help you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1a3a6e] hover:bg-[#142d56] text-white"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
