import { describe, expect, it } from 'vitest';
import {
  computeQuickResults,
  createDefaultQuickFormValues,
  quickFormSchema,
  quickFormToScenario,
  type QuickEstimateFormValues,
} from './quickEstimateMapping';
import { createDefaultScenario } from './defaultScenario';
import { getQuickExample } from './examples';
import { computeScenarioResult } from '../calculations/scenarioResult';

function makeValues(overrides: Partial<QuickEstimateFormValues>): QuickEstimateFormValues {
  return { ...createDefaultQuickFormValues(), ...overrides };
}

const gigValues = makeValues({
  arrangementType: 'gigPlatform',
  targetAmount: '40000',
  targetPeriod: 'annual',
  workingWeeks: '39',
  workingDays: '6',
  workingHours: '50',
  mainCostAmount: '280',
  mainCostFrequency: 'weekly',
  mainCostActiveOnly: true,
  includeExampleCosts: true,
  exampleSet: 'neutral',
});

describe('quickFormSchema', () => {
  it('accepts valid values', () => {
    expect(quickFormSchema.safeParse(gigValues).success).toBe(true);
  });

  it('rejects out-of-range work patterns and blank targets', () => {
    expect(quickFormSchema.safeParse(makeValues({ targetAmount: '' })).success).toBe(false);
    expect(quickFormSchema.safeParse(makeValues({ targetAmount: '0' })).success).toBe(false);
    expect(
      quickFormSchema.safeParse(makeValues({ targetAmount: '40000', workingWeeks: '0' })).success,
    ).toBe(false);
    expect(
      quickFormSchema.safeParse(makeValues({ targetAmount: '40000', workingWeeks: '53' })).success,
    ).toBe(false);
    expect(
      quickFormSchema.safeParse(makeValues({ targetAmount: '40000', workingDays: '8' })).success,
    ).toBe(false);
    expect(
      quickFormSchema.safeParse(makeValues({ targetAmount: '40000', workingHours: '0' })).success,
    ).toBe(false);
    expect(
      quickFormSchema.safeParse(makeValues({ targetAmount: '40000', mainCostAmount: '-5' }))
        .success,
    ).toBe(false);
  });
});

describe('quickFormToScenario', () => {
  it('builds a self-employed scenario with main and example costs', () => {
    const scenario = quickFormToScenario(gigValues, createDefaultScenario());
    expect(scenario.arrangementType).toBe('gigPlatform');
    expect(scenario.goal).toMatchObject({ type: 'takeHome', period: 'annual', amount: 40_000 });
    expect(scenario.work.workingWeeksPerYear).toBe(39);
    const ids = scenario.expenses.map((expense) => expense.id);
    expect(ids).toContain('quick-main-cost');
    expect(ids).toContain('example-phone');
    expect(scenario.expenses.find((e) => e.id === 'quick-main-cost')?.taxDeductible).toBe(true);
  });

  it('excludes example costs when the toggle is off or the worker is employed', () => {
    const withoutExamples = quickFormToScenario(
      makeValues({ ...gigValues, includeExampleCosts: false }),
      createDefaultScenario(),
    );
    expect(withoutExamples.expenses.some((e) => e.id.startsWith('example-'))).toBe(false);

    const employed = quickFormToScenario(
      makeValues({ arrangementType: 'employed', targetAmount: '30000', mainCostAmount: '100' }),
      createDefaultScenario(),
    );
    expect(employed.expenses.some((e) => e.id.startsWith('example-'))).toBe(false);
    expect(employed.expenses.find((e) => e.id === 'quick-main-cost')?.taxDeductible).toBe(false);
  });

  it('maps expected income to take-home for employed and revenue otherwise, annualised', () => {
    const employed = quickFormToScenario(
      makeValues({
        arrangementType: 'employed',
        targetAmount: '30000',
        expectedIncomeAmount: '2500',
        expectedIncomePeriod: 'monthly',
      }),
      createDefaultScenario(),
    );
    expect(employed.income.actualAnnualTakeHome).toBe(30_000);
    expect(employed.income.grossRevenue).toBeUndefined();

    const gig = quickFormToScenario(
      makeValues({
        ...gigValues,
        expectedIncomeAmount: '1000',
        expectedIncomePeriod: 'weekly',
      }),
      createDefaultScenario(),
    );
    expect(gig.income.grossRevenue).toBe(39_000);
    expect(gig.income.actualAnnualTakeHome).toBeUndefined();
  });

  it('leaves blank optional fields out instead of storing zeroes', () => {
    const scenario = quickFormToScenario(
      makeValues({ ...gigValues, mainCostAmount: '', expectedIncomeAmount: '' }),
      createDefaultScenario(),
    );
    expect(scenario.expenses.some((e) => e.id === 'quick-main-cost')).toBe(false);
    expect(scenario.income).toEqual({});
  });

  it('preserves base-scenario fields the quick form does not cover', () => {
    const base = createDefaultScenario();
    base.work.paidHolidayDays = 28;
    const scenario = quickFormToScenario(gigValues, base);
    expect(scenario.work.paidHolidayDays).toBe(28);
  });
});

