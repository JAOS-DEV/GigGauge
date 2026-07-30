import type { WorkExpense, WorkPattern } from './types';
import {
  CalculationInputError,
  parseOrThrow,
  workExpenseSchema,
  workPatternSchema,
} from './validation';
import { MONTHS_PER_YEAR, WEEKS_PER_CALENDAR_YEAR } from './periods';

export interface ExpenseSummary {
  /** Annual total of tax-deductible expenses (business-use share applied). */
  deductible: number;
  /** Annual total of non-deductible work costs (business-use share applied). */
  nonDeductible: number;
  /** Annual total cash cost: deductible + nonDeductible. */
  totalCashCost: number;
  /** Annual cost per expense category. */
  breakdown: Record<string, number>;
}

/**
 * Converts a single expense into its annual cost.
 *
 * - weekly, active-only:   amount × workingWeeks
 * - weekly, full-year:     amount × 52
 * - monthly, active-only:  amount × 12 × (workingWeeks ÷ 52)
 * - monthly, full-year:    amount × 12
 * - annual, active-only:   amount × (workingWeeks ÷ 52)
 * - annual, full-year:     amount × 1
 *
 * The result is multiplied by businessUsePercentage ÷ 100.
 */
export function annualiseExpense(expense: WorkExpense, pattern: WorkPattern): number {
  const parsed = parseOrThrow(workExpenseSchema, expense, `expense "${expense?.name ?? '?'}"`);
  const work = parseOrThrow(workPatternSchema, pattern, 'work pattern');

  const activeShare = work.workingWeeksPerYear / WEEKS_PER_CALENDAR_YEAR;
  let annualFullUse: number;

  switch (parsed.frequency) {
    case 'weekly':
      annualFullUse =
        parsed.amount *
        (parsed.activeWorkingPeriodOnly ? work.workingWeeksPerYear : WEEKS_PER_CALENDAR_YEAR);
      break;
    case 'monthly':
      annualFullUse =
        parsed.amount * MONTHS_PER_YEAR * (parsed.activeWorkingPeriodOnly ? activeShare : 1);
      break;
    case 'annual':
      annualFullUse = parsed.amount * (parsed.activeWorkingPeriodOnly ? activeShare : 1);
      break;
    default:
      throw new CalculationInputError(`Unknown expense frequency: ${String(parsed.frequency)}`);
  }

  return annualFullUse * (parsed.businessUsePercentage / 100);
}

/**
 * Annualises a list of expenses, splitting deductible from non-deductible
 * totals and producing a per-category breakdown.
 */
export function summariseExpenses(expenses: WorkExpense[], pattern: WorkPattern): ExpenseSummary {
  const summary: ExpenseSummary = {
    deductible: 0,
    nonDeductible: 0,
    totalCashCost: 0,
    breakdown: {},
  };

  for (const expense of expenses) {
    const annual = annualiseExpense(expense, pattern);
    if (expense.taxDeductible) {
      summary.deductible += annual;
    } else {
      summary.nonDeductible += annual;
    }
    summary.totalCashCost += annual;
    summary.breakdown[expense.category] = (summary.breakdown[expense.category] ?? 0) + annual;
  }

  return summary;
}
