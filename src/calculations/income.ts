import type { ScenarioIncome, WorkArrangementType } from './types';
import { moneySchema, parseOrThrow } from './validation';

export interface BusinessProfitResult {
  /** Revenue minus deductible expenses. May be negative. */
  businessProfit: number;
  /** Positive magnitude of any loss; 0 when profitable. */
  businessLoss: number;
}

/**
 * Business profit before tax. A genuine loss is preserved as a negative
 * profit and surfaced via businessLoss — never clamped to zero.
 */
export function calculateBusinessProfit(
  grossRevenue: number,
  deductibleExpenses: number,
): BusinessProfitResult {
  parseOrThrow(moneySchema, grossRevenue, 'gross revenue');
  parseOrThrow(moneySchema, deductibleExpenses, 'deductible expenses');

  const businessProfit = grossRevenue - deductibleExpenses;
  return {
    businessProfit,
    businessLoss: businessProfit < 0 ? -businessProfit : 0,
  };
}

export interface IncomeSplit {
  /** Gross employment income: salary plus employment-side extras. */
  employmentGross: number;
  /** Self-employed/gig revenue including business-side extras. */
  revenue: number;
  /** True when the scenario provides no income figure at all. */
  incomeMissing: boolean;
}

/**
 * Splits scenario income between employment and self-employment based on the
 * arrangement type.
 *
 * Attribution of extras (documented simplification):
 * - employed: bonuses and tips belong to employment; otherIncome is ignored
 *   here (the schema describes it as other business income).
 * - selfEmployed/contractor/gigPlatform: bonuses, tips and otherIncome all
 *   belong to revenue.
 * - hybrid/custom: bonuses belong to employment; tips and otherIncome belong
 *   to the self-employed side.
 */
export function splitScenarioIncome(
  income: ScenarioIncome,
  arrangementType: WorkArrangementType,
): IncomeSplit {
  const salary = income.grossAnnualSalary;
  const revenueBase = income.grossRevenue;
  const bonuses = income.bonuses ?? 0;
  const tips = income.tips ?? 0;
  const other = income.otherIncome ?? 0;

  switch (arrangementType) {
    case 'employed':
      return {
        employmentGross: (salary ?? 0) + bonuses + tips,
        revenue: 0,
        incomeMissing: salary === undefined && income.actualAnnualTakeHome === undefined,
      };
    case 'selfEmployed':
    case 'contractor':
    case 'gigPlatform':
      return {
        employmentGross: 0,
        revenue: (revenueBase ?? 0) + bonuses + tips + other,
        incomeMissing: revenueBase === undefined && income.actualAnnualTakeHome === undefined,
      };
    case 'hybrid':
    case 'custom':
      return {
        employmentGross: (salary ?? 0) + bonuses,
        revenue: (revenueBase ?? 0) + tips + other,
        incomeMissing:
          salary === undefined &&
          revenueBase === undefined &&
          income.actualAnnualTakeHome === undefined,
      };
  }
}
