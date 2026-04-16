export interface MonthlyProrationInput {
  startDate: string;
  monthlyRentAmount: number;
}

export interface MonthlyProrationResult {
  isProrated: boolean;
  proratedAmount: number;
  coveredDayCount: number;
  totalDayCount: number;
  regularBillingStartDate: string;
  label: string;
}
