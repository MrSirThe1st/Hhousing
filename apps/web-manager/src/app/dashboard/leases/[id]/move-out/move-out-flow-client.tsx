"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CreateMoveOutInput, GetLeaseMoveOutOutput, LeaseWithTenantView } from "@hhousing/api-contracts";
import type { MoveOutDepositDisposition, MoveOutEndedBy, MoveOutReasonCode, MoveOutRetentionReasonCode } from "@hhousing/domain";

type StepId = "departure" | "deposit" | "summary";

type MoveOutFlowClientProps = {
  id: string;
  initialLease: LeaseWithTenantView;
};

function formatMoney(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyCode}`;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MoveOutFlowClient({ id, initialLease }: MoveOutFlowClientProps): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("departure");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GetLeaseMoveOutOutput | null>(null);

  const [departureEffectiveDate, setDepartureEffectiveDate] = useState(todayIsoDate());
  const [showLeaseEndDate, setShowLeaseEndDate] = useState(false);
  const [leaseEndDate, setLeaseEndDate] = useState(todayIsoDate());
  const [endedBy, setEndedBy] = useState<MoveOutEndedBy>("tenant");
  const [reasonCode, setReasonCode] = useState<MoveOutReasonCode | "">("");
  const [reasonNote, setReasonNote] = useState("");

  const [depositHeldAmount, setDepositHeldAmount] = useState(0);
  const [depositAmountOverridden, setDepositAmountOverridden] = useState(false);
  const [disposition, setDisposition] = useState<MoveOutDepositDisposition>("full_refund");
  const [retentionAmount, setRetentionAmount] = useState(0);
  const [retentionReasonCode, setRetentionReasonCode] = useState<MoveOutRetentionReasonCode | "">("");
  const [retentionNote, setRetentionNote] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/leases/${id}/move-out`, { credentials: "include" });
        const result = await response.json() as { success: boolean; data?: GetLeaseMoveOutOutput; error?: string };
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error ?? "Impossible de charger la fin de location");
        }
        if (cancelled) return;

        setContext(result.data);
        if (result.data.moveOut?.status === "planned" || result.data.moveOut?.status === "completed") {
          router.replace(`/dashboard/leases/${id}`);
          return;
        }

        const suggested = result.data.depositContext.suggestedHeldAmount;
        setDepositHeldAmount(suggested);
        const end = initialLease.endDate ?? todayIsoDate();
        setLeaseEndDate(end);
        setDepartureEffectiveDate(end);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Erreur de chargement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, initialLease.endDate, router]);

  const currencyCode = context?.depositContext.currencyCode ?? initialLease.currencyCode;
  const refundAmount = useMemo(() => {
    if (disposition === "full_refund") return depositHeldAmount;
    if (disposition === "full_retention") return 0;
    return Math.max(0, depositHeldAmount - retentionAmount);
  }, [depositHeldAmount, disposition, retentionAmount]);

  const effectiveRetention = disposition === "full_refund"
    ? 0
    : disposition === "full_retention"
      ? depositHeldAmount
      : retentionAmount;

  async function submit(): Promise<void> {
    setSubmitting(true);
    setError(null);

    const payload: CreateMoveOutInput = {
      departureEffectiveDate,
      leaseEndDate: showLeaseEndDate ? leaseEndDate : departureEffectiveDate,
      endedBy,
      reasonCode: reasonCode || null,
      reasonNote: reasonNote.trim() || null,
      depositHeldAmount,
      depositAmountOverridden,
      depositDisposition: disposition,
      depositRetentionAmount: effectiveRetention,
      depositRetentionReasonCode: effectiveRetention > 0 ? (retentionReasonCode || null) : null,
      depositRetentionNote: retentionNote.trim() || null,
      currencyCode
    };

    try {
      const response = await fetch(`/api/leases/${id}/move-out`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Impossible d'enregistrer");
      }
      router.push(`/dashboard/leases/${id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function goNextFromDeparture(): void {
    if (!departureEffectiveDate || !endedBy) {
      setError("Indiquez la date de départ et qui met fin à la location.");
      return;
    }
    setError(null);
    setStep("deposit");
  }

  function goNextFromDeposit(): void {
    if (disposition === "partial_retention") {
      if (retentionAmount <= 0 || retentionAmount >= depositHeldAmount) {
        setError("Pour une retenue partielle, indiquez un montant entre 0 et le dépôt.");
        return;
      }
    }
    if (effectiveRetention > 0 && !retentionReasonCode) {
      setError("Indiquez le motif de la retenue.");
      return;
    }
    setError(null);
    setStep("summary");
  }

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Chargement…</div>;
  }

  const depositContext = context?.depositContext;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <Link href={`/dashboard/leases/${id}`} className="text-sm text-[#0063fe] hover:underline">
          ← Retour au bail
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-[#010a19]">Fin de location</h1>
        <p className="mt-2 text-sm text-slate-600">
          Locataire: <span className="font-medium text-[#010a19]">{initialLease.tenantFullName}</span>
          {" · "}
          Bail en cours depuis {initialLease.startDate}
        </p>
      </div>

      <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className={step === "departure" ? "text-[#0063fe]" : ""}>1. Départ</span>
        <span>/</span>
        <span className={step === "deposit" ? "text-[#0063fe]" : ""}>2. Caution</span>
        <span>/</span>
        <span className={step === "summary" ? "text-[#0063fe]" : ""}>3. Résumé</span>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {step === "departure" ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="text-sm font-semibold text-[#010a19]">Quand le locataire quitte-t-il le logement ?</label>
            <p className="mt-1 text-xs text-slate-500">Date de départ effective — le logement devient vacant à cette date.</p>
            <input
              type="date"
              value={departureEffectiveDate}
              onChange={(event) => {
                setDepartureEffectiveDate(event.target.value);
                if (!showLeaseEndDate) setLeaseEndDate(event.target.value);
              }}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {!showLeaseEndDate ? (
            <button
              type="button"
              className="text-sm font-medium text-[#0063fe] hover:underline"
              onClick={() => setShowLeaseEndDate(true)}
            >
              Le bail se termine à une autre date ?
            </button>
          ) : (
            <div>
              <label className="text-sm font-semibold text-[#010a19]">Le bail se termine le</label>
              <input
                type="date"
                value={leaseEndDate}
                onChange={(event) => setLeaseEndDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-[#010a19]">Qui met fin à la location ?</p>
            <div className="mt-2 flex gap-3">
              {([
                ["tenant", "Locataire"],
                ["landlord", "Propriétaire"]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEndedBy(value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    endedBy === value
                      ? "border-[#0063fe] bg-[#0063fe] text-white"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-[#010a19]">Motif (optionnel)</label>
            <select
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value as MoveOutReasonCode | "")}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="end_of_lease">Fin du bail</option>
              <option value="early_departure">Départ anticipé</option>
              <option value="tenant_termination">Résiliation par le locataire</option>
              <option value="landlord_termination">Résiliation par le propriétaire</option>
              <option value="other">Autre</option>
            </select>
            {reasonCode === "other" ? (
              <input
                value={reasonNote}
                onChange={(event) => setReasonNote(event.target.value)}
                placeholder="Précisez…"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={goNextFromDeparture}
            className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4]"
          >
            Continuer
          </button>
        </section>
      ) : null}

      {step === "deposit" ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Caution</h2>

          {depositContext ? (
            <div className="space-y-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <p>
                Caution enregistrée:{" "}
                <span className="font-semibold">{formatMoney(depositContext.paidDepositAmount, currencyCode)}</span>
              </p>
              {depositContext.leaseDepositAmount !== depositContext.paidDepositAmount ? (
                <p className="text-slate-600">
                  Le bail indique: {formatMoney(depositContext.leaseDepositAmount, currencyCode)}
                </p>
              ) : null}
              {depositContext.equivalentMonths !== null ? (
                <p className="text-xs text-slate-500">
                  Équivalent indicatif: {depositContext.equivalentMonths} mois de loyer
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="text-sm font-semibold text-[#010a19]">Montant utilisé pour le règlement</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={depositHeldAmount}
              onChange={(event) => {
                setDepositAmountOverridden(true);
                setDepositHeldAmount(Number(event.target.value) || 0);
              }}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">Vous pouvez corriger ce montant si l&apos;historique est incomplet.</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#010a19]">Situation du dépôt</p>
            <div className="mt-2 space-y-2">
              {([
                ["full_refund", "À rembourser"],
                ["partial_retention", "Retenue partielle"],
                ["full_retention", "Retenue totale"]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDisposition(value)}
                  className={`block w-full rounded-lg border px-4 py-2 text-left text-sm font-medium ${
                    disposition === value
                      ? "border-[#0063fe] bg-[#f2f6fb] text-[#0063fe]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {disposition === "partial_retention" ? (
            <div>
              <label className="text-sm font-semibold text-[#010a19]">Montant de la retenue</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={retentionAmount}
                onChange={(event) => setRetentionAmount(Number(event.target.value) || 0)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          {effectiveRetention > 0 ? (
            <div className="space-y-2">
              <div>
                <label className="text-sm font-semibold text-[#010a19]">Motif de la retenue</label>
                <select
                  value={retentionReasonCode}
                  onChange={(event) => setRetentionReasonCode(event.target.value as MoveOutRetentionReasonCode | "")}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="damage">Réparation / dégradation</option>
                  <option value="unpaid_rent">Loyer impayé</option>
                  <option value="cleaning">Nettoyage</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#010a19]">Note (optionnel)</label>
                <input
                  value={retentionNote}
                  onChange={(event) => setRetentionNote(event.target.value)}
                  placeholder="Ex. porte à remplacer, facture d'eau…"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <p className="text-slate-500">Montant à rembourser</p>
            <p className="text-xl font-semibold text-[#010a19]">{formatMoney(refundAmount, currencyCode)}</p>
            <p className="mt-1 text-xs text-slate-500">Haraka enregistre cette décision — aucun paiement n&apos;est envoyé automatiquement.</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("departure")} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
              Retour
            </button>
            <button type="button" onClick={goNextFromDeposit} className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4]">
              Continuer
            </button>
          </div>
        </section>
      ) : null}

      {step === "summary" ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Résumé</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Locataire</dt><dd className="font-medium">{initialLease.tenantFullName}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Date de départ</dt><dd className="font-medium">{departureEffectiveDate}</dd></div>
            {(showLeaseEndDate ? leaseEndDate : departureEffectiveDate) !== departureEffectiveDate ? (
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Fin du bail</dt><dd className="font-medium">{leaseEndDate}</dd></div>
            ) : null}
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Caution</dt><dd className="font-medium">{formatMoney(depositHeldAmount, currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Retenue</dt><dd className="font-medium">{formatMoney(effectiveRetention, currencyCode)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-3"><dt className="text-slate-500">Montant à rembourser</dt><dd className="text-base font-semibold">{formatMoney(refundAmount, currencyCode)}</dd></div>
          </dl>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("deposit")} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
              Retour
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
            >
              {submitting ? "Enregistrement…" : "Terminer la location"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
