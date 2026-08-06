"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ServiceProvider, ServiceProviderCategory } from "@hhousing/api-contracts";
import CitySelect from "./city-select";
import CreateSuccessBanner from "./create-success-banner";
import UniversalLoadingState from "./universal-loading-state";

interface PrestatairesCreateModalProps {
  open: boolean;
  onClose: () => void;
  categories: ServiceProviderCategory[];
  /** When set, success banner offers assign shortcut to this property. */
  propertyId?: string | null;
  onCreatedAndAssign?: (providerId: string) => void;
}

export default function PrestatairesCreateModal({
  open,
  onClose,
  categories,
  propertyId,
  onCreatedAndAssign
}: PrestatairesCreateModalProps): React.ReactElement | null {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  function resetForm(): void {
    setCity("");
    setFormKey((value) => value + 1);
  }

  function handleClose(): void {
    setError(null);
    setMessage(null);
    setCreatedId(null);
    resetForm();
    onClose();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      categoryId: String(formData.get("categoryId") ?? ""),
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      whatsappPhone: String(formData.get("whatsappPhone") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      city: city.trim() || null,
      quartier: String(formData.get("quartier") ?? "").trim() || null
    };

    setPending(true);
    setError(null);
    setMessage(null);
    setCreatedId(null);

    try {
      const response = await fetch("/api/prestataires", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: ServiceProvider;
      };
      if (!response.ok || !result.success || !result.data) {
        setError(result.error ?? "Création impossible");
        return;
      }

      setCreatedId(result.data.id);
      setMessage(`Prestataire « ${result.data.name} » créé.`);
      resetForm();
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter un prestataire"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#0d1526]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">
            Ajouter un prestataire
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {message ? (
            <div className="mb-4 space-y-2">
              <CreateSuccessBanner message={message} />
              {createdId ? (
                <p className="text-sm">
                  {onCreatedAndAssign ? (
                    <button
                      type="button"
                      className="font-medium text-green-800 underline hover:no-underline"
                      onClick={() => {
                        onCreatedAndAssign(createdId);
                        handleClose();
                      }}
                    >
                      Ajouter à un bien
                    </button>
                  ) : (
                    <a
                      href={`/dashboard/prestataires${
                        propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ""
                      }`}
                      className="font-medium text-green-800 underline hover:no-underline"
                    >
                      Aller à Par bien
                    </a>
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form key={formKey} id="prestataires-create-form" onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Nom</span>
              <input
                name="name"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Catégorie</span>
              <select
                name="categoryId"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
              >
                <option value="">Sélectionner…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Téléphone</span>
              <input
                name="phone"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">WhatsApp</span>
              <input
                name="whatsappPhone"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Ville</span>
              <CitySelect value={city} onChange={setCity} placeholder="Sélectionner une ville" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Quartier</span>
              <input
                name="quartier"
                placeholder="Ex. Gombe, Limete…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600 dark:text-slate-300">Description</span>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
              />
            </label>
          </form>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Fermer
          </button>
          <button
            type="submit"
            form="prestataires-create-form"
            disabled={pending || categories.length === 0}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052d4] disabled:opacity-60"
          >
            Créer
          </button>
        </div>
      </div>

      {pending ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
