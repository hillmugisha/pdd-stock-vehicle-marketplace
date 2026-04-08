"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Use page load time as a unique key — changes on every real browser refresh
    const loadKey = `banner-dismissed-${Math.floor(performance.timeOrigin)}`;
    if (sessionStorage.getItem(loadKey) === "true") {
      setDismissed(true);
    }
  }, []);

  const dismiss = () => {
    const loadKey = `banner-dismissed-${Math.floor(performance.timeOrigin)}`;
    sessionStorage.setItem(loadKey, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="w-full bg-yellow-400 text-gray-900 flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium relative">
      <p className="text-center pr-6">
        Inventory is refreshed weekly to reflect the latest availability. Reach us at{" "}
        <a href="mailto:pdd@pritchards.com" className="underline font-semibold hover:text-gray-700">
          pdd@pritchards.com
        </a>{" "}
        if you have any questions.
      </p>
      <button
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-900 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
