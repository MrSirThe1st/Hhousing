"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookDemo } from "../contexts/book-demo-context";
import {
  formatDemoSlotForDisplay,
  listDemoDays,
  listDemoSlotsForDate,
  type DemoDayOption,
  type DemoTimeSlot
} from "../lib/demo-booking";

type Phase = "email" | "details" | "schedule" | "success";
type Status = "idle" | "loading" | "error";

const UNITS_OPTIONS = [
  { value: "1-5", label: "1 à 5" },
  { value: "6-20", label: "6 à 20" },
  { value: "21-50", label: "21 à 50" },
  { value: "50+", label: "Plus de 50" }
] as const;

const inputClassName =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#4A86D4] focus:ring-2 focus:ring-[#4A86D4]/20";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function BookDemoModal(): React.ReactElement | null {
  const { isOpen, close } = useBookDemo();
  const [phase, setPhase] = useState<Phase>("email");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitsCount, setUnitsCount] = useState<string>("1-5");
  const [company, setCompany] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStartsAt, setSelectedStartsAt] = useState<string>("");

  const days = useMemo(() => listDemoDays(), [isOpen]);
  const slots = useMemo(
    () => (selectedDate ? listDemoSlotsForDate(selectedDate) : []),
    [selectedDate, isOpen]
  );

  useEffect(() => {
    if (!isOpen) return;

    setPhase("email");
    setStatus("idle");
    setErrorMessage(null);
    setEmail("");
    setFullName("");
    setPhone("");
    setUnitsCount("1-5");
    setCompany("");
    setSelectedDate("");
    setSelectedStartsAt("");

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (!selectedDate && days.length > 0) {
      setSelectedDate(days[0].date);
    }
  }, [days, selectedDate]);

  useEffect(() => {
    setSelectedStartsAt("");
  }, [selectedDate]);

  if (!isOpen) return null;

  function confirmEmail(event: React.FormEvent): void {
    event.preventDefault();
    setErrorMessage(null);
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setErrorMessage("Entrez une adresse e-mail valide.");
      return;
    }
    setEmail(trimmed);
    setPhase("details");
  }

  function confirmDetails(event: React.FormEvent): void {
    event.preventDefault();
    setErrorMessage(null);
    if (fullName.trim().length < 2) {
      setErrorMessage("Indiquez votre nom complet.");
      return;
    }
    if (phone.trim().length < 8) {
      setErrorMessage("Indiquez un numéro de téléphone valide.");
      return;
    }
    setPhase("schedule");
  }

  async function submitBooking(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    if (!selectedStartsAt) {
      setErrorMessage("Choisissez une date et une heure.");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          company: company.trim(),
          unitsCount,
          scheduledAt: selectedStartsAt
        })
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !json.success) {
        setStatus("error");
        setErrorMessage(json.error ?? "Impossible d'envoyer la demande. Réessayez.");
        return;
      }
      setStatus("idle");
      setPhase("success");
    } catch {
      setStatus("error");
      setErrorMessage("Erreur réseau. Vérifiez votre connexion et réessayez.");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1F3B63]/45 backdrop-blur-[2px]"
        aria-label="Fermer"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-demo-title"
        className="relative z-[81] flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4A86D4]">
              Démonstration
            </p>
            <h2 id="book-demo-title" className="mt-1 text-lg font-bold text-[#1F3B63] sm:text-xl">
              {phase === "success" ? "Demande reçue" : "Réserver une démo"}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {phase === "details" || phase === "schedule" ? (
          <div className="flex gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
            <StepPill active={phase === "details"} done={phase === "schedule"} label="1 · Infos" />
            <StepPill active={phase === "schedule"} done={false} label="2 · Créneau" />
          </div>
        ) : null}

        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {phase === "email" ? (
            <form onSubmit={confirmEmail} className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Entrez votre e-mail pour commencer. Nous l&apos;utiliserons pour confirmer votre créneau.
              </p>
              <label className="block text-sm font-medium text-slate-700">
                Adresse e-mail
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                  placeholder="vous@agence.com"
                />
              </label>
              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#4A86D4] px-5 text-sm font-semibold text-white transition hover:bg-[#3B73BC]"
              >
                Continuer
              </button>
            </form>
          ) : null}

          {phase === "details" ? (
            <form onSubmit={confirmDetails} className="space-y-4">
              <p className="text-sm text-slate-500">
                E-mail : <span className="font-medium text-slate-800">{email}</span>
              </p>
              <label className="block text-sm font-medium text-slate-700">
                Nom complet
                <input
                  required
                  autoComplete="name"
                  autoFocus
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClassName}
                  placeholder="Jean Mukendi"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Téléphone / WhatsApp
                <input
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={inputClassName}
                  placeholder="+243 ..."
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Nombre de logements
                <select
                  value={unitsCount}
                  onChange={(event) => setUnitsCount(event.target.value)}
                  className={inputClassName}
                >
                  {UNITS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Entreprise <span className="font-normal text-slate-400">(optionnel)</span>
                <input
                  autoComplete="organization"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className={inputClassName}
                  placeholder="Nom de l'agence ou du portefeuille"
                />
              </label>
              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setPhase("email");
                  }}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 flex-[1.4] items-center justify-center rounded-lg bg-[#4A86D4] px-4 text-sm font-semibold text-white transition hover:bg-[#3B73BC]"
                >
                  Continuer
                </button>
              </div>
            </form>
          ) : null}

          {phase === "schedule" ? (
            <form onSubmit={submitBooking} className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Choisissez un créneau de 30 minutes (Kinshasa, jours ouvrés 09:00–17:00).
              </p>

              {days.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Aucun créneau disponible pour le moment. Réessayez plus tard ou contactez-nous sur
                  WhatsApp.
                </p>
              ) : (
                <>
                  <DayPicker
                    days={days}
                    selectedDate={selectedDate}
                    onSelect={(date) => setSelectedDate(date)}
                  />
                  <TimePicker
                    slots={slots}
                    selectedStartsAt={selectedStartsAt}
                    onSelect={setSelectedStartsAt}
                  />
                </>
              )}

              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setPhase("details");
                  }}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={status === "loading" || !selectedStartsAt}
                  className="inline-flex h-11 flex-[1.4] items-center justify-center rounded-lg bg-[#4A86D4] px-4 text-sm font-semibold text-white transition hover:bg-[#3B73BC] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "loading" ? "Envoi…" : "Confirmer"}
                </button>
              </div>
            </form>
          ) : null}

          {phase === "success" ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-[#1F3B63]">Demande reçue</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Merci {fullName.trim().split(/\s+/)[0] || ""}. Nous avons bien enregistré votre demande
                {selectedStartsAt ? (
                  <>
                    {" "}
                    pour le{" "}
                    <span className="font-medium text-slate-800">
                      {formatDemoSlotForDisplay(selectedStartsAt)}
                    </span>
                  </>
                ) : null}
                .
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#4A86D4] px-5 text-sm font-semibold text-white transition hover:bg-[#3B73BC]"
              >
                Fermer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepPill({
  label,
  active,
  done
}: {
  label: string;
  active: boolean;
  done: boolean;
}): React.ReactElement {
  return (
    <span
      className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-[#4A86D4] text-white"
          : done
            ? "bg-[#D7E7F7] text-[#1F3B63]"
            : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }): React.ReactElement {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>
  );
}

function DayPicker({
  days,
  selectedDate,
  onSelect
}: {
  days: DemoDayOption[];
  selectedDate: string;
  onSelect: (date: string) => void;
}): React.ReactElement {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">Date</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const selected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              className={`min-w-[4.75rem] shrink-0 rounded-lg border px-3 py-2.5 text-center transition ${
                selected
                  ? "border-[#4A86D4] bg-[#4A86D4] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#9CB8D6]"
              }`}
            >
              <span className="block text-[11px] font-medium opacity-80">{day.weekdayShort}</span>
              <span className="mt-0.5 block text-sm font-semibold">{day.dayNumber}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({
  slots,
  selectedStartsAt,
  onSelect
}: {
  slots: DemoTimeSlot[];
  selectedStartsAt: string;
  onSelect: (startsAt: string) => void;
}): React.ReactElement {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">Heure</p>
      {slots.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Aucun créneau restant pour ce jour.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const selected = slot.startsAt === selectedStartsAt;
            return (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => onSelect(slot.startsAt)}
                className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? "border-[#4A86D4] bg-[#4A86D4] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#9CB8D6]"
                }`}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
