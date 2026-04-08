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

    setSuccess("Application submitted. The manager will review your file shortly.");
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
        <h2 className="text-xl font-semibold text-slate-950">Apply for this home</h2>
        <p className="mt-2 text-sm text-slate-600">
          No account required. Submit your details and the property manager will continue screening from the dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Full name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Phone</span>
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
          <span className="mb-1.5 block">Employment or income details</span>
          <textarea
            value={employmentInfo}
            onChange={(event) => setEmploymentInfo(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Employer, role, income frequency, guarantor, or other context"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Monthly income</span>
          <input
            inputMode="decimal"
            value={monthlyIncome}
            onChange={(event) => setMonthlyIncome(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Optional"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Notes</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Optional"
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
        {busy ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}