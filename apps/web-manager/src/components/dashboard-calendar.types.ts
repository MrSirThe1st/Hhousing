export type DashboardCalendarMetrics = {
  propertyCount: number;
  unitCount: number;
  tenantCount: number;
  leaseCount: number;
  maintenanceCount: number;
  occupiedUnitCount: number;
};

export type DashboardCalendarEventTone = "blue" | "amber" | "emerald" | "slate";

export type DashboardCalendarEvent = {
  id: string;
  title: string;
  detail: string;
  date: Date;
  timeLabel: string;
  tone: DashboardCalendarEventTone;
};

export type DashboardCalendarProps = {
  metrics: DashboardCalendarMetrics;
  scopeLabel: string;
};