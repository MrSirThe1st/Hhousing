"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeleteExpenseOutput } from "@hhousing/api-contracts";
import { deleteWithAuth } from "../lib/api-client";

interface ExpenseDeleteButtonProps {
  expenseId: string;
  redirectHref: string;
}

export default function ExpenseDeleteButton({
  expenseId,
  redirectHref
}: ExpenseDeleteButtonProps): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (busy) {
      return;
    }

    const confirmed = window.confirm("Supprimer cette dépense ? Cette action est immédiate.");
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);

    const result = await deleteWithAuth<DeleteExpenseOutput>(`/api/expenses/${expenseId}`);
    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push(redirectHref);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={busy}
        className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {busy ? "Suppression..." : "Supprimer"}
      </button>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}