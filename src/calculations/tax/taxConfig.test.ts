import { describe, expect, it } from 'vitest';
import { getTaxConfig, SUPPORTED_TAX_YEARS, TAX_DISCLAIMER } from './taxConfig';
import { UK_2026_27_RUK } from './config/uk-2026-27-rUK';

describe('getTaxConfig', () => {
  it('returns the 2026/27 rest-of-UK config', () => {
    const result = getTaxConfig('2026/27', 'rUK');
    expect(result.supported).toBe(true);
    if (result.supported) {
      expect(result.config).toBe(UK_2026_27_RUK);
    }
  });

  it('explicitly refuses Scotland rather than silently applying rUK bands', () => {
    const result = getTaxConfig('2026/27', 'scotland');
    expect(result.supported).toBe(false);
    if (!result.supported) {
      expect(result.reason).toMatch(/Scottish Income Tax is not yet supported/);
    }
  });

  it('refuses unknown tax years', () => {
    const result = getTaxConfig('2019/20', 'rUK');
    expect(result.supported).toBe(false);
  });

  it('lists 2026/27 as a supported tax year', () => {
    expect(SUPPORTED_TAX_YEARS).toContain('2026/27');
  });

  it('exposes the planning disclaimer', () => {
    expect(TAX_DISCLAIMER).toMatch(/not tax or financial advice/);
  });
});

describe('UK 2026/27 rUK configuration values (GOV.UK, checked July 2026)', () => {
  it('pins the Personal Allowance and taper', () => {
    expect(UK_2026_27_RUK.personalAllowance).toBe(12_570);
    expect(UK_2026_27_RUK.personalAllowanceTaperThreshold).toBe(100_000);
    expect(UK_2026_27_RUK.personalAllowanceTaperDivisor).toBe(2);
  });

  it('pins the Income Tax bands (measured on taxable income)', () => {
    expect(UK_2026_27_RUK.incomeTaxBands).toEqual([
      { rate: 0.2, upTo: 37_700 },
      { rate: 0.4, upTo: 125_140 },
      { rate: 0.45, upTo: null },
    ]);
  });

  it('pins employee Class 1 NI thresholds and rates', () => {
    expect(UK_2026_27_RUK.employeeClass1).toEqual({
      lowerAnnual: 12_570,
      upperAnnual: 50_270,
      mainRate: 0.08,
      upperRate: 0.02,
    });
  });

  it('pins Class 4 NI thresholds and rates', () => {
    expect(UK_2026_27_RUK.class4).toEqual({
      lowerAnnual: 12_570,
      upperAnnual: 50_270,
      mainRate: 0.06,
      upperRate: 0.02,
    });
  });
});
