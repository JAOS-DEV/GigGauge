import { describe, expect, it } from 'vitest';
import {
  calculateBandedNi,
  calculateEmploymentTax,
  calculateIncomeTax,
  calculatePersonalAllowance,
} from './ukEmploymentTax';
import { UK_2026_27_RUK } from './config/uk-2026-27-rUK';
import { CalculationInputError } from '../validation';

const config = UK_2026_27_RUK;

describe('calculatePersonalAllowance', () => {
  it('gives the full allowance below the taper threshold', () => {
    expect(calculatePersonalAllowance(50_000, config)).toBe(12_570);
    expect(calculatePersonalAllowance(100_000, config)).toBe(12_570);
  });

  it('tapers £1 for every £2 above £100,000', () => {
    expect(calculatePersonalAllowance(110_000, config)).toBe(7_570);
    expect(calculatePersonalAllowance(120_000, config)).toBe(2_570);
  });

  it('reaches zero at £125,140 and stays at zero above', () => {
    expect(calculatePersonalAllowance(125_140, config)).toBe(0);
    expect(calculatePersonalAllowance(200_000, config)).toBe(0);
  });
});

describe('calculateIncomeTax', () => {
  it('charges no tax at or below the Personal Allowance', () => {
    expect(calculateIncomeTax(12_570, config).incomeTax).toBe(0);
    expect(calculateIncomeTax(5_000, config).incomeTax).toBe(0);
  });

  it('charges basic rate up to the higher-rate threshold', () => {
    expect(calculateIncomeTax(50_270, config).incomeTax).toBeCloseTo(7_540, 6);
  });

  it('handles the additional rate above £125,140 with zero allowance', () => {
    // £130,000: PA = 0, taxable = 130,000
    // 37,700 @ 20% + 87,440 @ 40% + 4,860 @ 45% = 44,703
    expect(calculateIncomeTax(130_000, config).incomeTax).toBeCloseTo(44_703, 6);
  });
});

describe('calculateBandedNi', () => {
  it('charges nothing at or below the lower threshold', () => {
    expect(calculateBandedNi(12_570, config.employeeClass1)).toBe(0);
  });

  it('charges the main rate between thresholds and 2% above', () => {
    expect(calculateBandedNi(50_270, config.employeeClass1)).toBeCloseTo(3_016, 6);
    expect(calculateBandedNi(60_270, config.employeeClass1)).toBeCloseTo(3_216, 6);
  });
});

describe('calculateEmploymentTax — pinned 2026/27 vectors', () => {
  it('£50,000 gross → IT £7,486.00, NI £2,994.40, take-home £39,519.60', () => {
    const result = calculateEmploymentTax({ grossSalary: 50_000 }, config);
    expect(result.incomeTax).toBeCloseTo(7_486, 2);
    expect(result.nationalInsurance).toBeCloseTo(2_994.4, 2);
    expect(result.takeHome).toBeCloseTo(39_519.6, 2);
  });

  it('£60,000 gross → IT £11,432.00, NI £3,210.60, take-home £45,357.40', () => {
    const result = calculateEmploymentTax({ grossSalary: 60_000 }, config);
    expect(result.incomeTax).toBeCloseTo(11_432, 2);
    expect(result.nationalInsurance).toBeCloseTo(3_210.6, 2);
    expect(result.takeHome).toBeCloseTo(45_357.4, 2);
  });

  it('£110,000 gross → allowance £7,570, IT £33,432.00, NI £4,210.60 (taper)', () => {
    const result = calculateEmploymentTax({ grossSalary: 110_000 }, config);
    expect(result.personalAllowance).toBe(7_570);
    expect(result.incomeTax).toBeCloseTo(33_432, 2);
    expect(result.nationalInsurance).toBeCloseTo(4_210.6, 2);
  });

  it('£130,000 gross → allowance £0, IT £44,703.00', () => {
    const result = calculateEmploymentTax({ grossSalary: 130_000 }, config);
    expect(result.personalAllowance).toBe(0);
    expect(result.incomeTax).toBeCloseTo(44_703, 2);
  });

  it('treats employee pension as salary sacrifice: £50,000 with £5,000 pension is taxed as £45,000', () => {
    const withPension = calculateEmploymentTax(
      { grossSalary: 50_000, employeePensionContribution: 5_000 },
      config,
    );
    const plain = calculateEmploymentTax({ grossSalary: 45_000 }, config);
    expect(withPension.incomeTax).toBeCloseTo(plain.incomeTax, 10);
    expect(withPension.nationalInsurance).toBeCloseTo(plain.nationalInsurance, 10);
    expect(withPension.takeHome).toBeCloseTo(plain.takeHome, 10);
  });

  it('includes other taxable income when applying bands', () => {
    const result = calculateEmploymentTax(
      { grossSalary: 45_000, otherTaxableIncome: 10_000 },
      config,
    );
    // Total 55,000: taxable 42,430 → 37,700 @ 20% + 4,730 @ 40% = 9,432
    expect(result.incomeTax).toBeCloseTo(9_432, 2);
    // NI only on employment earnings: (45,000 − 12,570) × 8% = 2,594.40
    expect(result.nationalInsurance).toBeCloseTo(2_594.4, 2);
  });

  it('reports a zero effective rate for zero income', () => {
    const result = calculateEmploymentTax({ grossSalary: 0 }, config);
    expect(result.effectiveRate).toBe(0);
    expect(result.takeHome).toBe(0);
  });

  it('rejects a pension contribution larger than the salary', () => {
    expect(() =>
      calculateEmploymentTax({ grossSalary: 10_000, employeePensionContribution: 20_000 }, config),
    ).toThrow(CalculationInputError);
  });

  it('rejects negative or non-finite salaries', () => {
    expect(() => calculateEmploymentTax({ grossSalary: -1 }, config)).toThrow(
      CalculationInputError,
    );
    expect(() => calculateEmploymentTax({ grossSalary: Number.NaN }, config)).toThrow(
      CalculationInputError,
    );
  });
});
