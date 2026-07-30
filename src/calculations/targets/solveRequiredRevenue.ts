import type { UkTaxYearConfig } from '../tax/taxTypes';
import { calculateCombinedTax } from '../tax/combinedIncomeTax';
import { calculateSelfEmploymentTax } from '../tax/ukSelfEmploymentTax';
import { moneySchema, parseOrThrow } from '../validation';
import { solveMonotonicTarget, type SolverResult } from './solver';

export interface RequiredRevenueInput {
  /** The annual personal take-home the user wants to reach. */
  targetAnnualTakeHome: number;
  /** Annual tax-deductible business expenses (already annualised). */
  annualDeductibleExpenses: number;
  /** Annual non-deductible work costs paid from post-tax cash. */
  annualNonDeductibleExpenses?: number;
  otherTaxableIncome?: number;
  /** For hybrid workers: existing gross employment salary alongside the revenue. */
  existingEmploymentGross?: number;
  /** Annual employee pension contribution on the employment side. */
  employeePensionContribution?: number;
}

/**
 * Solves for the gross self-employed revenue required to reach an annual
 * take-home target after deductible expenses, Income Tax, Class 4 NI and
 * non-deductible work costs. When existing employment income is present the
 * combined-income calculation is used, so the extra revenue is taxed at the
 * user's true marginal position. Bounded binary search — never NaN/Infinity.
 */
export function solveRequiredRevenue(
  input: RequiredRevenueInput,
  config: UkTaxYearConfig,
): SolverResult {
  const deductible = parseOrThrow(
    moneySchema,
    input.annualDeductibleExpenses,
    'annual deductible expenses',
  );
  const nonDeductible = parseOrThrow(
    moneySchema,
    input.annualNonDeductibleExpenses ?? 0,
    'annual non-deductible expenses',
  );
  const other = parseOrThrow(moneySchema, input.otherTaxableIncome ?? 0, 'other taxable income');
  const employmentGross = parseOrThrow(
    moneySchema,
    input.existingEmploymentGross ?? 0,
    'existing employment gross',
  );
  const pension = parseOrThrow(
    moneySchema,
    input.employeePensionContribution ?? 0,
    'employee pension contribution',
  );

  const netCashAtRevenue = (revenue: number): number => {
    const profit = revenue - deductible;
    if (employmentGross > 0) {
      const combined = calculateCombinedTax(
        {
          grossSalary: employmentGross,
          employeePensionContribution: Math.min(pension, employmentGross),
          selfEmployedProfit: profit,
          otherTaxableIncome: other,
        },
        config,
      );
      return combined.takeHome - nonDeductible;
    }
    const tax = calculateSelfEmploymentTax({ profit, otherTaxableIncome: other }, config);
    return tax.netAfterTax - nonDeductible;
  };

  return solveMonotonicTarget(netCashAtRevenue, input.targetAnnualTakeHome);
}
