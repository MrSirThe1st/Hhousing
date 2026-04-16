import type { MonthlyProrationInput, MonthlyProrationResult } from "./monthly-proration.types";

function getUtcDateParts(isoDate: string): { year: number; monthIndex: number; day: number } {
  const [yearText, monthText, dayText] = isoDate.split("-");
  return {
    year: Number(yearText),
    monthIndex: Number(monthText) - 1,
    day: Number(dayText)
  };
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function roundCurrencyAmount(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateMonthlyProration(input: MonthlyProrationInput): MonthlyProrationResult {
  const { year, monthIndex, day } = getUtcDateParts(input.startDate);
  const totalDayCount = getDaysInMonth(year, monthIndex);

  if (day <= 1) {
    return {
      isProrated: false,
      proratedAmount: 0,
      coveredDayCount: totalDayCount,
      totalDayCount,
      regularBillingStartDate: input.startDate,
      label: "Premier mois de loyer"
    };
  }

  const coveredDayCount = totalDayCount - day + 1;
  const proratedAmount = roundCurrencyAmount((coveredDayCount / totalDayCount) * input.monthlyRentAmount);
  const nextMonthYear = monthIndex === 11 ? year + 1 : year;
  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;

  return {
    isProrated: true,
    proratedAmount,
    coveredDayCount,
    totalDayCount,
    regularBillingStartDate: toIsoDate(nextMonthYear, nextMonthIndex, 1),
    label: "Loyer proratisé"
  };
}
