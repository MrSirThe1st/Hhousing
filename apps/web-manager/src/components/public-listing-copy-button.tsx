"use client";

import { useState } from "react";

interface PublicListingCopyButtonProps {
  sharePath: string;
}

export default function PublicListingCopyButton({
  sharePath
}: PublicListingCopyButtonProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    const url = new URL(sharePath, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail silently
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm"
    >
      <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
      </svg>
      {copied ? "Lien copié !" : "Partager"}
    </button>
  );
}
