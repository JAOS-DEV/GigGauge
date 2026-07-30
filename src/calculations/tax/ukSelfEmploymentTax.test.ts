import { describe, expect, it } from 'vitest';
import { calculateSelfEmploymentTax } from './ukSelfEmploymentTax';
import { UK_2026_27_RUK } from './config/uk-2026-27-rUK';
import { CalculationInputError } from '../validation';

const config = UK_2026_27_RUK;

describe('calculateSelfEmploymentTax — pinned 2026/27 vectors', () => {
  it('£30,000 profit → IT £3,486.00, Class 4 £1,045.80, net £25,468.20', () => {
    const result = calculateSelfEmploymentTax({ profit: 30_000 }, config);
    expect(result.incomeTax).toBeCloseTo(3_486, 2);
    expect(result.class4NationalInsurance).toBeCloseTo(1_045.8, 2);
    expect(result.netAfterTax).toBeCloseTo(25_468.2, 2);
  });

  it('charges nothing at or below the Class 4 lower profits limit', () => {
    const result = calculateSelfEmploymentTax({ profit: 12_570 }, config);
    expect(result.incomeTax).toBe(0);
    expect(result.class4NationalInsurance).toBe(0);
    expect(result.netAfterTax).toBe(12_570);
  });

  it('applies the 2% Class 4 rate above the upper profits limit', () => {
    const result = calculateSelfEmploymentTax({ profit: 60_270 }, config);
    // Class 4: 37,700 × 6% + 10,000 × 2% = 2,262 + 200 = 2,462
    expect(result.class4NationalInsurance).toBeCloseTo(2_462, 2);
  });

  it('produces zero tax and preserves the loss for negative profit', () => {
    const result = calculateSelfEmploymentTax({ profit: -4_000 }, config);
    expect(result.incomeTax).toBe(0);
    expect(result.class4NationalInsurance).toBe(0);
    expect(result.totalTax).toBe(0);
    expect(result.netAfterTax).toBe(-4_000);
    expect(Number.isFinite(result.netAfterTax)).toBe(true);
  });

  it('applies bands to profit plus other taxable income, but Class 4 to profit only', () => {
    const result = calculateSelfEmploymentTax(
      { profit: 30_000, otherTaxableIncome: 30_000 },
      config,
    );
    // Total 60,000: taxable 47,430 → 37,700 @ 20% + 9,730 @ 40% = 11,432
    expect(result.incomeTax).toBeCloseTo(11_432, 2);
    // Class 4 unchanged: (30,000 − 12,570) × 6% = 1,045.80
    expect(result.class4NationalInsurance).toBeCloseTo(1_045.8, 2);
  });

  it('reports a zero effective rate for zero income', () => {
    const result = calculateSelfEmploymentTax({ profit: 0 }, config);
    expect(result.effectiveRate).toBe(0);
  });

  it('rejects non-finite profit', () => {
    expect(() => calculateSelfEmploymentTax({ profit: Number.NaN }, config)).toThrow(
      CalculationInputError,
    );
    expect(() => calculateSelfEmploymentTax({ profit: Number.POSITIVE_INFINITY }, config)).toThrow(
      CalculationInputError,
    );
  });
});
