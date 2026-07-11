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

function createChargeRow(chargeType: ChargeType): ChargeRowState {
  return {
    id: `${chargeType}_${Math.random().toString(36).slice(2, 8)}`,
    label: chargeType === "deposit" ? "Dépôt de garantie" : "",
    amount: "",
    currencyCode: "CDF",
    frequency: chargeType === "deposit" ? "one_time" : "monthly",
    startDate: new Date().toISOString().substring(0, 10),
    endDate: "",
    chargeType
  };
}

interface LeaseMoveInFormProps {
  organizationId: string;
  items: PropertyWithUnitsView[];
  tenants: Tenant[];
  initialTenantId?: string;
  initialPropertyId?: string;
  initialUnitId?: string;
  initialApplicationId?: string;
}

export default function LeaseMoveInForm({
  organizationId,
  items,
  tenants,
  initialTenantId,
  initialPropertyId,
  initialUnitId,
  initialApplicationId
}: LeaseMoveInFormProps): React.ReactElement {
  const router = useRouter();
  const [moveInMode, setMoveInMode] = useState<MoveInMode>("standard");
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
  const [depositAlreadyPaid, setDepositAlreadyPaid] = useState(false);
  const [externalDepositAmount, setExternalDepositAmount] = useState("");
  const [externalDepositNote, setExternalDepositNote] = useState("Paid before onboarding");
  const [skipFirstRent, setSkipFirstRent] = useState(false);
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [sendMobileInvite, setSendMobileInvite] = useState(false);
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

  function updateChargeRow(
    setRows: React.Dispatch<React.SetStateAction<ChargeRowState[]>>,
    rowId: string,
    field: keyof ChargeRowState,
    value: string
  ): void {
    setRows((previous) => previous.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  }

  function addChargeRow(setRows: React.Dispatch<React.SetStateAction<ChargeRowState[]>>, chargeType: ChargeType): void {
    setRows((previous) => [...previous, createChargeRow(chargeType)]);
  }

  function removeChargeRow(setRows: React.Dispatch<React.SetStateAction<ChargeRowState[]>>, rowId: string): void {
    setRows((previous) => previous.filter((row) => row.id !== rowId));
  }

  async function handleMoveIn(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const selectedUnitId = selectedProperty?.property.propertyType === "single_unit"
      ? eligibleUnits[0]?.id ?? ""
      : unitId;

    if (!selectedUnitId) {
      setError(moveInMode === "existing_tenant"
        ? "Veuillez sélectionner une unité."
        : "Veuillez sélectionner une unité vacante.");
      setBusy(false);
      return;
    }

    if (moveInMode === "existing_tenant" && depositAlreadyPaid) {
      const externalAmount = Number(externalDepositAmount);
      if (!Number.isFinite(externalAmount) || externalAmount <= 0) {
        setError("Indiquez le montant du dépôt déjà payé.");
        setBusy(false);
        return;
      }
    }

    if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
      setError("Le loyer doit être un nombre positif.");
      setBusy(false);
      return;
    }

    if (!tenantId) {
      setError("Veuillez sélectionner un locataire.");
      setBusy(false);
      return;
    }

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
        startDate: row.startDate,
        endDate: row.endDate || null
      }));

    if (normalizedCharges.some((charge) => !Number.isFinite(charge.amount) || charge.amount <= 0)) {
      setError("Chaque dépôt ou charge doit avoir un montant positif.");
      setBusy(false);
      return;
    }

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
      endDate: termType === "fixed" ? new Date(new Date(effectiveLeaseStartDate).setMonth(new Date(effectiveLeaseStartDate).getMonth() + Number(fixedTermMonths))).toISOString().substring(0, 10) : null,
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
      externalDepositNote: moveInMode === "existing_tenant" && depositAlreadyPaid ? externalDepositNote.trim() || "Paid before onboarding" : null,
      externalDepositPaidDate: moveInMode === "existing_tenant" && depositAlreadyPaid ? effectiveLeaseStartDate : null,
      sendMobileInvite: moveInMode === "existing_tenant" ? sendMobileInvite : false
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push(`/dashboard/leases/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/leases" className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour aux baux
        </Link>
        <h1 className="text-2xl font-semibold text-[#010a19]">Move in</h1>
        {initialApplicationId ? (
          <p className="mt-2 text-sm text-gray-500">Prefilled from approved application {initialApplicationId}.</p>
        ) : null}
      </div>

      <form onSubmit={handleMoveIn} className="space-y-5 lg:max-w-5xl">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-[#010a19]">Type de move-in</h2>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setMoveInMode("standard")}
              className={`rounded-md px-3 py-2 text-sm ${moveInMode === "standard" ? "bg-[#0063fe] text-white" : "text-gray-600"}`}
            >
              Nouveau locataire
            </button>
            <button
              type="button"
              onClick={() => setMoveInMode("existing_tenant")}
              className={`rounded-md px-3 py-2 text-sm ${moveInMode === "existing_tenant" ? "bg-[#0063fe] text-white" : "text-gray-600"}`}
            >
              Locataire déjà en place
            </button>
          </div>
          {moveInMode === "existing_tenant" ? (
            <p className="text-sm text-gray-600">
              Pour un locataire déjà installé : pas de dépôt à encaisser via la plateforme, date de début rétroactive possible, activation immédiate du bail.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-[#010a19]">Bien et unité</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
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
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">{moveInMode === "existing_tenant" ? "Unité" : "Unité vacante"}</span>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {eligibleUnits[0] ? `Unité sélectionnée automatiquement: ${eligibleUnits[0].unitNumber}` : "Aucune unité disponible"}
                </div>
              </label>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-[#010a19]">Conditions du bail</h2>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button type="button" onClick={() => setTermType("month_to_month")} className={`rounded-md px-3 py-2 text-sm ${termType === "month_to_month" ? "bg-[#0063fe] text-white" : "text-gray-600"}`}>Mois à mois</button>
            <button type="button" onClick={() => setTermType("fixed")} className={`rounded-md px-3 py-2 text-sm ${termType === "fixed" ? "bg-[#0063fe] text-white" : "text-gray-600"}`}>Durée fixe</button>
          </div>
          {termType === "fixed" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Durée fixe (mois)</span>
                <input
                  value={fixedTermMonths}
                  onChange={(event) => setFixedTermMonths(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Durée en mois"
                  inputMode="numeric"
                  required
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
                <input type="checkbox" checked={autoRenewToMonthly} onChange={(event) => setAutoRenewToMonthly(event.target.checked)} />
                Passer en mois à mois après la fin du bail
              </label>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-[#010a19]">Rent Payments</h2>
          {moveInMode === "existing_tenant" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Date d&apos;emménagement (peut être dans le passé)</span>
                <input type="date" value={leaseStartDate} onChange={(event) => setLeaseStartDate(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
                <input type="checkbox" checked={skipFirstRent} onChange={(event) => setSkipFirstRent(event.target.checked)} />
                Le loyer du mois en cours est déjà réglé
              </label>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Loyer de l'unité</span>
              <input value={monthlyRentAmount} onChange={(event) => setMonthlyRentAmount(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Loyer" inputMode="decimal" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Fréquence de facturation</span>
              <select value={paymentFrequency} onChange={(event) => setPaymentFrequency(event.target.value as "monthly" | "quarterly" | "annually")} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="monthly">Mensuel</option>
                <option value="quarterly">Trimestriel</option>
                <option value="annually">Annuel</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Date de première échéance</span>
              <input type="date" value={paymentStartDate} onChange={(event) => setPaymentStartDate(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Devise</span>
              <select value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" required>
                <option value="CDF">CDF (Franc Congolais)</option>
                <option value="USD">USD (Dollar Américain)</option>
              </select>
            </label>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Jour d'échéance auto-rempli: {dueDayOfMonth}
          </div>
          {paymentFrequency === "monthly" ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-slate-700">
              {prorationPreview?.isProrated ? (
                <>
                  <p className="font-medium text-[#010a19]">Prorata automatique activé</p>
                  <p className="mt-1">
                    {prorationPreview.label}: {prorationPreview.proratedAmount.toLocaleString("fr-FR")} {currencyCode.trim().toUpperCase()} pour {prorationPreview.coveredDayCount} jour(s) sur {prorationPreview.totalDayCount}.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    La première échéance mensuelle complète sera planifiée le {new Date(prorationPreview.regularBillingStartDate).toLocaleDateString("fr-FR")}.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-[#010a19]">Aucun prorata requis</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Le bail commence en début de mois. La première échéance complète reste fixée au {new Date(recurringStartDate).toLocaleDateString("fr-FR")}.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </section>

        {moveInMode === "standard" || !depositAlreadyPaid ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#010a19]">Deposits</h2>
            <button type="button" onClick={() => addChargeRow(setDepositRows, "deposit")} className="text-sm font-medium text-[#0063fe] hover:underline">Ajouter un dépôt</button>
          </div>
          {depositRows.map((row) => (
            <div key={row.id} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="block text-sm font-medium text-gray-700 xl:col-span-2">
                <span className="mb-1.5 block">Libellé du dépôt</span>
                <input value={row.label} onChange={(event) => updateChargeRow(setDepositRows, row.id, "label", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Libellé" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Montant</span>
                <input value={row.amount} onChange={(event) => updateChargeRow(setDepositRows, row.id, "amount", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Montant" inputMode="decimal" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Devise</span>
                <select value={row.currencyCode} onChange={(event) => updateChargeRow(setDepositRows, row.id, "currencyCode", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                  <option value="CDF">CDF (Franc Congolais)</option>
                  <option value="USD">USD (Dollar Américain)</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Date d'échéance</span>
                <input type="date" value={row.startDate} onChange={(event) => updateChargeRow(setDepositRows, row.id, "startDate", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <button type="button" onClick={() => removeChargeRow(setDepositRows, row.id)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Retirer</button>
            </div>
          ))}
        </section>
        ) : null}

        {moveInMode === "existing_tenant" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-[#010a19]">Dépôt de garantie</h2>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
              <input type="checkbox" checked={depositAlreadyPaid} onChange={(event) => setDepositAlreadyPaid(event.target.checked)} />
              Dépôt déjà payé hors plateforme
            </label>
            {depositAlreadyPaid ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 block">Montant du dépôt payé</span>
                  <input value={externalDepositAmount} onChange={(event) => setExternalDepositAmount(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Montant" inputMode="decimal" required />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 block">Note (optionnel)</span>
                  <input value={externalDepositNote} onChange={(event) => setExternalDepositNote(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Paid before onboarding" />
                </label>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#010a19]">Other Lease Transactions</h2>
            <button type="button" onClick={() => addChargeRow(setOtherCharges, "other")} className="text-sm font-medium text-[#0063fe] hover:underline">Ajouter une charge</button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => addChargeRow(setOtherCharges, "fee")} className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50">Ajouter des frais ponctuels</button>
          </div>
          {otherCharges.length === 0 ? <p className="text-sm text-gray-500">Aucune charge supplémentaire.</p> : null}
          {otherCharges.map((row) => (
            <div key={row.id} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
              <label className="block text-sm font-medium text-gray-700 xl:col-span-2">
                <span className="mb-1.5 block">Libellé</span>
                <input value={row.label} onChange={(event) => updateChargeRow(setOtherCharges, row.id, "label", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Libellé" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Montant</span>
                <input value={row.amount} onChange={(event) => updateChargeRow(setOtherCharges, row.id, "amount", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Montant" inputMode="decimal" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Devise</span>
                <select value={row.currencyCode} onChange={(event) => updateChargeRow(setOtherCharges, row.id, "currencyCode", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                  <option value="CDF">CDF (Franc Congolais)</option>
                  <option value="USD">USD (Dollar Américain)</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Fréquence</span>
                <select value={row.frequency} onChange={(event) => updateChargeRow(setOtherCharges, row.id, "frequency", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="one_time">Ponctuelle</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="quarterly">Trimestrielle</option>
                  <option value="annually">Annuelle</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Date d'échéance initiale</span>
                <input type="date" value={row.startDate} onChange={(event) => updateChargeRow(setOtherCharges, row.id, "startDate", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <button type="button" onClick={() => removeChargeRow(setOtherCharges, row.id)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Retirer</button>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-[#010a19]">Locataire</h2>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Locataire</span>
            <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required>
              <option value="">Sélectionner un locataire</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600">
            <div className="font-medium text-[#010a19]">Invitation par email</div>
            <p className="mt-1">
              {moveInMode === "existing_tenant" && activateImmediately
                ? "Vous pouvez envoyer l'invitation mobile dès l'activation du bail."
                : "L'adresse e-mail du locataire sélectionné sera utilisée au moment de la finalisation du move in."}
            </p>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Adresse e-mail utilisée pour l'invitation</span>
              <input value={inviteEmail} readOnly className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" placeholder="Aucune adresse e-mail renseignée" type="email" />
            </label>
            {moveInMode === "existing_tenant" ? (
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={activateImmediately} onChange={(event) => setActivateImmediately(event.target.checked)} />
                  Activer le bail immédiatement
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={sendMobileInvite}
                    onChange={(event) => setSendMobileInvite(event.target.checked)}
                    disabled={!activateImmediately || !inviteEmail}
                  />
                  Envoyer l&apos;invitation mobile maintenant
                </label>
              </div>
            ) : null}
          </div>
        </section>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <button type="submit" disabled={busy} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60">
          {moveInMode === "existing_tenant" && activateImmediately ? "Activer le bail" : "Enregistrer comme brouillon"}
        </button>
      </form>

      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}