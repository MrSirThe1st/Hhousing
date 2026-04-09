"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ReportPrintTriggerProps {
  backHref: string;
}

export default function ReportPrintTrigger({ backHref }: ReportPrintTriggerProps): React.ReactElement {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Retour aux rapports
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
      >
        Imprimer / Sauvegarder en PDF
      </button>
    </div>
  );
}