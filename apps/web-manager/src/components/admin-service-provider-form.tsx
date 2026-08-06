"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ServiceProviderCategory } from "@hhousing/domain";
import AdminAddCategoryDialog from "./admin-add-category-dialog";
import CitySelect from "./city-select";
import CreateSuccessBanner from "./create-success-banner";
import UniversalLoadingState from "./universal-loading-state";

interface AdminServiceProviderFormProps {
  mode: "create" | "edit";
  providerId?: string;
  categories: ServiceProviderCategory[];
  initial?: {
    name: string;
    categoryId: string;
    phone: string;
    whatsappPhone: string | null;
    description: string | null;
    city: string | null;
    quartier: string | null;
    isVerified?: boolean;
  };
}

export default function AdminServiceProviderForm({
  mode,
  providerId,
  categories: initialCategories,
  initial
}: AdminServiceProviderFormProps): React.ReactElement {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [city, setCity] = useState(initial?.city ?? "");

  function resetCreateForm(): void {
    setCategoryId("");
    setCity("");
    setFormKey((key) => key + 1);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    setCreatedId(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      categoryId: String(form.get("categoryId") ?? categoryId),
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      whatsappPhone: String(form.get("whatsappPhone") ?? "") || null,
      description: String(form.get("description") ?? "") || null,
      city: city.trim() || null,
      quartier: String(form.get("quartier") ?? "").trim() || null,
      ...(mode === "create" ? { isVerified: true } : {})
    };

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/admin/service-providers"
          : `/api/admin/service-providers/${providerId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: { id?: string; name?: string };
      };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Échec de l'enregistrement");
        return;
      }

      if (mode === "create") {
        const newId = result.data?.id ?? null;
        const name = result.data?.name ?? payload.name;
        setCreatedId(newId);
        setMessage(`Prestataire « ${name} » créé avec succès.`);
        resetCreateForm();
        return;
      }

      router.push(`/admin/service-providers/${providerId}`);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {message ? (
        <CreateSuccessBanner
          message={message}
          links={
            createdId
              ? [
                  { href: `/admin/service-providers/${createdId}`, label: "Voir la fiche" },
                  { href: "/admin/service-providers", label: "Retour à la liste" }
                ]
              : []
          }
        />
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        key={formKey}
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0d1526]"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600 dark:text-slate-300">Nom du prestataire</span>
          <input
            name="name"
            required
            defaultValue={mode === "edit" ? (initial?.name ?? "") : ""}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          />
        </label>

        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600 dark:text-slate-300">Catégorie</span>
            <select
              name="categoryId"
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
            >
              <option value="">Sélectionner…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <AdminAddCategoryDialog
            onCreated={(category) => {
              setCategories((current) =>
                [...current, category].sort(
                  (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
                )
              );
              setCategoryId(category.id);
            }}
          />
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600 dark:text-slate-300">Téléphone</span>
          <input
            name="phone"
            required
            defaultValue={mode === "edit" ? (initial?.phone ?? "") : ""}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600 dark:text-slate-300">
            WhatsApp <span className="text-slate-400">(recommandé)</span>
          </span>
          <input
            name="whatsappPhone"
            defaultValue={mode === "edit" ? (initial?.whatsappPhone ?? "") : ""}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600 dark:text-slate-300">Ville</span>
            <CitySelect value={city} onChange={setCity} placeholder="Sélectionner une ville" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600 dark:text-slate-300">Quartier</span>
            <input
              name="quartier"
              defaultValue={mode === "edit" ? (initial?.quartier ?? "") : ""}
              placeholder="Ex. Gombe, Limete…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600 dark:text-slate-300">Notes</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={mode === "edit" ? (initial?.description ?? "") : ""}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={pending || categories.length === 0}
            className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-[#010a19]"
          >
            {mode === "create" ? "Créer" : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Annuler
          </button>
        </div>
      </form>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
