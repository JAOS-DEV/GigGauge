import type { UkTaxYearConfig } from '../tax/taxTypes';
import { calculateEmploymentTax } from '../tax/ukEmploymentTax';
import { moneySchema, parseOrThrow } from '../validation';
import { solveMonotonicTarget, type SolverResult } from './solver';

export interface RequiredGrossSalaryInput {
  /** The annual personal take-home the user wants to reach. */
  targetAnnualTakeHome: number;
  /** Annual employee pension contribution (salary-sacrifice simplification). */
  employeePensionContribution?: number;
  otherTaxableIncome?: number;
  /** Annual work costs paid from take-home (e.g. commuting); reduce net cash. */
  annualWorkCosts?: number;
}

/**
 * Solves for the gross employment salary required to reach an annual
 * take-home target after Income Tax, employee NI, pension deduction and any
 * work costs. Uses a bounded binary search — never returns NaN or Infinity.
 */
export function solveRequiredGrossSalary(
  input: RequiredGrossSalaryInput,
  config: UkTaxYearConfig,
): SolverResult {
  const pension = parseOrThrow(
    moneySchema,
    input.employeePensionContribution ?? 0,
    'employee pension contribution',
  );
  const other = parseOrThrow(moneySchema, input.otherTaxableIncome ?? 0, 'other taxable income');
  const workCosts = parseOrThrow(moneySchema, input.annualWorkCosts ?? 0, 'annual work costs');

  const netCashAtGross = (grossSalary: number): number => {
    const tax = calculateEmploymentTax(
      {
        grossSalary,
        // Below the pension amount the whole salary is sacrificed.
        employeePensionContribution: Math.min(pension, grossSalary),
        otherTaxableIncome: other,
      },
      config,
    );
    return tax.takeHome - workCosts;
  };

  return solveMonotonicTarget(netCashAtGross, input.targetAnnualTakeHome);
}
