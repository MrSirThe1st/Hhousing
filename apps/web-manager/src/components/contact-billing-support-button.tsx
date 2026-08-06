"use client";

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
    window.alert(
      "Ouvrez le chat support (icône en bas à droite) pour obtenir les instructions de paiement Haraka Property."
    );
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
