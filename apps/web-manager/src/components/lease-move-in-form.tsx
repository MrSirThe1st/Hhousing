"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreateLeaseOutput, PropertyWithUnitsView } from "@hhousing/api-contracts";
import { calculateMonthlyProration, type Tenant } from "@hhousing/domain";
import { postWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";

type ChargeFrequency = "one_time" | "monthly" | "quarterly" | "annually";
type ChargeType = "deposit" | "fee" | "other";
type MoveInMode = "standard" | "existing_tenant";
type WizardStep = "who" | "where" | "rent" | "deposit" | "confirm";

const WIZARD_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "who", label: "Qui ?" },
  { id: "where", label: "Où ?" },
  { id: "rent", label: "Loyer" },
  { id: "deposit", label: "Garantie" },
  { id: "confirm", label: "Confirmer" }
];

interface ChargeRowState {
  id: string;
  label: string;
  amount: string;
  currencyCode: string;
  frequency: ChargeFrequency;
  startDate: string;
  endDate: string;
  chargeType: ChargeType;
}

function createChargeRow(chargeType: ChargeType, currencyCode = "CDF"): ChargeRowState {
  return {
    id: `${chargeType}_${Math.random().toString(36).slice(2, 8)}`,
    label: chargeType === "deposit" ? "Garantie locative" : "",
    amount: "",
    currencyCode,
    frequency: chargeType === "deposit" ? "one_time" : "monthly",
    startDate: new Date().toISOString().substring(0, 10),
    endDate: "",
    chargeType
  };
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) {
    return "—";
  }
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("fr-FR");
}

