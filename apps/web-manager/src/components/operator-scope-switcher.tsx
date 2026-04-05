"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OperatorContext, OperatorScope } from "../lib/operator-context.types";

interface OperatorScopeSwitcherProps {
  context: OperatorContext;
}

const SCOPE_LABELS: Record<OperatorScope, string> = {
  owned: "Mon parc",
  managed: "Parc gere"
};

export default function OperatorScopeSwitcher({ context }: OperatorScopeSwitcherProps): React.ReactElement {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleScopeChange(scope: OperatorScope): Promise<void> {
    if (scope === context.currentScope || isPending) {
      return;
    }

    setError(null);

    const response = await fetch("/api/operator-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ scope })
    });

    if (!response.ok) {
      setError("Impossible de changer le contexte.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Contexte</span>
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
          {context.availableScopes.map((scope) => {
            const isActive = scope === context.currentScope;

            return (
              <button
                key={scope}
                type="button"
                onClick={() => void handleScopeChange(scope)}
                disabled={!context.canSwitch || isPending}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#010a19] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                } disabled:cursor-default disabled:opacity-100`}
              >
                {SCOPE_LABELS[scope]}
              </button>
            );
          })}
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}