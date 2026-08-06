"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ServiceProviderAdminListItem } from "@hhousing/data-access";
import UniversalLoadingState from "./universal-loading-state";

interface AdminServiceProviderRowActionsProps {
  provider: ServiceProviderAdminListItem;
}

export default function AdminServiceProviderRowActions({
  provider
}: AdminServiceProviderRowActionsProps): React.ReactElement {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggleStatus(event: React.MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    setPending(true);
    const nextStatus = provider.status === "suspended" ? "active" : "suspended";
    try {
      await fetch(`/api/admin/service-providers/${provider.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-3" onClick={(event) => event.stopPropagation()}>
        <Link
          href={`/admin/service-providers/${provider.id}`}
          className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
        >
          Voir
        </Link>
        <Link
          href={`/admin/service-providers/${provider.id}/edit`}
          className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
        >
          Modifier
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={(event) => void toggleStatus(event)}
          className={`text-xs font-medium hover:underline disabled:opacity-60 ${
            provider.status === "suspended" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {provider.status === "suspended" ? "Activer" : "Suspendre"}
        </button>
      </div>
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </>
  );
}
