"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWithAuth, postWithAuth } from "../lib/api-client";
import type { DashboardCalendarEntry, DashboardWorkflowRelatedOption } from "../lib/dashboard-workflow.types";
import type { DashboardCalendarEventTone, DashboardCalendarProps } from "./dashboard-calendar.types";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EVENT_TONE_STYLES: Record<DashboardCalendarEventTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};

type CalendarFormState = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  eventType: "custom" | "inspection" | "reminder";
  relatedType: "property" | "unit" | "lease" | "tenant" | "";
  relatedId: string;
};

function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function addDays(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfMonth(value: Date): Date {
  return createDate(value.getFullYear(), value.getMonth(), 1);
}

function startOfWeek(value: Date): Date {
  const weekdayOffset = (value.getDay() + 6) % 7;
  return addDays(value, -weekdayOffset);
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function getDateKey(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function getMonthDays(viewMonth: Date): Date[] {
  const firstDay = startOfMonth(viewMonth);
  const gridStart = startOfWeek(firstDay);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function clampDay(viewMonth: Date, desiredDay: number): Date {
  const lastDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  return createDate(viewMonth.getFullYear(), viewMonth.getMonth(), Math.min(desiredDay, lastDay));
}

function getTone(entry: DashboardCalendarEntry): DashboardCalendarEventTone {
  if (entry.eventType === "maintenance") return "amber";
  if (entry.eventType === "lease") return "emerald";
  if (entry.eventType === "rent") return "blue";
  if (entry.eventType === "inspection") return "rose";
  if (entry.eventType === "task") return "slate";
  return entry.source === "manual" ? "rose" : "slate";
}

function formatMonthLabel(value: Date): string {
  return value.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatRangeLabel(viewMonth: Date): string {
  const first = startOfWeek(startOfMonth(viewMonth));
  const last = addDays(first, 41);
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return `${formatter.format(first)} - ${formatter.format(last)}`;
}

function formatLocalDateTimeValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatTimeLabel(entry: DashboardCalendarEntry): string {
  return new Date(entry.startAtIso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getRelatedPayload(option: DashboardWorkflowRelatedOption | undefined): {
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
} {
  if (!option) {
    return {
      relatedEntityType: null,
      relatedEntityId: null,
      propertyId: null,
      unitId: null,
      leaseId: null,
      tenantId: null
    };
  }

  return {
    relatedEntityType: option.type,
    relatedEntityId: option.id,
    propertyId: option.type === "property" ? option.id : option.propertyId ?? null,
    unitId: option.type === "unit" ? option.id : option.unitId ?? null,
    leaseId: option.type === "lease" ? option.id : option.leaseId ?? null,
    tenantId: option.type === "tenant" ? option.id : option.tenantId ?? null
  };
}

export default function DashboardCalendar({ organizationId, currentUserId, entries, relatedOptions, scopeLabel }: DashboardCalendarProps): React.ReactElement {
  const router = useRouter();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<CalendarFormState>({
    title: "",
    description: "",
    startAt: formatLocalDateTimeValue(new Date()),
    endAt: "",
    eventType: "custom",
    relatedType: "",
    relatedId: ""
  });
  const today = new Date();
  const monthDays = getMonthDays(viewMonth);
  const monthEntries = useMemo(
    () => entries.filter((entry) => {
      const date = new Date(entry.startAtIso);
      return date.getMonth() === viewMonth.getMonth() && date.getFullYear() === viewMonth.getFullYear();
    }),
    [entries, viewMonth]
  );
  const eventMap = new Map<string, DashboardCalendarEntry[]>();

  const availableRelatedOptions = useMemo(() => {
    if (!formState.relatedType) {
      return [];
    }
    return relatedOptions.filter((option) => option.type === formState.relatedType);
  }, [formState.relatedType, relatedOptions]);

  for (const event of monthEntries) {
    const dateKey = getDateKey(new Date(event.startAtIso));
    const existingEvents = eventMap.get(dateKey) ?? [];
    existingEvents.push(event);
    eventMap.set(dateKey, existingEvents);
  }

  async function handleCreateEvent(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormBusy(true);
    setError(null);
    setMessage(null);

    const selectedOption = relatedOptions.find(
      (option) => option.type === formState.relatedType && option.id === formState.relatedId
    );
    const relatedPayload = getRelatedPayload(selectedOption);

    const result = await postWithAuth("/api/calendar-events", {
      organizationId,
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      startAtIso: new Date(formState.startAt).toISOString(),
      endAtIso: formState.endAt ? new Date(formState.endAt).toISOString() : null,
      eventType: formState.eventType,
      status: "scheduled",
      assignedUserId: currentUserId,
      ...relatedPayload
    });

    if (!result.success) {
      setError(result.error);
      setFormBusy(false);
      return;
    }

    setFormState({
      title: "",
      description: "",
      startAt: formatLocalDateTimeValue(new Date()),
      endAt: "",
      eventType: "custom",
      relatedType: "",
      relatedId: ""
    });
    setFormBusy(false);
    setShowCreateForm(false);
    setMessage("Événement créé.");
    router.refresh();
  }

  async function handleDeleteEvent(entryId: string): Promise<void> {
    const eventId = entryId.replace(/^event:/, "");
    setBusyEntryId(entryId);
    setError(null);
    setMessage(null);

    const result = await deleteWithAuth(`/api/calendar-events/${eventId}`);
    if (!result.success) {
      setError(result.error);
      setBusyEntryId(null);
      return;
    }

    setBusyEntryId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_52%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0063fe]">Calendar</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#010a19]">Planning operationnel</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Vue mensuelle des échéances réelles: baux, paiements, maintenance, rappels de tâches et événements personnalisés.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMonth(startOfMonth(addDays(viewMonth, -1)))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Prec.
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(startOfMonth(new Date()))}
              className="rounded-full border border-[#0063fe]/20 bg-[#0063fe]/10 px-3 py-2 text-sm font-semibold text-[#0063fe] transition hover:bg-[#0063fe]/15"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm((currentValue) => !currentValue)}
              className="rounded-full bg-[#0063fe] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
            >
              {showCreateForm ? "Fermer" : "Nouvel événement"}
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(startOfMonth(addDays(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1), 0)))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Suiv.
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-xl font-semibold capitalize text-[#010a19]">{formatMonthLabel(viewMonth)}</h3>
            <p className="mt-1 text-sm text-slate-500">Grille sur 6 semaines · {formatRangeLabel(viewMonth)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:w-auto">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Événements</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{monthEntries.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rappels</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{monthEntries.filter((entry) => entry.source === "task").length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Scope</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{scopeLabel}</p>
            </div>
          </div>
        </div>
      </section>

      {showCreateForm ? (
        <form onSubmit={handleCreateEvent} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Titre</span>
              <input
                value={formState.title}
                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Type</span>
              <select
                value={formState.eventType}
                onChange={(event) => setFormState((current) => ({ ...current, eventType: event.target.value as CalendarFormState["eventType"] }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="custom">Custom</option>
                <option value="inspection">Inspection</option>
                <option value="reminder">Reminder</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-600 lg:col-span-2">
              <span className="font-medium text-slate-800">Description</span>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Début</span>
              <input
                type="datetime-local"
                value={formState.startAt}
                onChange={(event) => setFormState((current) => ({ ...current, startAt: event.target.value }))}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Fin</span>
              <input
                type="datetime-local"
                value={formState.endAt}
                onChange={(event) => setFormState((current) => ({ ...current, endAt: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Objet lié</span>
              <select
                value={formState.relatedType}
                onChange={(event) => setFormState((current) => ({ ...current, relatedType: event.target.value as CalendarFormState["relatedType"], relatedId: "" }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="">Aucun</option>
                <option value="property">Propriété</option>
                <option value="unit">Unité</option>
                <option value="lease">Bail</option>
                <option value="tenant">Locataire</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Sélection</span>
              <select
                value={formState.relatedId}
                onChange={(event) => setFormState((current) => ({ ...current, relatedId: event.target.value }))}
                disabled={!formState.relatedType}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 disabled:bg-slate-50"
              >
                <option value="">Aucun</option>
                {availableRelatedOptions.map((option) => (
                  <option key={`${option.type}:${option.id}`} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={formBusy || formState.title.trim().length === 0}
              className="rounded-full bg-[#0063fe] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formBusy ? "Création..." : "Créer l'événement"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dayEvents = eventMap.get(getDateKey(day)) ?? [];
              const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
              const isToday = isSameDay(day, today);

              return (
                <article
                  key={getDateKey(day)}
                  className="min-h-37 border-b border-r border-slate-200 p-3 last:border-r-0"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday ? "bg-[#0063fe] text-white" : isCurrentMonth ? "text-[#010a19]" : "text-slate-400"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 ? (
                      <span className="text-[11px] font-medium text-slate-400">{dayEvents.length} items</span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`rounded-2xl border px-2.5 py-2 ${EVENT_TONE_STYLES[getTone(event)]}`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{formatTimeLabel(event)}</p>
                        <p className="mt-1 text-sm font-semibold leading-tight">{event.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-90">{event.detail}</p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Focus du mois</p>
            <div className="mt-4 space-y-3">
              {monthEntries.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{formatTimeLabel(event)}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${EVENT_TONE_STYLES[getTone(event)]}`}>
                      {event.statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(event.startAtIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </p>
                  {event.relatedLabel ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{event.relatedLabel}</p> : null}
                  <p className="mt-2 text-sm text-slate-600">{event.detail}</p>
                  {event.source === "manual" ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteEvent(event.id)}
                      disabled={busyEntryId === event.id}
                      className="mt-3 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
              ))}
              {monthEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  Aucun événement sur ce mois.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Etape suivante</p>
            <h3 className="mt-3 text-lg font-semibold">Calendrier du scope {scopeLabel.toLowerCase()}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Les événements personnalisés cohabitent maintenant avec les échéances de bail, la collecte et les rappels issus des tâches.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}