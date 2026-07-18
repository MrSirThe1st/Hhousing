"use client";

import { useState } from "react";
import { postPublic } from "../lib/api-client";
import { validateDrcPhoneInput } from "../lib/phone-input";
import PhoneInput from "./phone-input";

interface PublicListingApplicationFormProps {
  listingId: string;
}

export default function PublicListingApplicationForm({
  listingId
}: PublicListingApplicationFormProps): React.ReactElement {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [numberOfOccupants, setNumberOfOccupants] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    const phoneError = validateDrcPhoneInput(phone);
    if (phoneError) {
      setError(phoneError);
      setBusy(false);
      return;
    }

    const parsedIncome = monthlyIncome.trim().length > 0 ? Number(monthlyIncome) : null;
    const parsedOccupants = numberOfOccupants.trim().length > 0 ? Number(numberOfOccupants) : null;
    const result = await postPublic<{ id: string }>(`/api/public/listings/${listingId}/applications`, {
      fullName,
      email,
      phone,
      dateOfBirth: dateOfBirth || null,
      employmentStatus: employmentStatus || null,
      jobTitle: jobTitle.trim() || null,
      monthlyIncome: parsedIncome,
      numberOfOccupants: parsedOccupants,
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
    setDateOfBirth("");
    setEmploymentStatus("");
    setJobTitle("");
    setMonthlyIncome("");
    setNumberOfOccupants("");
    setNotes("");
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-150 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-slate-900">Postuler pour ce logement</h2>
        <p className="mt-1 text-xs leading-normal text-slate-500">
          Aucun compte requis. Soumettez vos informations et le gestionnaire immobilier vous contactera.
        </p>
      </div>

      <div className="grid gap-x-3 gap-y-3.5 grid-cols-2">
        {/* Nom Complet - Full Width */}
        <label className="col-span-2 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Nom complet</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 placeholder-slate-400/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal"
            required
          />
        </label>

        {/* Email & Phone - Row 2 */}
        <label className="col-span-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 placeholder-slate-400/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal"
            required
          />
        </label>

        <label className="col-span-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Téléphone</span>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            required
            hint=""
            className="font-normal normal-case tracking-normal"
            inputClassName="py-2"
          />
        </label>

        {/* Statut Pro & Poste - Row 3 */}
        <label className="col-span-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Statut pro</span>
          <select
            value={employmentStatus}
            onChange={(event) => setEmploymentStatus(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal bg-white"
          >
            <option value="">Sélectionner</option>
            <option value="employed">Salarié(e)</option>
            <option value="self_employed">Indépendant(e)</option>
            <option value="unemployed">Sans emploi</option>
            <option value="student">Étudiant(e)</option>
            <option value="retired">Retraité(e)</option>
          </select>
        </label>

        <label className="col-span-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Poste</span>
          <input
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 placeholder-slate-400/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal"
            placeholder="Ex. Ingénieur, Enseignant"
          />
        </label>

        {/* Date de naissance & Occupants - Row 4 */}
        <label className="col-span-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Date de naissance</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal"
          />
        </label>

        <label className="col-span-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Occupants</span>
          <input
            type="number"
            min="1"
            value={numberOfOccupants}
            onChange={(event) => setNumberOfOccupants(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 placeholder-slate-400/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal"
            placeholder="1"
          />
        </label>

        {/* Revenu Mensuel - Full Width */}
        <label className="col-span-2 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Revenu mensuel <span className="font-normal text-slate-400 lowercase">(optionnel)</span></span>
          <input
            inputMode="decimal"
            value={monthlyIncome}
            onChange={(event) => setMonthlyIncome(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 placeholder-slate-400/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal"
            placeholder="0.00"
          />
        </label>

        {/* Notes - Full Width */}
        <label className="col-span-2 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="mb-1 block">Notes <span className="font-normal text-slate-400 lowercase">(optionnel)</span></span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-xl border border-slate-200/75 px-3 py-2 text-sm text-slate-800 placeholder-slate-400/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition font-normal normal-case tracking-normal"
            placeholder="Informations complémentaires…"
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">{success}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center w-full rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
      >
        {busy ? "Envoi en cours..." : "Soumettre la candidature"}
      </button>
    </form>
  );
}