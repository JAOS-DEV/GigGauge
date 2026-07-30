import type { GoalPeriod, WorkPattern } from './types';
import {
  CalculationInputError,
  parseOrThrow,
  signedMoneySchema,
  workPatternSchema,
} from './validation';

export const WEEKS_PER_CALENDAR_YEAR = 52;
export const MONTHS_PER_YEAR = 12;

export interface PeriodBreakdown {
  annual: number;
  /** Annual amount divided over 12 calendar months (not working months). */
  calendarMonthly: number;
  /** Amount needed per working week. */
  workingWeekly: number;
  /** Amount needed per working day. */
  workingDaily: number;
  /** Amount needed per working hour. */
  workingHourly: number;
  weeksOff: number;
}

/**
 * Converts an amount expressed in the given period into its annual equivalent
 * using the scenario's work pattern. Weekly/daily/hourly amounts scale by
 * working periods, not calendar periods.
 */
export function annualiseAmount(amount: number, period: GoalPeriod, pattern: WorkPattern): number {
  parseOrThrow(signedMoneySchema, amount, 'amount');
  const work = parseOrThrow(workPatternSchema, pattern, 'work pattern');

  switch (period) {
    case 'annual':
      return amount;
    case 'monthly':
      return amount * MONTHS_PER_YEAR;
    case 'weekly':
      return amount * work.workingWeeksPerYear;
    case 'daily':
      return amount * work.workingWeeksPerYear * work.workingDaysPerWeek;
    case 'hourly':
      return amount * work.workingWeeksPerYear * work.workingHoursPerWeek;
    default:
      throw new CalculationInputError(`Unknown period: ${String(period)}`);
  }
}

/**
 * Breaks an annual amount down into calendar-monthly and working-period
 * equivalents. The work pattern is validated, so denominators are always
 * positive and no result can be NaN or Infinity.
 */
export function buildPeriodBreakdown(annual: number, pattern: WorkPattern): PeriodBreakdown {
  parseOrThrow(signedMoneySchema, annual, 'annual amount');
  const work = parseOrThrow(workPatternSchema, pattern, 'work pattern');

  return {
    annual,
    calendarMonthly: annual / MONTHS_PER_YEAR,
    workingWeekly: annual / work.workingWeeksPerYear,
    workingDaily: annual / (work.workingWeeksPerYear * work.workingDaysPerWeek),
    workingHourly: annual / (work.workingWeeksPerYear * work.workingHoursPerWeek),
    weeksOff: WEEKS_PER_CALENDAR_YEAR - work.workingWeeksPerYear,
  };
}
