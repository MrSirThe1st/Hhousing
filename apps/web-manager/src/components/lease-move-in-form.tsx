"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreateLeaseOutput, PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import { postWithAuth } from "../lib/api-client";

type ChargeFrequency = "one_time" | "monthly" | "quarterly" | "annually";
type ChargeType = "deposit" | "fee" | "other" | "prorated_rent";

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
    label: chargeType === "deposit" ? "Dépôt de garantie" : chargeType === "prorated_rent" ? "Loyer proratisé" : "",
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
  const eligibleProperties = useMemo(
    () => items.filter(({ units }) => units.some((unit) => unit.status === "vacant")),
    [items]
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
  const [currencyCode, setCurrencyCode] = useState("CDF");
  const [depositRows, setDepositRows] = useState<ChargeRowState[]>([createChargeRow("deposit")]);
  const [otherCharges, setOtherCharges] = useState<ChargeRowState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProperty = useMemo(
    () => eligibleProperties.find((item) => item.property.id === propertyId) ?? null,
    [eligibleProperties, propertyId]
  );

  const vacantUnits = useMemo(
    () => selectedProperty?.units.filter((unit) => unit.status === "vacant") ?? [],
    [selectedProperty]
  );

  const [unitId, setUnitId] = useState<string>(initialUnitId ?? vacantUnits[0]?.id ?? "");
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === tenantId) ?? null,
    [tenantId, tenants]
  );
  const selectedUnit = useMemo(
    () => vacantUnits.find((unit) => unit.id === unitId) ?? vacantUnits[0] ?? null,
    [unitId, vacantUnits]
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

  const dueDayOfMonth = Number(paymentStartDate.substring(8, 10));

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
      ? vacantUnits[0]?.id ?? ""
      : unitId;

    if (!selectedUnitId) {
      setError("Veuillez sélectionner une unité vacante.");
      setBusy(false);
      return;
    }

    const rentAmount = Number(monthlyRentAmount);
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

    const allCharges = [...depositRows, ...otherCharges]
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

    if (allCharges.some((charge) => !Number.isFinite(charge.amount) || charge.amount <= 0)) {
      setError("Chaque dépôt ou charge doit avoir un montant positif.");
      setBusy(false);
      return;
    }

    const result = await postWithAuth<CreateLeaseOutput>("/api/leases", {
      organizationId,
      unitId: selectedUnitId,
      tenantId,
      startDate: paymentStartDate,
      endDate: termType === "fixed" ? new Date(new Date(paymentStartDate).setMonth(new Date(paymentStartDate).getMonth() + Number(fixedTermMonths))).toISOString().substring(0, 10) : null,
      monthlyRentAmount: rentAmount,
      currencyCode: currencyCode.trim().toUpperCase(),
      termType,
      fixedTermMonths: termType === "fixed" ? Number(fixedTermMonths) : null,
      autoRenewToMonthly,
      paymentFrequency,
      paymentStartDate,
      dueDayOfMonth,
      charges: allCharges
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
                  setUnitId(nextProperty?.units.find((unit) => unit.status === "vacant")?.id ?? "");
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
                <span className="mb-1.5 block">Unité vacante</span>
                <select
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Sélectionner une unité vacante</option>
                  {vacantUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.unitNumber}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Unité vacante</span>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {vacantUnits[0] ? `Unité sélectionnée automatiquement: ${vacantUnits[0].unitNumber}` : "Aucune unité vacante"}
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
              <input value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" maxLength={3} placeholder="Devise" required />
            </label>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Jour d'échéance auto-rempli: {dueDayOfMonth}
          </div>
        </section>

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
                <input value={row.currencyCode} onChange={(event) => updateChargeRow(setDepositRows, row.id, "currencyCode", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" placeholder="Devise" maxLength={3} />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Date d'échéance</span>
                <input type="date" value={row.startDate} onChange={(event) => updateChargeRow(setDepositRows, row.id, "startDate", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <button type="button" onClick={() => removeChargeRow(setDepositRows, row.id)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Retirer</button>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#010a19]">Other Lease Transactions</h2>
            <button type="button" onClick={() => addChargeRow(setOtherCharges, "other")} className="text-sm font-medium text-[#0063fe] hover:underline">Ajouter une charge</button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => addChargeRow(setOtherCharges, "fee")} className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50">Ajouter des frais ponctuels</button>
            <button type="button" onClick={() => addChargeRow(setOtherCharges, "prorated_rent")} className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50">Ajouter un loyer proratisé</button>
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
                <input value={row.currencyCode} onChange={(event) => updateChargeRow(setOtherCharges, row.id, "currencyCode", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" placeholder="Devise" maxLength={3} />
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
            <p className="mt-1">L&apos;adresse e-mail du locataire sélectionné sera utilisée au moment de la finalisation du move in.</p>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Adresse e-mail utilisée pour l'invitation</span>
              <input value={inviteEmail} readOnly className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" placeholder="Aucune adresse e-mail renseignée" type="email" />
            </label>
          </div>
        </section>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <button type="submit" disabled={busy} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60">
          {busy ? "Enregistrement..." : "Enregistrer comme brouillon"}
        </button>
      </form>
    </div>
  );
}