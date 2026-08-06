"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ServiceProviderCategoryWithCount } from "@hhousing/data-access";
import AdminAddCategoryDialog from "./admin-add-category-dialog";
import UniversalLoadingState from "./universal-loading-state";

interface AdminServiceProviderCategoriesPageClientProps {
  categories: ServiceProviderCategoryWithCount[];
}

export default function AdminServiceProviderCategoriesPageClient({
  categories
}: AdminServiceProviderCategoriesPageClientProps): React.ReactElement {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function onDelete(id: string, providerCount: number): Promise<void> {
    if (providerCount > 0) {
      setError("Impossible de supprimer une catégorie utilisée par des prestataires.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/service-providers/categories?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Impossible de supprimer");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  async function onSaveEdit(id: string): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/service-providers/categories", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim() })
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Impossible de modifier");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{categories.length} catégorie(s)</p>
        <AdminAddCategoryDialog
          onCreated={() => router.refresh()}
          buttonClassName="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-[#010a19]"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Prestataires</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  Aucune catégorie.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">
                    {editingId === category.id ? (
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
                      />
                    ) : (
                      <p className="font-medium text-[#010a19] dark:text-white">{category.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {category.providerCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === category.id ? (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => void onSaveEdit(category.id)}
                          className="text-xs font-medium text-emerald-600 hover:underline"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-xs font-medium text-slate-500 hover:underline"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditName(category.name);
                          }}
                          className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => void onDelete(category.id, category.providerCount)}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
