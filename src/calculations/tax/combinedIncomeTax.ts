import type { CombinedTaxResult, UkTaxYearConfig } from './taxTypes';
import { CalculationInputError, moneySchema, parseOrThrow, signedMoneySchema } from '../validation';
import { calculateBandedNi, calculateIncomeTax } from './ukEmploymentTax';

export interface CombinedTaxInput {
  /** Gross employment salary. */
  grossSalary: number;
  /** Annual employee pension contribution (salary-sacrifice simplification). */
  employeePensionContribution?: number;
  /** Self-employed profit before tax. May be negative (a loss). */
  selfEmployedProfit: number;
  otherTaxableIncome?: number;
}

/**
 * Estimates tax for someone with both employment and self-employment income.
 *
 * The Personal Allowance and Income Tax bands are applied to COMBINED taxable
 * income; the extra tax created by the self-employment income is reported as
 * additionalIncomeTaxFromSelfEmployment (combined minus employment-only).
 * Class 1 NI applies to employment earnings only; Class 4 to profits only.
 *
 * Simplification: the Class 1 / Class 4 annual-maximum rule is not modelled,
 * so NI can be slightly overstated for very high combined earners.
 */
export function calculateCombinedTax(
  input: CombinedTaxInput,
  config: UkTaxYearConfig,
): CombinedTaxResult {
  const grossSalary = parseOrThrow(moneySchema, input.grossSalary, 'gross salary');
  const pension = parseOrThrow(
    moneySchema,
    input.employeePensionContribution ?? 0,
    'employee pension contribution',
  );
  const profit = parseOrThrow(signedMoneySchema, input.selfEmployedProfit, 'self-employed profit');
  const otherTaxableIncome = parseOrThrow(
    moneySchema,
    input.otherTaxableIncome ?? 0,
    'other taxable income',
  );

  if (pension > grossSalary) {
    throw new CalculationInputError('Employee pension contribution cannot exceed the gross salary');
  }

  const pensionablePay = grossSalary - pension;
  const taxableProfit = Math.max(0, profit);

  const combined = calculateIncomeTax(pensionablePay + taxableProfit + otherTaxableIncome, config);
  const employmentOnly = calculateIncomeTax(pensionablePay + otherTaxableIncome, config);

  const class1NationalInsurance = calculateBandedNi(pensionablePay, config.employeeClass1);
  const class4NationalInsurance = calculateBandedNi(taxableProfit, config.class4);
  const nationalInsurance = class1NationalInsurance + class4NationalInsurance;

  const totalTax = combined.incomeTax + nationalInsurance;
  const totalCashIncome = pensionablePay + profit + otherTaxableIncome;
  const totalTaxableIncome = pensionablePay + taxableProfit + otherTaxableIncome;

  return {
    incomeTax: combined.incomeTax,
    employmentOnlyIncomeTax: employmentOnly.incomeTax,
    additionalIncomeTaxFromSelfEmployment: combined.incomeTax - employmentOnly.incomeTax,
    class1NationalInsurance,
    class4NationalInsurance,
    nationalInsurance,
    totalTax,
    takeHome: totalCashIncome - totalTax,
    effectiveRate: totalTaxableIncome > 0 ? totalTax / totalTaxableIncome : 0,
  };
}
