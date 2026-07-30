import type { TaxConfigResult, TaxRegion } from './taxTypes';
import { UK_2026_27_RUK } from './config/uk-2026-27-rUK';

export const TAX_DISCLAIMER =
  'This is an estimate for planning purposes and is not tax or financial advice. ' +
  'Your tax position depends on your personal circumstances. Check current HMRC ' +
  'guidance or speak to a qualified accountant.';

export const SUPPORTED_TAX_YEARS = ['2026/27'] as const;

/**
 * Returns the tax configuration for a year and region, or an explicit
 * unsupported result. Scottish Income Tax has different bands and is not yet
 * implemented — rest-of-UK bands are never silently applied to Scotland.
 */
export function getTaxConfig(taxYear: string, region: TaxRegion): TaxConfigResult {
  if (region === 'scotland') {
    return {
      supported: false,
      reason:
        'Scottish Income Tax is not yet supported. Scotland uses different Income Tax bands, so applying rest-of-UK rates would be misleading.',
    };
  }
  if (taxYear === '2026/27') {
    return { supported: true, config: UK_2026_27_RUK };
  }
  return {
    supported: false,
    reason: `Tax year ${taxYear} is not supported. Supported tax years: ${SUPPORTED_TAX_YEARS.join(', ')}.`,
  };
}
