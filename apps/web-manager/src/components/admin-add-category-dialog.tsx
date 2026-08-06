"use client";

import { useState } from "react";
import type { ServiceProviderCategory } from "@hhousing/domain";
import UniversalLoadingState from "./universal-loading-state";

interface AdminAddCategoryDialogProps {
  onCreated: (category: ServiceProviderCategory) => void;
  buttonClassName?: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminAddCategoryDialog({
  onCreated,
  buttonClassName
}: AdminAddCategoryDialogProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const slug = slugify(name);

    try {
      const response = await fetch("/api/admin/service-providers/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug, sortOrder: 100 })
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: ServiceProviderCategory;
      };
      if (!response.ok || !result.success || !result.data) {
        setError(result.error ?? "Impossible de créer la catégorie");
        return;
      }
      onCreated(result.data);
      setOpen(false);
      event.currentTarget.reset();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          buttonClassName ?? "text-sm font-medium text-[#0063fe] hover:underline"
        }
      >
        + Ajouter une catégorie
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-[#0d1526]">
            <h3 className="text-base font-semibold text-[#010a19] dark:text-white">
              Nouvelle catégorie
            </h3>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600 dark:text-slate-300">Nom</span>
                <input
                  name="name"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-[#010a19] px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-[#010a19]"
                >
                  Enregistrer
                </button>
              </div>
            </form>
            {pending ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#010a19]/35 backdrop-blur-[1px]">
                <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