function formatMoney(amount: number | string, currencyCode: string): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toLocaleString("fr-FR")} ${currencyCode}`;
}

interface LeaseMoveInFormProps {
  organizationId: string;
  items: PropertyWithUnitsView[];
  tenants: Tenant[];
  initialTenantId?: string;
  initialPropertyId?: string;
  initialUnitId?: string;
  initialApplicationId?: string;
  fromOnboarding?: boolean;
}

export default function LeaseMoveInForm({
  organizationId,
  items,
  tenants,
  initialTenantId,
  initialPropertyId,
  initialUnitId,
  initialApplicationId,
  fromOnboarding = false
}: LeaseMoveInFormProps): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("who");
  const [moveInMode, setMoveInMode] = useState<MoveInMode>("existing_tenant");
  const eligibleProperties = useMemo(
    () => items.filter(({ units }) => units.some((unit) => unit.status === "vacant" || (moveInMode === "existing_tenant" && unit.status === "occupied"))),
    [items, moveInMode]
  );
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId ?? eligibleProperties[0]?.property.id ?? "");
  const [tenantId, setTenantId] = useState<string>(initialTenantId ?? tenants[0]?.id ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [termType, setTermType] = useState<"fixed" | "month_to_month">("month_to_month");
  const [fixedTermMonths, setFixedTermMonths] = useState("12");
  const [autoRenewToMonthly, setAutoRenewToMonthly] = useState(true);
  const [monthlyRentAmount, setMonthlyRentAmount] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState<"monthly" | "quarterly" | "annually">("monthly");
  const [paymentStartDate, setPaymentStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaseStartDate, setLeaseStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [depositAlreadyPaid, setDepositAlreadyPaid] = useState(true);
  const [externalDepositAmount, setExternalDepositAmount] = useState("");
  const [externalDepositNote, setExternalDepositNote] = useState("Payé avant l'enregistrement");
  const [skipFirstRent, setSkipFirstRent] = useState(false);
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [sendMobileInvite, setSendMobileInvite] = useState(false);
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [showLeaseOptions, setShowLeaseOptions] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("CDF");
  const [depositRows, setDepositRows] = useState<ChargeRowState[]>([createChargeRow("deposit")]);
  const [otherCharges, setOtherCharges] = useState<ChargeRowState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProperty = useMemo(
    () => eligibleProperties.find((item) => item.property.id === propertyId) ?? null,
    [eligibleProperties, propertyId]
  );

  const eligibleUnits = useMemo(
    () => selectedProperty?.units.filter((unit) => unit.status === "vacant" || (moveInMode === "existing_tenant" && unit.status === "occupied")) ?? [],
    [selectedProperty, moveInMode]
  );

  const [unitId, setUnitId] = useState<string>(initialUnitId ?? eligibleUnits[0]?.id ?? "");
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === tenantId) ?? null,
    [tenantId, tenants]
  );
  const selectedUnit = useMemo(
    () => eligibleUnits.find((unit) => unit.id === unitId) ?? eligibleUnits[0] ?? null,
    [unitId, eligibleUnits]
  );

  useEffect(() => {
    if (!selectedUnit) {
      return;
    }

    setUnitId((current) => current || selectedUnit.id);
    setMonthlyRentAmount(String(selectedUnit.monthlyRentAmount));
    setCurrencyCode(selectedUnit.currencyCode);
    setDepositRows((previous) => previous.map((row) => ({ ...row, currencyCode: selectedUnit.currencyCode })));
    setOtherCharges((previous) => previous.map((row) => ({ ...row, currencyCode: selectedUnit.currencyCode })));
  }, [selectedUnit]);

  useEffect(() => {
    setInviteEmail(selectedTenant?.email ?? "");
  }, [selectedTenant]);

  useEffect(() => {
    if (propertyId && !eligibleProperties.some((item) => item.property.id === propertyId)) {
      const nextPropertyId = eligibleProperties[0]?.property.id ?? "";
      setPropertyId(nextPropertyId);
      const nextProperty = eligibleProperties[0] ?? null;
      setUnitId(nextProperty?.units.find((unit) => unit.status === "vacant" || (moveInMode === "existing_tenant" && unit.status === "occupied"))?.id ?? "");
    }
  }, [eligibleProperties, moveInMode, propertyId]);

  const rentAmount = Number(monthlyRentAmount);
  const effectiveLeaseStartDate = moveInMode === "existing_tenant" ? leaseStartDate : paymentStartDate;
  const prorationPreview = useMemo(() => {
    if (moveInMode === "existing_tenant" || paymentFrequency !== "monthly" || !Number.isFinite(rentAmount) || rentAmount <= 0) {
      return null;
    }

    return calculateMonthlyProration({
      startDate: paymentStartDate,
      monthlyRentAmount: rentAmount
    });
  }, [moveInMode, paymentFrequency, paymentStartDate, rentAmount]);

  const recurringStartDate = prorationPreview?.isProrated
    ? prorationPreview.regularBillingStartDate
    : paymentStartDate;
  const dueDayOfMonth = Number(recurringStartDate.substring(8, 10));
  const stepIndex = WIZARD_STEPS.findIndex((item) => item.id === step);

  function updateChargeRow(
    setRows: React.Dispatch<React.SetStateAction<ChargeRowState[]>>,
    rowId: string,
    field: keyof ChargeRowState,
    value: string
  ): void {
    setRows((previous) => previous.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  }

  function addChargeRow(setRows: React.Dispatch<React.SetStateAction<ChargeRowState[]>>, chargeType: ChargeType): void {
    setRows((previous) => [...previous, createChargeRow(chargeType, currencyCode)]);
  }

  function removeChargeRow(setRows: React.Dispatch<React.SetStateAction<ChargeRowState[]>>, rowId: string): void {
    setRows((previous) => previous.filter((row) => row.id !== rowId));
  }

  function validateStep(currentStep: WizardStep): string | null {
    if (currentStep === "where") {
      const selectedUnitId = selectedProperty?.property.propertyType === "single_unit"
        ? eligibleUnits[0]?.id ?? ""
        : unitId;
      if (!propertyId || !selectedUnitId) {
        return moveInMode === "existing_tenant"
          ? "Choisissez le bien et l'unité occupée."
          : "Choisissez le bien et une unité vacante.";
      }
      if (!tenantId) {
        return "Choisissez le locataire.";
      }
      if (!selectedTenant?.phone?.trim()) {
        return "Ajoutez un numéro de téléphone sur la fiche locataire avant de continuer.";
      }
      return null;
    }

    if (currentStep === "rent") {
      if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
        return "Indiquez un loyer positif.";
      }
      if (!paymentStartDate) {
        return "Indiquez la date de première échéance.";
      }
      if (moveInMode === "existing_tenant" && !leaseStartDate) {
        return "Indiquez la date d'emménagement.";
      }
      if (termType === "fixed") {
        const months = Number(fixedTermMonths);
        if (!Number.isFinite(months) || months <= 0) {
          return "Indiquez la durée du bail en mois.";
        }
      }
      return null;
    }

    if (currentStep === "deposit") {
      if (moveInMode === "existing_tenant" && depositAlreadyPaid) {
        const externalAmount = Number(externalDepositAmount);
        if (!Number.isFinite(externalAmount) || externalAmount <= 0) {
          return "Indiquez le montant de la caution déjà payée.";
        }
        return null;
      }

      const filledDeposits = depositRows.filter((row) => row.label.trim().length > 0 && row.amount.trim().length > 0);
      if (filledDeposits.length === 0) {
        return "Ajoutez au moins une caution, ou indiquez qu'elle est déjà payée.";
      }
      if (filledDeposits.some((row) => !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)) {
        return "Chaque caution doit avoir un montant positif.";
      }

      const filledExtras = otherCharges.filter((row) => row.label.trim().length > 0 && row.amount.trim().length > 0);
      if (filledExtras.some((row) => !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)) {
        return "Chaque frais supplémentaire doit avoir un montant positif.";
      }
      return null;
    }

    return null;
  }

  function goNext(): void {
    setError(null);
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    const next = WIZARD_STEPS[stepIndex + 1];
    if (next) {
      setStep(next.id);
    }
  }

  function goBack(): void {
    setError(null);
    const previous = WIZARD_STEPS[stepIndex - 1];
    if (previous) {
      setStep(previous.id);
    }
  }

  async function handleConfirm(): Promise<void> {
    setBusy(true);
    setError(null);

    for (const wizardStep of WIZARD_STEPS) {
      if (wizardStep.id === "confirm" || wizardStep.id === "who") {
        continue;
      }
      const validationError = validateStep(wizardStep.id);
      if (validationError) {
        setError(validationError);
        setStep(wizardStep.id);
        setBusy(false);
        return;
      }
    }

    const selectedUnitId = selectedProperty?.property.propertyType === "single_unit"
      ? eligibleUnits[0]?.id ?? ""
      : unitId;

    const allCharges = moveInMode === "existing_tenant" && depositAlreadyPaid
      ? [...otherCharges]
      : [...depositRows, ...otherCharges];
    const normalizedCharges = allCharges
      .filter((row) => row.label.trim().length > 0 && row.amount.trim().length > 0)
      .map((row) => ({
        label: row.label.trim(),
        chargeType: row.chargeType,
        amount: Number(row.amount),
        currencyCode: row.currencyCode.trim().toUpperCase(),
        frequency: row.frequency,
        startDate: row.chargeType === "deposit" ? effectiveLeaseStartDate : (row.startDate || effectiveLeaseStartDate),
        endDate: row.endDate || null
      }));

    const skipInitialChargeTypes: Array<"deposit" | "first_rent"> = [];
    if (moveInMode === "existing_tenant") {
      if (depositAlreadyPaid) {
        skipInitialChargeTypes.push("deposit");
      }
      if (skipFirstRent) {
        skipInitialChargeTypes.push("first_rent");
      }
    }

    const result = await postWithAuth<CreateLeaseOutput>("/api/leases", {
      organizationId,
      unitId: selectedUnitId,
      tenantId,
      startDate: effectiveLeaseStartDate,
      endDate: termType === "fixed"
        ? new Date(new Date(effectiveLeaseStartDate).setMonth(new Date(effectiveLeaseStartDate).getMonth() + Number(fixedTermMonths))).toISOString().substring(0, 10)
        : null,
      monthlyRentAmount: rentAmount,
      currencyCode: currencyCode.trim().toUpperCase(),
      termType,
      fixedTermMonths: termType === "fixed" ? Number(fixedTermMonths) : null,
      autoRenewToMonthly,
      paymentFrequency,
      paymentStartDate: recurringStartDate,
      dueDayOfMonth,
      charges: normalizedCharges,
      moveInMode,
      activateImmediately: moveInMode === "existing_tenant" ? activateImmediately : false,
      skipInitialChargeTypes,
      externalDepositAmount: moveInMode === "existing_tenant" && depositAlreadyPaid ? Number(externalDepositAmount) : null,
      externalDepositNote: moveInMode === "existing_tenant" && depositAlreadyPaid ? externalDepositNote.trim() || "Payé avant l'enregistrement" : null,
      externalDepositPaidDate: moveInMode === "existing_tenant" && depositAlreadyPaid ? effectiveLeaseStartDate : null,
      sendMobileInvite: moveInMode === "existing_tenant" ? sendMobileInvite : false
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push(fromOnboarding ? "/onboarding" : `/dashboard/leases/${result.data.id}`);
    router.refresh();
  }

  const frequencyLabel = paymentFrequency === "monthly"
    ? "Mensuel"
    : paymentFrequency === "quarterly"
      ? "Trimestriel"
      : "Annuel";

  const depositSummary = moveInMode === "existing_tenant" && depositAlreadyPaid
    ? `Déjà payée · ${formatMoney(externalDepositAmount, currencyCode)}`
    : depositRows
      .filter((row) => row.label.trim() && row.amount.trim())
      .map((row) => `${row.label}: ${formatMoney(row.amount, row.currencyCode)}`)
      .join(" · ") || "—";

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 max-w-2xl">
        <Link
          href={fromOnboarding ? "/onboarding" : "/dashboard/leases"}
          className="mb-4 inline-block text-sm text-[#0063fe] hover:underline"
        >
          {fromOnboarding ? "← Retour à la configuration" : "← Retour aux baux"}
        </Link>
        <h1 className="text-2xl font-semibold text-[#010a19]">
          {fromOnboarding ? "Premier bail" : "Enregistrer un locataire"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Suivez les étapes. Une seule décision à la fois.
        </p>
        {initialApplicationId ? (
          <p className="mt-2 text-sm text-gray-500">Prérempli depuis la candidature {initialApplicationId}.</p>
        ) : null}
      </div>

      <div className="mb-6 max-w-2xl">
        <div className="flex items-center gap-1 sm:gap-2">
          {WIZARD_STEPS.map((wizardStep, index) => {
            const isCurrent = wizardStep.id === step;
            const isDone = index < stepIndex;
            return (
              <div key={wizardStep.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isCurrent
                        ? "bg-[#0063fe] text-white"
                        : isDone
                          ? "bg-[#0063fe]/15 text-[#0063fe]"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`hidden truncate text-xs sm:block ${isCurrent ? "font-semibold text-[#010a19]" : "text-slate-500"}`}>
                    {wizardStep.label}
                  </span>
                </div>
                {index < WIZARD_STEPS.length - 1 ? (
                  <div className={`mb-4 hidden h-0.5 flex-1 sm:block ${isDone ? "bg-[#0063fe]/40" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm font-medium text-[#010a19] sm:hidden">
          Étape {stepIndex + 1} sur {WIZARD_STEPS.length} · {WIZARD_STEPS[stepIndex]?.label}
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        {step === "who" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Qui emménage ?</h2>
              <p className="mt-1 text-sm text-slate-600">Choisissez le cas qui correspond à votre situation.</p>
            </div>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setMoveInMode("existing_tenant");
                  setDepositAlreadyPaid(true);
                }}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  moveInMode === "existing_tenant"
                    ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-[#010a19]">Locataire déjà en place</p>
                <p className="mt-1 text-sm text-slate-600">
                  Il habite déjà le logement. Vous digitalisez le bail (dates passées, caution déjà payée possible).
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoveInMode("standard");
                  setDepositAlreadyPaid(false);
                }}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  moveInMode === "standard"
                    ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-[#010a19]">Nouveau locataire</p>
                <p className="mt-1 text-sm text-slate-600">
                  Il emménage maintenant. Vous créez le bail, la caution et la première échéance.
                </p>
              </button>
            </div>
          </section>
        ) : null}

        {step === "where" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Où et qui ?</h2>
              <p className="mt-1 text-sm text-slate-600">Bien, unité, puis locataire.</p>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Bien</span>
              <select
                value={propertyId}
                onChange={(event) => {
                  const nextPropertyId = event.target.value;
                  const nextProperty = eligibleProperties.find((item) => item.property.id === nextPropertyId) ?? null;
                  setPropertyId(nextPropertyId);
                  setUnitId(nextProperty?.units.find((unit) => unit.status === "vacant" || (moveInMode === "existing_tenant" && unit.status === "occupied"))?.id ?? "");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Sélectionner un bien</option>
                {eligibleProperties.map(({ property }) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </label>
            {selectedProperty?.property.propertyType === "multi_unit" ? (
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">{moveInMode === "existing_tenant" ? "Unité" : "Unité vacante"}</span>
                <select
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">{moveInMode === "existing_tenant" ? "Sélectionner une unité" : "Sélectionner une unité vacante"}</option>
                  {eligibleUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unitNumber}{unit.status === "occupied" ? " (occupée)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                {eligibleUnits[0]
                  ? `Unité : ${eligibleUnits[0].unitNumber}`
                  : "Aucune unité disponible pour ce type de move-in."}
              </div>
            )}
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Locataire</span>
              <select
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Sélectionner un locataire</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>
                ))}
              </select>
            </label>
            {selectedTenant ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <p>Téléphone : {selectedTenant.phone ?? "— manquant"}</p>
                <p>WhatsApp : {selectedTenant.whatsappOptIn ? "activé" : "non activé"}</p>
                {!selectedTenant.phone ? (
                  <p className="mt-2 text-amber-700">Ajoutez un numéro sur la fiche locataire avant de continuer.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "rent" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Loyer et dates</h2>
              <p className="mt-1 text-sm text-slate-600">
                {moveInMode === "existing_tenant"
                  ? "Indiquez quand le locataire est entré, et quand facturer la prochaine échéance."
                  : "Indiquez le loyer et la première date de paiement."}
              </p>
            </div>

            {moveInMode === "existing_tenant" ? (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 block">Date d&apos;emménagement</span>
                  <input
                    type="date"
                    value={leaseStartDate}
                    onChange={(event) => setLeaseStartDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                  <span className="mt-1 block text-xs text-slate-500">Peut être dans le passé.</span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={skipFirstRent}
                    onChange={(event) => setSkipFirstRent(event.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-[#010a19]">Le loyer du mois en cours est déjà payé</span>
                    <span className="mt-0.5 block text-slate-500">On ne créera pas cette échéance sur la plateforme.</span>
                  </span>
                </label>
              </>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Montant du loyer</span>
                <input
                  value={monthlyRentAmount}
                  onChange={(event) => setMonthlyRentAmount(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Ex. 250"
                  inputMode="decimal"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Devise</span>
                <select
                  value={currencyCode}
                  onChange={(event) => setCurrencyCode(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="CDF">CDF (Franc Congolais)</option>
                  <option value="USD">USD (Dollar Américain)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Fréquence</span>
                <select
                  value={paymentFrequency}
                  onChange={(event) => setPaymentFrequency(event.target.value as "monthly" | "quarterly" | "annually")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                  <option value="annually">Annuel</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">
                  {moveInMode === "existing_tenant" ? "Prochaine échéance" : "Première échéance"}
                </span>
                <input
                  type="date"
                  value={paymentStartDate}
                  onChange={(event) => setPaymentStartDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Jour d&apos;échéance chaque mois : le {dueDayOfMonth}
            </div>

            {paymentFrequency === "monthly" && moveInMode === "standard" ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-slate-700">
                {prorationPreview?.isProrated ? (
                  <>
                    <p className="font-medium text-[#010a19]">Prorata automatique</p>
                    <p className="mt-1">
                      {prorationPreview.label}: {formatMoney(prorationPreview.proratedAmount, currencyCode)} pour {prorationPreview.coveredDayCount} jour(s).
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Première échéance complète le {formatDisplayDate(prorationPreview.regularBillingStartDate)}.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    Pas de prorata. Première échéance le {formatDisplayDate(recurringStartDate)}.
                  </p>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowLeaseOptions((current) => !current)}
              className="text-sm font-medium text-[#0063fe] hover:underline"
            >
              {showLeaseOptions ? "Masquer les options du bail" : "Options du bail (durée, renouvellement)"}
            </button>
            {showLeaseOptions ? (
              <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setTermType("month_to_month")}
                    className={`rounded-md px-3 py-2 text-sm ${termType === "month_to_month" ? "bg-[#0063fe] text-white" : "text-gray-600"}`}
                  >
                    Mois à mois
                  </button>
                  <button
                    type="button"
                    onClick={() => setTermType("fixed")}
                    className={`rounded-md px-3 py-2 text-sm ${termType === "fixed" ? "bg-[#0063fe] text-white" : "text-gray-600"}`}
                  >
                    Durée fixe
                  </button>
                </div>
                {termType === "fixed" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700">
                      <span className="mb-1.5 block">Durée (mois)</span>
                      <input
                        value={fixedTermMonths}
                        onChange={(event) => setFixedTermMonths(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={autoRenewToMonthly}
                        onChange={(event) => setAutoRenewToMonthly(event.target.checked)}
                      />
                      Passer en mois à mois à la fin
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "deposit" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Garantie</h2>
              <p className="mt-1 text-sm text-slate-600">
                {moveInMode === "existing_tenant"
                  ? "Dans la plupart des cas, la caution est déjà payée hors plateforme."
                  : "Indiquez le montant de la caution à encaisser."}
              </p>
            </div>

            {moveInMode === "existing_tenant" ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setDepositAlreadyPaid(true)}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    depositAlreadyPaid
                      ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-semibold text-[#010a19]">Déjà payée</p>
                  <p className="mt-1 text-sm text-slate-600">Enregistrer le montant sans créer une échéance à payer.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAlreadyPaid(false)}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    !depositAlreadyPaid
                      ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-semibold text-[#010a19]">À encaisser encore</p>
                  <p className="mt-1 text-sm text-slate-600">Créer une caution à suivre sur la plateforme.</p>
                </button>
              </div>
            ) : null}

            {moveInMode === "existing_tenant" && depositAlreadyPaid ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 block">Montant déjà payé</span>
                  <input
                    value={externalDepositAmount}
                    onChange={(event) => setExternalDepositAmount(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="Montant"
                    inputMode="decimal"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 block">Note (optionnel)</span>
                  <input
                    value={externalDepositNote}
                    onChange={(event) => setExternalDepositNote(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="Payé avant l'enregistrement"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {depositRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                      <span className="mb-1.5 block">Libellé</span>
                      <input
                        value={row.label}
                        onChange={(event) => updateChargeRow(setDepositRows, row.id, "label", event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        placeholder="Garantie locative"
                      />
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      <span className="mb-1.5 block">Montant</span>
                      <input
                        value={row.amount}
                        onChange={(event) => updateChargeRow(setDepositRows, row.id, "amount", event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        placeholder="Montant"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      <span className="mb-1.5 block">Devise</span>
                      <select
                        value={row.currencyCode}
                        onChange={(event) => updateChargeRow(setDepositRows, row.id, "currencyCode", event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="CDF">CDF</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                    {depositRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeChargeRow(setDepositRows, row.id)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 sm:col-span-2"
                      >
                        Retirer cette caution
                      </button>
                    ) : null}
                    {index === 0 ? (
                      <p className="text-xs text-slate-500 sm:col-span-2">
                        La date d&apos;échéance de la caution est alignée automatiquement sur la date du bail.
                      </p>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addChargeRow(setDepositRows, "deposit")}
                  className="text-sm font-medium text-[#0063fe] hover:underline"
                >
                  + Ajouter une autre caution
                </button>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowExtraCharges((current) => !current)}
                className="text-sm font-medium text-[#0063fe] hover:underline"
              >
                {showExtraCharges ? "Masquer les autres frais" : "Ajouter d'autres frais (optionnel)"}
              </button>
              {showExtraCharges ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addChargeRow(setOtherCharges, "fee")}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      + Frais ponctuels
                    </button>
                    <button
                      type="button"
                      onClick={() => addChargeRow(setOtherCharges, "other")}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      + Autre charge
                    </button>
                  </div>
                  {otherCharges.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun frais supplémentaire.</p>
                  ) : null}
                  {otherCharges.map((row) => (
                    <div key={row.id} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                        <span className="mb-1.5 block">Libellé</span>
                        <input
                          value={row.label}
                          onChange={(event) => updateChargeRow(setOtherCharges, row.id, "label", event.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        />
                      </label>
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="mb-1.5 block">Montant</span>
                        <input
                          value={row.amount}
                          onChange={(event) => updateChargeRow(setOtherCharges, row.id, "amount", event.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          inputMode="decimal"
                        />
                      </label>
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="mb-1.5 block">Fréquence</span>
                        <select
                          value={row.frequency}
                          onChange={(event) => updateChargeRow(setOtherCharges, row.id, "frequency", event.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        >
                          <option value="one_time">Ponctuelle</option>
                          <option value="monthly">Mensuelle</option>
                          <option value="quarterly">Trimestrielle</option>
                          <option value="annually">Annuelle</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeChargeRow(setOtherCharges, row.id)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 sm:col-span-2"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === "confirm" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Vérifiez avant d&apos;enregistrer</h2>
              <p className="mt-1 text-sm text-slate-600">Résumé en langage simple. Corrigez si besoin en revenant en arrière.</p>
            </div>

            <dl className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Type</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {moveInMode === "existing_tenant" ? "Locataire déjà en place" : "Nouveau locataire"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Bien</dt>
                <dd className="text-right font-medium text-[#010a19]">{selectedProperty?.property.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Unité</dt>
                <dd className="text-right font-medium text-[#010a19]">{selectedUnit?.unitNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Locataire</dt>
                <dd className="text-right font-medium text-[#010a19]">{selectedTenant?.fullName ?? "—"}</dd>
              </div>
              {moveInMode === "existing_tenant" ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Emménagement</dt>
                  <dd className="text-right font-medium text-[#010a19]">{formatDisplayDate(leaseStartDate)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Loyer</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {formatMoney(rentAmount, currencyCode)} · {frequencyLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  {moveInMode === "existing_tenant" ? "Prochaine échéance" : "Première échéance"}
                </dt>
                <dd className="text-right font-medium text-[#010a19]">{formatDisplayDate(recurringStartDate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Garantie</dt>
                <dd className="text-right font-medium text-[#010a19]">{depositSummary}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Bail</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {termType === "month_to_month" ? "Mois à mois" : `Durée fixe · ${fixedTermMonths} mois`}
                </dd>
              </div>
              {moveInMode === "existing_tenant" && skipFirstRent ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Loyer en cours</dt>
                  <dd className="text-right font-medium text-[#010a19]">Déjà payé (non créé)</dd>
                </div>
              ) : null}
            </dl>

            {moveInMode === "existing_tenant" ? (
              <div className="space-y-3 rounded-lg border border-dashed border-gray-300 px-4 py-3">
                <p className="text-sm font-medium text-[#010a19]">Activation</p>
                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={activateImmediately}
                    onChange={(event) => setActivateImmediately(event.target.checked)}
                  />
                  <span>
                    <span className="font-medium">Activer le bail maintenant</span>
                    <span className="mt-0.5 block text-slate-500">Sinon il reste en brouillon.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={sendMobileInvite}
                    onChange={(event) => setSendMobileInvite(event.target.checked)}
                    disabled={!activateImmediately || !inviteEmail}
                  />
                  <span>
                    <span className="font-medium">Envoyer l&apos;invitation mobile</span>
                    <span className="mt-0.5 block text-slate-500">
                      {inviteEmail || "Aucune adresse e-mail sur la fiche locataire"}
                    </span>
                  </span>
                </label>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-slate-600">
                Le bail sera enregistré en brouillon. Vous pourrez finaliser après encaissement des charges initiales.
              </div>
            )}
          </section>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={busy}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Retour
            </button>
          ) : (
            <span />
          )}
          {step === "confirm" ? (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy}
              className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
            >
              {moveInMode === "existing_tenant" && activateImmediately ? "Activer le bail" : "Enregistrer comme brouillon"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={busy}
              className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
            >
              Continuer
            </button>
          )}
        </div>
      </div>

      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
