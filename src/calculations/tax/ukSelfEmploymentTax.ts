import type { SelfEmploymentTaxResult, UkTaxYearConfig } from './taxTypes';
import { moneySchema, parseOrThrow, signedMoneySchema } from '../validation';
import { calculateBandedNi, calculateIncomeTax } from './ukEmploymentTax';

export interface SelfEmploymentTaxInput {
  /** Business profit before tax. May be negative (a loss). */
  profit: number;
  otherTaxableIncome?: number;
}

/**
 * Estimates UK self-employment tax (Income Tax plus Class 4 NI) for the
 * configured year and region.
 *
 * - A loss produces zero tax; the loss itself flows through to netAfterTax.
 * - Class 2 NI is voluntary from 2026/27 and is excluded.
 * - Loss relief against other income is not modelled.
 */
export function calculateSelfEmploymentTax(
  input: SelfEmploymentTaxInput,
  config: UkTaxYearConfig,
): SelfEmploymentTaxResult {
  const profit = parseOrThrow(signedMoneySchema, input.profit, 'profit');
  const otherTaxableIncome = parseOrThrow(
    moneySchema,
    input.otherTaxableIncome ?? 0,
    'other taxable income',
  );

  const taxableProfit = Math.max(0, profit);
  const totalTaxableIncome = taxableProfit + otherTaxableIncome;

  const incomeTaxResult = calculateIncomeTax(totalTaxableIncome, config);
  const class4NationalInsurance = calculateBandedNi(taxableProfit, config.class4);
  const totalTax = incomeTaxResult.incomeTax + class4NationalInsurance;

  return {
    profit,
    personalAllowance: incomeTaxResult.personalAllowance,
    incomeTax: incomeTaxResult.incomeTax,
    class4NationalInsurance,
    totalTax,
    netAfterTax: profit + otherTaxableIncome - totalTax,
    effectiveRate: totalTaxableIncome > 0 ? totalTax / totalTaxableIncome : 0,
  };
}
