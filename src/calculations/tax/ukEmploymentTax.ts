import type { EmploymentTaxResult, IncomeTaxResult, NiConfig, UkTaxYearConfig } from './taxTypes';
import { CalculationInputError, moneySchema, parseOrThrow } from '../validation';

/**
 * Personal Allowance after the high-income taper: reduced by £1 for every
 * £2 of adjusted net income above the taper threshold, floored at zero.
 */
export function calculatePersonalAllowance(
  adjustedNetIncome: number,
  config: UkTaxYearConfig,
): number {
  parseOrThrow(moneySchema, adjustedNetIncome, 'adjusted net income');
  if (adjustedNetIncome <= config.personalAllowanceTaperThreshold) {
    return config.personalAllowance;
  }
  const reduction =
    (adjustedNetIncome - config.personalAllowanceTaperThreshold) /
    config.personalAllowanceTaperDivisor;
  return Math.max(0, config.personalAllowance - reduction);
}

/**
 * Progressive Income Tax on a total income figure (before the Personal
 * Allowance). Applies the taper, then the configured bands to taxable income.
 */
export function calculateIncomeTax(totalIncome: number, config: UkTaxYearConfig): IncomeTaxResult {
  parseOrThrow(moneySchema, totalIncome, 'total income');

  const personalAllowance = calculatePersonalAllowance(totalIncome, config);
  const taxableIncome = Math.max(0, totalIncome - personalAllowance);

  let incomeTax = 0;
  let previousUpper = 0;
  for (const band of config.incomeTaxBands) {
    const bandUpper = band.upTo ?? taxableIncome;
    const slice = Math.min(taxableIncome, bandUpper) - previousUpper;
    if (slice > 0) {
      incomeTax += slice * band.rate;
    }
    if (band.upTo === null || taxableIncome <= band.upTo) {
      break;
    }
    previousUpper = band.upTo;
  }

  return { personalAllowance, taxableIncome, incomeTax };
}

/** Two-rate banded National Insurance on annual earnings or profits. */
export function calculateBandedNi(annualAmount: number, ni: NiConfig): number {
  parseOrThrow(moneySchema, annualAmount, 'annual amount for National Insurance');
  const mainBand = Math.max(0, Math.min(annualAmount, ni.upperAnnual) - ni.lowerAnnual);
  const upperBand = Math.max(0, annualAmount - ni.upperAnnual);
  return mainBand * ni.mainRate + upperBand * ni.upperRate;
}

export interface EmploymentTaxInput {
  grossSalary: number;
  /**
   * Annual employee pension contribution. Simplification: treated as salary
   * sacrifice, i.e. deducted from gross pay before BOTH Income Tax and NI.
   */
  employeePensionContribution?: number;
  otherTaxableIncome?: number;
}

/**
 * Estimates UK employment tax for the configured year and region.
 * Take-home = pensionable pay + other taxable income − Income Tax − NI.
 * Student loan repayments are not included.
 */
export function calculateEmploymentTax(
  input: EmploymentTaxInput,
  config: UkTaxYearConfig,
): EmploymentTaxResult {
  const grossSalary = parseOrThrow(moneySchema, input.grossSalary, 'gross salary');
  const pension = parseOrThrow(
    moneySchema,
    input.employeePensionContribution ?? 0,
    'employee pension contribution',
  );
  const otherTaxableIncome = parseOrThrow(
    moneySchema,
    input.otherTaxableIncome ?? 0,
    'other taxable income',
  );

  if (pension > grossSalary) {
    throw new CalculationInputError('Employee pension contribution cannot exceed the gross salary');
  }

  const pensionablePay = grossSalary - pension;
  const totalTaxableIncome = pensionablePay + otherTaxableIncome;

  const incomeTaxResult = calculateIncomeTax(totalTaxableIncome, config);
  const nationalInsurance = calculateBandedNi(pensionablePay, config.employeeClass1);
  const totalTax = incomeTaxResult.incomeTax + nationalInsurance;

  return {
    grossSalary,
    employeePensionContribution: pension,
    personalAllowance: incomeTaxResult.personalAllowance,
    incomeTax: incomeTaxResult.incomeTax,
    nationalInsurance,
    totalTax,
    takeHome: totalTaxableIncome - totalTax,
    effectiveRate: totalTaxableIncome > 0 ? totalTax / totalTaxableIncome : 0,
  };
}
