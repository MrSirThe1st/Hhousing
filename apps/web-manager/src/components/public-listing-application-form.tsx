"use client";

import { useState } from "react";
import { postPublic } from "../lib/api-client";

interface PublicListingApplicationFormProps {
  listingId: string;
}

export default function PublicListingApplicationForm({
  listingId
}: PublicListingApplicationFormProps): React.ReactElement {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employmentInfo, setEmploymentInfo] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    const parsedIncome = monthlyIncome.trim().length > 0 ? Number(monthlyIncome) : null;
    const result = await postPublic<{ id: string }>(`/api/public/listings/${listingId}/applications`, {
      fullName,
      email,
      phone,
      employmentInfo: employmentInfo.trim() || null,
      monthlyIncome: parsedIncome,
      notes: notes.trim() || null
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setSuccess("Candidature soumise. Le gestionnaire examinera votre dossier sous peu.");
    setFullName("");
    setEmail("");
    setPhone("");
    setEmploymentInfo("");
    setMonthlyIncome("");
    setNotes("");
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Postuler pour ce logement</h2>
        <p className="mt-2 text-sm text-slate-600">
          Aucun compte requis. Soumettez vos informations et le gestionnaire immobilier poursuivra la sélection depuis le tableau de bord.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Nom complet</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Téléphone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          <span className="mb-1.5 block">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          <span className="mb-1.5 block">Emploi ou détails du revenu</span>
          <textarea
            value={employmentInfo}
            onChange={(event) => setEmploymentInfo(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Employeur, poste, fréquence du revenu, garant ou autre contexte"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Revenu mensuel</span>
          <input
            inputMode="decimal"
            value={monthlyIncome}
            onChange={(event) => setMonthlyIncome(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Optionnel"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Notes</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Optionnel"
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Envoi en cours..." : "Soumettre la candidature"}
      </button>
    </form>
  );
}