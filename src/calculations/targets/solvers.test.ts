import { describe, expect, it } from 'vitest';
import { solveMonotonicTarget, SOLVER_MAX_ITERATIONS } from './solver';
import { solveRequiredGrossSalary } from './solveRequiredGross';
import { solveRequiredRevenue } from './solveRequiredRevenue';
import { calculateEmploymentTax } from '../tax/ukEmploymentTax';
import { calculateSelfEmploymentTax } from '../tax/ukSelfEmploymentTax';
import { UK_2026_27_RUK } from '../tax/config/uk-2026-27-rUK';
import { CalculationInputError } from '../validation';

const config = UK_2026_27_RUK;

describe('solveMonotonicTarget', () => {
  it('returns zero when the target is already met at zero input', () => {
    const result = solveMonotonicTarget((x) => x + 10, 5);
    expect(result).toEqual({ achievable: true, requiredAmount: 0, converged: true, iterations: 0 });
  });

  it('respects the iteration cap', () => {
    const result = solveMonotonicTarget((x) => x, 50_000);
    expect(result.achievable).toBe(true);
    if (result.achievable) {
      expect(result.iterations).toBeLessThanOrEqual(SOLVER_MAX_ITERATIONS);
      expect(result.converged).toBe(true);
    }
  });

  it('reports unreachable targets instead of returning an unbounded value', () => {
    const result = solveMonotonicTarget((x) => Math.min(x, 1_000), 2_000);
    expect(result.achievable).toBe(false);
  });

  it('rejects non-finite targets', () => {
    expect(() => solveMonotonicTarget((x) => x, Number.NaN)).toThrow(CalculationInputError);
    expect(() => solveMonotonicTarget((x) => x, Number.POSITIVE_INFINITY)).toThrow(
      CalculationInputError,
    );
  });
});

describe('solveRequiredGrossSalary', () => {
  it('round-trips: the gross that produces a take-home solves back within £0.01', () => {
    const takeHome = calculateEmploymentTax({ grossSalary: 50_000 }, config).takeHome;
    const result = solveRequiredGrossSalary({ targetAnnualTakeHome: takeHome }, config);
    expect(result.achievable).toBe(true);
    if (result.achievable) {
      expect(Math.abs(result.requiredAmount - 50_000)).toBeLessThan(0.01);
      expect(result.converged).toBe(true);
      expect(Number.isFinite(result.requiredAmount)).toBe(true);
    }
  });

  it('round-trips across bands and the Personal Allowance taper', () => {
    for (const gross of [20_000, 60_000, 110_000, 140_000]) {
      const takeHome = calculateEmploymentTax({ grossSalary: gross }, config).takeHome;
      const result = solveRequiredGrossSalary({ targetAnnualTakeHome: takeHome }, config);
      expect(result.achievable).toBe(true);
      if (result.achievable) {
        expect(Math.abs(result.requiredAmount - gross)).toBeLessThan(0.01);
      }
    }
  });

  it('accounts for pension contributions and work costs', () => {
    const target = 30_000;
    const result = solveRequiredGrossSalary(
      { targetAnnualTakeHome: target, employeePensionContribution: 3_000, annualWorkCosts: 1_200 },
      config,
    );
    expect(result.achievable).toBe(true);
    if (result.achievable) {
      const check = calculateEmploymentTax(
        { grossSalary: result.requiredAmount, employeePensionContribution: 3_000 },
        config,
      );
      expect(check.takeHome - 1_200).toBeCloseTo(target, 1);
    }
  });

  it('reports targets above the cap as unachievable — never Infinity', () => {
    const result = solveRequiredGrossSalary({ targetAnnualTakeHome: 9_000_000 }, config);
    expect(result.achievable).toBe(false);
  });

  it('rejects negative optional inputs', () => {
    expect(() =>
      solveRequiredGrossSalary({ targetAnnualTakeHome: 30_000, annualWorkCosts: -100 }, config),
    ).toThrow(CalculationInputError);
    expect(() =>
      solveRequiredGrossSalary(
        { targetAnnualTakeHome: 30_000, employeePensionContribution: -1 },
        config,
      ),
    ).toThrow(CalculationInputError);
  });
});

describe('solveRequiredRevenue', () => {
  it('round-trips: revenue producing a net figure solves back within £0.01', () => {
    const deductible = 10_000;
    const nonDeductible = 1_000;
    const net =
      calculateSelfEmploymentTax({ profit: 60_000 - deductible }, config).netAfterTax -
      nonDeductible;
    const result = solveRequiredRevenue(
      {
        targetAnnualTakeHome: net,
        annualDeductibleExpenses: deductible,
        annualNonDeductibleExpenses: nonDeductible,
      },
      config,
    );
    expect(result.achievable).toBe(true);
    if (result.achievable) {
      expect(Math.abs(result.requiredAmount - 60_000)).toBeLessThan(0.01);
    }
  });

  it('needs revenue equal to expenses to break even at a zero target', () => {
    const result = solveRequiredRevenue(
      { targetAnnualTakeHome: 0, annualDeductibleExpenses: 5_000 },
      config,
    );
    expect(result.achievable).toBe(true);
    if (result.achievable) {
      expect(result.requiredAmount).toBeCloseTo(5_000, 1);
    }
  });

  it('uses combined-income tax when the user also has employment income', () => {
    // With a £45,000 salary, extra profit is taxed at the higher marginal
    // position, so more revenue is required than for a sole trader.
    const soleTrader = solveRequiredRevenue(
      { targetAnnualTakeHome: 10_000, annualDeductibleExpenses: 0 },
      config,
    );
    const hybrid = solveRequiredRevenue(
      {
        targetAnnualTakeHome:
          10_000 + calculateEmploymentTax({ grossSalary: 45_000 }, config).takeHome,
        annualDeductibleExpenses: 0,
        existingEmploymentGross: 45_000,
      },
      config,
    );
    expect(soleTrader.achievable).toBe(true);
    expect(hybrid.achievable).toBe(true);
    if (soleTrader.achievable && hybrid.achievable) {
      expect(hybrid.requiredAmount).toBeGreaterThan(soleTrader.requiredAmount);
    }
  });

  it('reports impossible targets as unachievable', () => {
    const result = solveRequiredRevenue(
      { targetAnnualTakeHome: 9_500_000, annualDeductibleExpenses: 0 },
      config,
    );
    expect(result.achievable).toBe(false);
  });

  it('rejects negative expense inputs', () => {
    expect(() =>
      solveRequiredRevenue(
        { targetAnnualTakeHome: 30_000, annualDeductibleExpenses: -5_000 },
        config,
      ),
    ).toThrow(CalculationInputError);
    expect(() =>
      solveRequiredRevenue(
        {
          targetAnnualTakeHome: 30_000,
          annualDeductibleExpenses: 0,
          annualNonDeductibleExpenses: -1,
        },
        config,
      ),
    ).toThrow(CalculationInputError);
  });
});
