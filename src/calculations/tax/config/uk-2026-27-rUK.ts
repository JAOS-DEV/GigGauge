import type { UkTaxYearConfig } from '../taxTypes';

/**
 * UK tax year 2026/27 — England, Wales and Northern Ireland (rest-of-UK).
 *
 * Sources (checked July 2026):
 * - Income Tax: https://www.gov.uk/income-tax-rates
 * - National Insurance: https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions
 *
 * Notes:
 * - Income Tax bands are measured on TAXABLE income (after the Personal
 *   Allowance). The additional-rate threshold of £125,140 coincides with the
 *   point at which the tapered Personal Allowance reaches zero.
 * - Class 2 National Insurance is voluntary from this tax year and is
 *   deliberately excluded from all estimates.
 * - Scottish Income Tax uses different bands and is NOT supported; see
 *   getTaxConfig, which refuses to return this config for Scotland.
 */
export const UK_2026_27_RUK: UkTaxYearConfig = {
  taxYear: '2026/27',
  region: 'rUK',
  personalAllowance: 12_570,
  personalAllowanceTaperThreshold: 100_000,
  personalAllowanceTaperDivisor: 2,
  incomeTaxBands: [
    { rate: 0.2, upTo: 37_700 },
    { rate: 0.4, upTo: 125_140 },
    { rate: 0.45, upTo: null },
  ],
  employeeClass1: {
    lowerAnnual: 12_570,
    upperAnnual: 50_270,
    mainRate: 0.08,
    upperRate: 0.02,
  },
  class4: {
    lowerAnnual: 12_570,
    upperAnnual: 50_270,
    mainRate: 0.06,
    upperRate: 0.02,
  },
};
