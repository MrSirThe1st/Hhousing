"use client";

import { useState } from "react";
import type {
  DashboardCalendarEvent,
  DashboardCalendarEventTone,
  DashboardCalendarMetrics,
  DashboardCalendarProps,
} from "./dashboard-calendar.types";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EVENT_TONE_STYLES: Record<DashboardCalendarEventTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
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

function buildEventDetail(metrics: DashboardCalendarMetrics, scopeLabel: string): string[] {
  return [
    metrics.propertyCount > 0 ? `${metrics.propertyCount} biens a revoir` : "Premier bien a planifier",
    metrics.leaseCount > 0 ? `${metrics.leaseCount} baux actifs` : "Structurer le cycle de baux",
    metrics.maintenanceCount > 0 ? `${metrics.maintenanceCount} demandes ouvertes` : "Aucune urgence maintenance",
    metrics.tenantCount > 0 ? `${metrics.tenantCount} locataires actifs` : "Base locataires a lancer",
    metrics.unitCount > 0
      ? `${metrics.occupiedUnitCount}/${metrics.unitCount} unites occupees`
      : "Aucune unite chargee",
    `Scope ${scopeLabel.toLowerCase()}`,
  ];
}

function buildCalendarEvents(viewMonth: Date, metrics: DashboardCalendarMetrics, scopeLabel: string): DashboardCalendarEvent[] {
  const details = buildEventDetail(metrics, scopeLabel);

  return [
    {
      id: "portfolio-review",
      title: "Revue portefeuille",
      detail: details[0],
      date: clampDay(viewMonth, 2),
      timeLabel: "08:30",
      tone: "blue",
    },
    {
      id: "lease-cycle",
      title: "Cycle des baux",
      detail: details[1],
      date: clampDay(viewMonth, 5),
      timeLabel: "10:00",
      tone: "slate",
    },
    {
      id: "maintenance-review",
      title: "Point maintenance",
      detail: details[2],
      date: clampDay(viewMonth, 9),
      timeLabel: "11:30",
      tone: "amber",
    },
    {
      id: "tenant-follow-up",
      title: "Suivi locataires",
      detail: details[3],
      date: clampDay(viewMonth, 14),
      timeLabel: "14:00",
      tone: "emerald",
    },
    {
      id: "occupancy-audit",
      title: "Audit occupation",
      detail: details[4],
      date: clampDay(viewMonth, 18),
      timeLabel: "16:00",
      tone: "blue",
    },
    {
      id: "team-rhythm",
      title: "Cadence equipe",
      detail: details[5],
      date: clampDay(viewMonth, 24),
      timeLabel: "09:00",
      tone: "slate",
    },
  ];
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

export default function DashboardCalendar({ metrics, scopeLabel }: DashboardCalendarProps): React.ReactElement {
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const today = new Date();
  const monthDays = getMonthDays(viewMonth);
  const events = buildCalendarEvents(viewMonth, metrics, scopeLabel);
  const eventMap = new Map<string, DashboardCalendarEvent[]>();

  for (const event of events) {
    const dateKey = getDateKey(event.date);
    const existingEvents = eventMap.get(dateKey) ?? [];
    existingEvents.push(event);
    eventMap.set(dateKey, existingEvents);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_52%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0063fe]">Calendar</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#010a19]">Planning operationnel</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Vue mensuelle inspiree d&apos;un agenda produit moderne, prete a recevoir plus tard les visites,
              echeances de bail, suivis maintenance et rappels de collecte.
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Biens</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{metrics.propertyCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Baux</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{metrics.leaseCount}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Maintenance</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{metrics.maintenanceCount}</p>
            </div>
          </div>
        </div>
      </section>

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
                        className={`rounded-2xl border px-2.5 py-2 ${EVENT_TONE_STYLES[event.tone]}`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{event.timeLabel}</p>
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
              {events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{event.timeLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {event.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{event.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Etape suivante</p>
            <h3 className="mt-3 text-lg font-semibold">Brancher les vraies echeances</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Cette base peut ensuite consommer les visites, signatures de bail, suivis maintenance et rappels de paiements.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}