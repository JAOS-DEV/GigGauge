import { describe, expect, it } from 'vitest';
import { createDefaultScenario } from './defaultScenario';
import { computePlanResults, shouldShowHomeDashboard } from './planResults';
import { annualiseExpense } from '../calculations/expenses';

describe('computePlanResults', () => {
  it('reports Scotland as unsupported', () => {
    const scenario = createDefaultScenario();
    scenario.tax.region = 'scotland';
    scenario.goal.amount = 30_000;
    scenario.income.grossRevenue = 50_000;
    const results = computePlanResults(scenario);
    expect(results.kind).toBe('regionUnsupported');
  });

  it('returns a required revenue solve and scenario result for a take-home goal', () => {
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 50_000 };
    scenario.expenses = [
      {
        id: 'rent',
        name: 'Vehicle rental',
        amount: 280,
        frequency: 'weekly',
        activeWorkingPeriodOnly: true,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'vehicle',
      },
      {
        id: 'ins',
        name: 'Insurance',
        amount: 500,
        frequency: 'annual',
        activeWorkingPeriodOnly: false,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'insurance',
      },
    ];

    const activeOnly = annualiseExpense(scenario.expenses[0]!, scenario.work);
    const fullYear = annualiseExpense(scenario.expenses[1]!, scenario.work);
    expect(activeOnly).toBeCloseTo(280 * 48, 6);
    expect(fullYear).toBe(500);

    const results = computePlanResults(scenario);
    expect(results.kind).toBe('ok');
    if (results.kind !== 'ok') return;
    expect(results.scenarioResult.takeHome).toBeGreaterThan(0);
    expect(results.required?.achievable).toBe(true);
    if (results.required?.achievable) {
      expect(results.required.kind).toBe('revenue');
      expect(results.required.annualAmount).toBeGreaterThan(30_000);
    }
  });

  it('solves gross salary for employed take-home goals', () => {
    const scenario = createDefaultScenario();
    scenario.arrangementType = 'employed';
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossAnnualSalary: 40_000 };
    const results = computePlanResults(scenario);
    expect(results.kind).toBe('ok');
    if (results.kind === 'ok' && results.required?.achievable) {
      expect(results.required.kind).toBe('grossSalary');
    }
  });
});

describe('shouldShowHomeDashboard', () => {
  it('is false for a fresh default draft', () => {
    const results = computePlanResults(createDefaultScenario());
    expect(shouldShowHomeDashboard(results)).toBe(false);
  });

  it('is true when a required solve exists without income', () => {
    const scenario = createDefaultScenario();
    scenario.goal.amount = 30_000;
    expect(shouldShowHomeDashboard(computePlanResults(scenario))).toBe(true);
  });

  it('is true when goal status is assessable', () => {
    const scenario = createDefaultScenario();
    scenario.goal.amount = 30_000;
    scenario.income.grossRevenue = 50_000;
    expect(shouldShowHomeDashboard(computePlanResults(scenario))).toBe(true);
  });

  it('is true for Scotland unsupported results', () => {
    const scenario = createDefaultScenario();
    scenario.tax.region = 'scotland';
    expect(shouldShowHomeDashboard(computePlanResults(scenario))).toBe(true);
  });
});
