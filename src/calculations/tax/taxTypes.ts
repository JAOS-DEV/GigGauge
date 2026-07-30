import type { TaxRegion } from '../types';

export type { TaxRegion };

/**
 * One progressive Income Tax band, measured on TAXABLE income (i.e. income
 * after the Personal Allowance has been deducted).
 */
export interface IncomeTaxBand {
  rate: number;
  /** Upper bound of the band on taxable income; null means unbounded. */
  upTo: number | null;
}

/** A two-rate National Insurance structure with annual thresholds. */
export interface NiConfig {
  /** Annual earnings/profits below this attract no NI. */
  lowerAnnual: number;
  /** Main rate applies between lower and upper; the upper rate applies above. */
  upperAnnual: number;
  mainRate: number;
  upperRate: number;
}

export interface UkTaxYearConfig {
  taxYear: string;
  region: TaxRegion;
  personalAllowance: number;
  /** Adjusted net income above which the Personal Allowance is tapered. */
  personalAllowanceTaperThreshold: number;
  /** Allowance is reduced by £1 for every £N above the threshold (N = 2). */
  personalAllowanceTaperDivisor: number;
  incomeTaxBands: IncomeTaxBand[];
  employeeClass1: NiConfig;
  class4: NiConfig;
}

export type TaxConfigResult =
  { supported: true; config: UkTaxYearConfig } | { supported: false; reason: string };

export interface IncomeTaxResult {
  /** The Personal Allowance after any taper. */
  personalAllowance: number;
  /** Income remaining after the Personal Allowance. */
  taxableIncome: number;
  incomeTax: number;
}

export interface EmploymentTaxResult {
  grossSalary: number;
  employeePensionContribution: number;
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  totalTax: number;
  /** Pensionable pay plus other taxable income, minus Income Tax and NI. */
  takeHome: number;
  /** Total tax as a fraction of total taxable income (0 when income is 0). */
  effectiveRate: number;
}

export interface SelfEmploymentTaxResult {
  profit: number;
  personalAllowance: number;
  incomeTax: number;
  class4NationalInsurance: number;
  totalTax: number;
  /** Profit plus other taxable income, minus all tax. May be negative for a loss. */
  netAfterTax: number;
  effectiveRate: number;
}

export interface CombinedTaxResult {
  incomeTax: number;
  /** Income Tax that would be due on employment income alone. */
  employmentOnlyIncomeTax: number;
  /** Extra Income Tax created by adding the self-employment income. */
  additionalIncomeTaxFromSelfEmployment: number;
  class1NationalInsurance: number;
  class4NationalInsurance: number;
  nationalInsurance: number;
  totalTax: number;
  takeHome: number;
  effectiveRate: number;
}
