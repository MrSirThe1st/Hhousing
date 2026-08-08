"use client";

import { LEGAL_SITE_NAME, LEGAL_SUPPORT_EMAIL } from "../lib/legal/site-legal";

declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
      toggle?: () => void;
      popup?: () => void;
    };
  }
}

export default function ContactBillingSupportButton(): React.ReactElement {
  function handleClick(): void {
    const api = window.Tawk_API;
    if (api?.maximize) {
      api.maximize();
      return;
    }
    if (api?.toggle) {
      api.toggle();
      return;
    }
    const subject = encodeURIComponent(`Support facturation — ${LEGAL_SITE_NAME}`);
    window.location.href = `mailto:${LEGAL_SUPPORT_EMAIL}?subject=${subject}`;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
    >
      Contacter le support Haraka
    </button>
  );
}
