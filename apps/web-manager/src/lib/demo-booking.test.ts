import { describe, expect, it } from "vitest";
import {
  isValidDemoSlot,
  listDemoDays,
  listDemoSlotsForDate
} from "./demo-booking";

describe("demo-booking", () => {
  it("lists only weekdays within the booking window", () => {
    // Wednesday 2026-08-26 08:00 Kinshasa (+01) = 07:00 UTC
    const now = new Date("2026-08-26T07:00:00.000Z");
    const days = listDemoDays(now);
    expect(days.length).toBeGreaterThan(0);
    for (const day of days) {
      const noon = new Date(`${day.date}T12:00:00+01:00`);
      const weekday = noon.getUTCDay(); // noon+01 => 11:00 UTC, same calendar weekday
      expect(weekday).not.toBe(0);
      expect(weekday).not.toBe(6);
    }
  });

  it("exposes 30-minute slots from 09:00 to 16:30", () => {
    const now = new Date("2026-08-26T07:00:00.000Z");
    const slots = listDemoSlotsForDate("2026-08-26", now);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots[slots.length - 1]?.time).toBe("16:30");
    expect(slots.every((slot) => isValidDemoSlot(slot.startsAt, now))).toBe(true);
  });

  it("rejects weekend and out-of-range slots", () => {
    const now = new Date("2026-08-26T07:00:00.000Z");
    expect(isValidDemoSlot("2026-08-29T10:00:00+01:00", now)).toBe(false); // Saturday
    expect(isValidDemoSlot("2026-08-26T08:30:00+01:00", now)).toBe(false); // before hours
    expect(isValidDemoSlot("2026-08-26T17:00:00+01:00", now)).toBe(false); // ends at close
  });
});
