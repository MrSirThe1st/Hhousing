"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateExpenseOutput, UpdateExpenseOutput } from "@hhousing/api-contracts";
import type { ExpenseCategory } from "@hhousing/domain";
import type { FinancePropertyOption, ExpenseDataset } from "../lib/finance-reporting.types";
import { patchWithAuth, postWithAuth } from "../lib/api-client";

interface ExpenseCreateFormProps {
  organizationId: string;
  propertyOptions: FinancePropertyOption[];
  propertyUnitOptions: ExpenseDataset["propertyUnitOptions"];
  expenseId?: string;
  initialValues?: ExpenseInitialValues | null;
  cancelHref?: string;
}

interface ExpenseFormState {
  propertyId: string;
  unitId: string;
  title: string;
  category: ExpenseCategory;
  vendorName: string;
  payeeName: string;
  amount: string;
  currencyCode: string;
  expenseDate: string;
  note: string;
}

interface ExpenseInitialValues {
  propertyId: string;
  unitId: string;
  title: string;
  category: ExpenseCategory;
  vendorName: string;
  payeeName: string;
  amount: string;
  currencyCode: string;
  expenseDate: string;
  note: string;
}

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Utilités" },
  { value: "taxes", label: "Taxes" },
  { value: "insurance", label: "Assurance" },
  { value: "supplies", label: "Fournitures" },
  { value: "payroll", label: "Paie" },
  { value: "cleaning", label: "Nettoyage" },
  { value: "security", label: "Sécurité" },
  { value: "legal", label: "Juridique" },
  { value: "marketing", label: "Marketing" },
  { value: "admin", label: "Administration" },
  { value: "other", label: "Autre" }
];

function buildInitialState(initialValues?: ExpenseInitialValues | null): ExpenseFormState {
  if (initialValues) {
    return initialValues;
  }

  return {
    propertyId: "",
    unitId: "",
    title: "",
    category: "maintenance",
    vendorName: "",
    payeeName: "",
    amount: "",
    currencyCode: "USD",
    expenseDate: new Date().toISOString().slice(0, 10),
    note: ""
  };
}

export default function ExpenseCreateForm({
  organizationId,
  propertyOptions,
  propertyUnitOptions,
  expenseId,
  initialValues,
  cancelHref
}: ExpenseCreateFormProps): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState<ExpenseFormState>(() => buildInitialState(initialValues));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialState(initialValues));
    setMessage(null);
    setError(null);
  }, [expenseId, initialValues]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Le montant doit être un nombre positif.");
      setBusy(false);
      return;
    }

    const payload = {
      organizationId,
      propertyId: form.propertyId || null,
      unitId: form.unitId || null,
      title: form.title.trim(),
      category: form.category,
      vendorName: form.vendorName.trim() || null,
      payeeName: form.payeeName.trim() || null,
      amount,
      currencyCode: form.currencyCode.trim().toUpperCase(),
      expenseDate: form.expenseDate,
      note: form.note.trim() || null
    };

    const result = expenseId
      ? await patchWithAuth<UpdateExpenseOutput>(`/api/expenses/${expenseId}`, payload)
      : await postWithAuth<CreateExpenseOutput>("/api/expenses", payload);

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    if (expenseId) {
      setMessage("Dépense mise à jour.");
      if (cancelHref) {
        router.push(cancelHref);
      }
    } else {
      setForm(buildInitialState());
      setMessage("Dépense enregistrée.");
    }

    setBusy(false);
    router.refresh();
  }

  const isEditing = typeof expenseId === "string" && expenseId.length > 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[#010a19]">{isEditing ? "Modifier la dépense" : "Enregistrer une dépense"}</h2>
        <p className="mt-1 text-sm text-gray-500">Ajoutez manuellement chaque sortie d’argent: réparation, facture, taxe ou dépense générale.</p>
      </div>

      {message ? <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 md:col-span-2">
          <span className="mb-1.5 block">Libellé</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ex: Réparation plomberie, facture SNEL"
            required
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Propriété</span>
          <select
            value={form.propertyId}
            onChange={(event) => setForm((current) => ({ ...current, propertyId: event.target.value, unitId: "" }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Générale organisation</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Portée</span>
          <select
            value={form.unitId}
            onChange={(event) => setForm((current) => ({ ...current, unitId: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={form.propertyId.length === 0}
          >
            <option value="">{form.propertyId.length === 0 ? "Choisir une propriété d’abord" : "Toute la propriété"}</option>
            {(propertyUnitOptions.find((item) => item.propertyId === form.propertyId)?.units ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>Unité {unit.label}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Catégorie</span>
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Fournisseur</span>
          <input
            value={form.vendorName}
            onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ex: SNEL, plombier, assurance"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Payé à</span>
          <input
            value={form.payeeName}
            onChange={(event) => setForm((current) => ({ ...current, payeeName: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Nom de la personne ou entreprise payée"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Montant</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Devise</span>
          <input
            value={form.currencyCode}
            onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            maxLength={3}
            required
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 md:col-span-2">
          <span className="mb-1.5 block">Date de dépense</span>
          <input
            type="date"
            value={form.expenseDate}
            onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 md:col-span-2">
          <span className="mb-1.5 block">Note</span>
          <textarea
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="md:col-span-2">
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || form.title.trim().length === 0}
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
            >
              {busy ? (isEditing ? "Mise à jour..." : "Enregistrement...") : (isEditing ? "Mettre à jour" : "Ajouter la dépense")}
            </button>
            {isEditing && cancelHref ? (
              <button
                type="button"
                onClick={() => {
                  router.push(cancelHref);
                  router.refresh();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}