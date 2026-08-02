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
      expect(results.projectedFromRequired).toBe(false);
    }
  });

  it('projects tax breakdown from required revenue when income is empty', () => {
    const scenario = createDefaultScenario();
    scenario.arrangementType = 'selfEmployed';
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 40_000 };
    scenario.work = {
      workingWeeksPerYear: 48,
      workingDaysPerWeek: 5,
      workingHoursPerWeek: 40,
      paidHolidayDays: 0,
      paidSickDays: 0,
    };
    scenario.expenses = [
      {
        id: '1',
        name: 'Car',
        amount: 250,
        frequency: 'weekly',
        activeWorkingPeriodOnly: true,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'vehicle',
      },
      {
        id: '2',
        name: 'Charging',
        amount: 70,
        frequency: 'weekly',
        activeWorkingPeriodOnly: true,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'vehicle',
      },
      {
        id: '3',
        name: 'Phone',
        amount: 240,
        frequency: 'annual',
        activeWorkingPeriodOnly: false,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'comms',
      },
      {
        id: '4',
        name: 'Accountant',
        amount: 300,
        frequency: 'annual',
        activeWorkingPeriodOnly: false,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'admin',
      },
      {
        id: '5',
        name: 'Licensing',
        amount: 100,
        frequency: 'annual',
        activeWorkingPeriodOnly: false,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'admin',
      },
      {
        id: '6',
        name: 'Other',
        amount: 300,
        frequency: 'annual',
        activeWorkingPeriodOnly: false,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'other',
      },
    ];

    const results = computePlanResults(scenario);
    expect(results.kind).toBe('ok');
    if (results.kind !== 'ok' || !results.required?.achievable) {
      throw new Error('expected achievable required revenue');
    }
    expect(results.projectedFromRequired).toBe(true);
    expect(results.required.annualAmount).toBeCloseTo(65_937.57, 0);
    expect(results.scenarioResult.annualRevenue).toBeCloseTo(results.required.annualAmount, 2);
    expect(results.scenarioResult.tax.incomeTax).toBeGreaterThan(0);
    expect(results.scenarioResult.tax.nationalInsurance).toBeGreaterThan(0);
    expect(results.scenarioResult.takeHome).toBeCloseTo(40_000, 0);
    expect(results.scenarioResult.goal.status).not.toBe('insufficientData');
  });

  it('does not project when the user has entered income', () => {
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 40_000 };
    scenario.income = { grossRevenue: 20_000 };
    const results = computePlanResults(scenario);
    expect(results.kind).toBe('ok');
    if (results.kind !== 'ok') return;
    expect(results.projectedFromRequired).toBe(false);
    expect(results.scenarioResult.annualRevenue).toBe(20_000);
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
