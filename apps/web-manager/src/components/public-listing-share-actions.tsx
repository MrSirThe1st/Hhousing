"use client";

import { useEffect, useState } from "react";

interface PublicListingShareActionsProps {
  title: string;
  sharePath: string;
}

function buildAbsoluteUrl(sharePath: string): string {
  if (typeof window === "undefined") {
    return sharePath;
  }

  return new URL(sharePath, window.location.origin).toString();
}

export default function PublicListingShareActions({
  title,
  sharePath
}: PublicListingShareActionsProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [resolvedShareUrl, setResolvedShareUrl] = useState<string>(sharePath);

  useEffect(() => {
    setResolvedShareUrl(buildAbsoluteUrl(sharePath));
  }, [sharePath]);

  async function copyLink(): Promise<void> {
    const url = buildAbsoluteUrl(sharePath);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${resolvedShareUrl}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedShareUrl)}`;
  const instagramUrl = "https://www.instagram.com/";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
      >
        WhatsApp
      </a>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
      >
        Facebook
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700"
      >
        {copied ? "Instagram link copied" : "Instagram"}
      </button>
      <a
        href={instagramUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
      >
        Open app
      </a>
    </div>
  );
}