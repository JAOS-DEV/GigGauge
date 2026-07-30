import { describe, expect, it } from 'vitest';
import { calculateBusinessProfit, splitScenarioIncome } from './income';
import { CalculationInputError } from './validation';

describe('calculateBusinessProfit', () => {
  it('subtracts deductible expenses from revenue', () => {
    const result = calculateBusinessProfit(50_000, 8_000);
    expect(result.businessProfit).toBe(42_000);
    expect(result.businessLoss).toBe(0);
  });

  it('preserves a genuine loss instead of clamping to zero', () => {
    const result = calculateBusinessProfit(1_000, 5_000);
    expect(result.businessProfit).toBe(-4_000);
    expect(result.businessLoss).toBe(4_000);
  });

  it('rejects negative revenue or expenses', () => {
    expect(() => calculateBusinessProfit(-1, 0)).toThrow(CalculationInputError);
    expect(() => calculateBusinessProfit(0, -1)).toThrow(CalculationInputError);
  });
});

describe('splitScenarioIncome', () => {
  it('attributes salary, bonuses and tips to employment for employed workers', () => {
    const split = splitScenarioIncome(
      { grossAnnualSalary: 40_000, bonuses: 2_000, tips: 500 },
      'employed',
    );
    expect(split.employmentGross).toBe(42_500);
    expect(split.revenue).toBe(0);
    expect(split.incomeMissing).toBe(false);
  });

  it('attributes revenue, bonuses, tips and other income to revenue for gig workers', () => {
    const split = splitScenarioIncome(
      { grossRevenue: 30_000, bonuses: 1_000, tips: 500, otherIncome: 200 },
      'gigPlatform',
    );
    expect(split.revenue).toBe(31_700);
    expect(split.employmentGross).toBe(0);
  });

  it('splits hybrid income between employment and self-employment', () => {
    const split = splitScenarioIncome(
      { grossAnnualSalary: 30_000, grossRevenue: 15_000, bonuses: 1_000, tips: 200 },
      'hybrid',
    );
    expect(split.employmentGross).toBe(31_000);
    expect(split.revenue).toBe(15_200);
  });

  it('flags missing income when no salary, revenue or actual take-home exists', () => {
    expect(splitScenarioIncome({}, 'employed').incomeMissing).toBe(true);
    expect(splitScenarioIncome({}, 'selfEmployed').incomeMissing).toBe(true);
    expect(splitScenarioIncome({ actualAnnualTakeHome: 30_000 }, 'employed').incomeMissing).toBe(
      false,
    );
  });
});
