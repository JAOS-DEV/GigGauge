import { describe, expect, it } from 'vitest';
import { calculateCombinedTax } from './combinedIncomeTax';
import { UK_2026_27_RUK } from './config/uk-2026-27-rUK';

const config = UK_2026_27_RUK;

describe('calculateCombinedTax — pinned 2026/27 vectors', () => {
  it('£30,000 employment + £15,000 profit → additional IT £3,000.00, Class 4 £145.80, Class 1 £1,394.40', () => {
    const result = calculateCombinedTax(
      { grossSalary: 30_000, selfEmployedProfit: 15_000 },
      config,
    );
    expect(result.additionalIncomeTaxFromSelfEmployment).toBeCloseTo(3_000, 2);
    expect(result.class4NationalInsurance).toBeCloseTo(145.8, 2);
    expect(result.class1NationalInsurance).toBeCloseTo(1_394.4, 2);
    expect(result.employmentOnlyIncomeTax).toBeCloseTo(3_486, 2);
    expect(result.incomeTax).toBeCloseTo(6_486, 2);
  });

  it('pushes self-employment income into higher bands based on combined income', () => {
    const result = calculateCombinedTax(
      { grossSalary: 45_000, selfEmployedProfit: 20_000 },
      config,
    );
    // Combined 65,000: taxable 52,430 → 37,700 @ 20% + 14,730 @ 40% = 13,432
    expect(result.incomeTax).toBeCloseTo(13_432, 2);
    // Employment-only: 32,430 @ 20% = 6,486 → additional = 6,946
    // (not the naive 20,000 × 20% = 4,000 you would get treating it in isolation)
    expect(result.additionalIncomeTaxFromSelfEmployment).toBeCloseTo(6_946, 2);
    expect(result.class1NationalInsurance).toBeCloseTo(2_594.4, 2);
    expect(result.class4NationalInsurance).toBeCloseTo(445.8, 2);
  });

  it('applies the Personal Allowance taper to combined income', () => {
    const result = calculateCombinedTax(
      { grossSalary: 90_000, selfEmployedProfit: 20_000 },
      config,
    );
    // Combined 110,000 → PA 7,570, taxable 102,430
    // 37,700 @ 20% + 64,730 @ 40% = 33,432
    expect(result.incomeTax).toBeCloseTo(33_432, 2);
  });

  it('lets a self-employment loss flow through to take-home without reducing tax', () => {
    const result = calculateCombinedTax(
      { grossSalary: 30_000, selfEmployedProfit: -4_000 },
      config,
    );
    // Loss relief is not modelled: IT as employment-only.
    expect(result.incomeTax).toBeCloseTo(3_486, 2);
    expect(result.class4NationalInsurance).toBe(0);
    // Take-home: 30,000 − 4,000 − 3,486 − 1,394.40 = 21,119.60
    expect(result.takeHome).toBeCloseTo(21_119.6, 2);
  });

  it('applies the salary-sacrifice pension simplification to the employment side', () => {
    const withPension = calculateCombinedTax(
      { grossSalary: 50_000, employeePensionContribution: 5_000, selfEmployedProfit: 10_000 },
      config,
    );
    const plain = calculateCombinedTax({ grossSalary: 45_000, selfEmployedProfit: 10_000 }, config);
    expect(withPension.totalTax).toBeCloseTo(plain.totalTax, 10);
  });
});
