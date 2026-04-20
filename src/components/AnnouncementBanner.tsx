"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

function formatRefreshedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  useEffect(() => {
    const loadKey = `banner-dismissed-${Math.floor(performance.timeOrigin)}`;
    if (sessionStorage.getItem(loadKey) === "true") {
      setDismissed(true);
    }
    fetch("/api/sync/last-refreshed")
      .then((r) => r.json())
      .then((data) => {
        if (data.lastRefreshed) setLastRefreshed(data.lastRefreshed);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    const loadKey = `banner-dismissed-${Math.floor(performance.timeOrigin)}`;
    sessionStorage.setItem(loadKey, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const refreshedLabel = lastRefreshed
    ? formatRefreshedAt(lastRefreshed)
    : null;

  return (
    <div className="w-full bg-yellow-400 text-gray-900 flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium relative">
      <p className="text-center pr-6 leading-relaxed">
        {refreshedLabel ? (
          <>
            Inventory was last refreshed on{" "}
            <span className="font-semibold">{refreshedLabel}</span> to reflect the
            latest availability. Reach us at{" "}
          </>
        ) : (
          <>
            Inventory is refreshed regularly to reflect the latest availability.
            Reach us at{" "}
          </>
        )}
        <a
          href="mailto:pdd@pritchards.com"
          className="underline font-semibold hover:text-gray-700"
        >
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