describe('computeQuickResults', () => {
  it('solves the AC-3 gig journey and round-trips within £1 of the target', () => {
    const results = computeQuickResults(gigValues, createDefaultScenario());
    expect(results.kind).toBe('ok');
    if (results.kind !== 'ok') return;

    expect(results.requiredKind).toBe('revenue');
    expect(results.breakdown.weeksOff).toBe(13);
    expect(results.exampleCostsAnnualTotal).toBeCloseTo(940, 2);
    // Costs: £280 × 39 weeks + £940 example costs.
    expect(results.totalAnnualCosts).toBeCloseTo(280 * 39 + 940, 2);

    // Round trip: earning exactly the required revenue must hit the target.
    const verification = computeScenarioResult({
      ...results.scenario,
      income: { grossRevenue: results.requiredAnnualAmount },
    });
    expect(Math.abs(verification.takeHome - 40_000)).toBeLessThan(1);
  });

  it('solves required gross salary for employed workers', () => {
    const results = computeQuickResults(
      makeValues({ arrangementType: 'employed', targetAmount: '30000' }),
      createDefaultScenario(),
    );
    expect(results.kind).toBe('ok');
    if (results.kind !== 'ok') return;
    expect(results.requiredKind).toBe('grossSalary');
    // £30,000 take-home needs more than £30,000 gross.
    expect(results.requiredAnnualAmount).toBeGreaterThan(30_000);
  });

  it('reports Scotland as unsupported without computing figures', () => {
    const results = computeQuickResults(
      makeValues({ ...gigValues, region: 'scotland' }),
      createDefaultScenario(),
    );
    expect(results.kind).toBe('regionUnsupported');
    if (results.kind === 'regionUnsupported') {
      expect(results.reason).toMatch(/Scottish Income Tax/);
    }
  });

  it('reports unachievable targets with an explanation', () => {
    const results = computeQuickResults(
      makeValues({ ...gigValues, targetAmount: '9000000' }),
      createDefaultScenario(),
    );
    expect(results.kind).toBe('unachievable');
  });

  it('includes a status only when expected income is provided', () => {
    const without = computeQuickResults(gigValues, createDefaultScenario());
    expect(without.kind === 'ok' && without.status === undefined).toBe(true);

    const withIncome = computeQuickResults(
      makeValues({ ...gigValues, expectedIncomeAmount: '30000', expectedIncomePeriod: 'annual' }),
      createDefaultScenario(),
    );
    expect(withIncome.kind).toBe('ok');
    if (withIncome.kind === 'ok') {
      expect(withIncome.status?.status).toBe('notAchieved');
      expect(withIncome.status?.differenceAnnual).toBeLessThan(0);
    }
  });
});

describe('examples', () => {
  it('the employed example evaluates as meeting its own target', () => {
    const example = getQuickExample('employedJob');
    const results = computeQuickResults(example.formValues, example.baseScenario);
    expect(results.kind).toBe('ok');
    if (results.kind === 'ok') {
      expect(results.requiredKind).toBe('grossSalary');
      expect(results.status?.status).toBe('narrowlyAchieved');
      expect(results.scenario.work.paidHolidayDays).toBe(28);
    }
  });

  it('the private-hire example includes vehicle, running and neutral example costs', () => {
    const example = getQuickExample('privateHire');
    const results = computeQuickResults(example.formValues, example.baseScenario);
    expect(results.kind).toBe('ok');
    if (results.kind === 'ok') {
      // £940 neutral + £40×39 charging + £10×39 cleaning.
      expect(results.exampleCostsAnnualTotal).toBeCloseTo(940 + 40 * 39 + 10 * 39, 2);
      const ids = results.scenario.expenses.map((e) => e.id);
      expect(ids).toContain('quick-main-cost');
      expect(ids).toContain('example-charging');
      expect(ids).toContain('example-cleaning');
    }
  });
});
