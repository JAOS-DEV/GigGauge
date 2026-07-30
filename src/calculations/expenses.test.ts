import { describe, expect, it } from 'vitest';
import { annualiseExpense, summariseExpenses } from './expenses';
import { CalculationInputError } from './validation';
import type { WorkExpense, WorkPattern } from './types';

const pattern: WorkPattern = {
  workingWeeksPerYear: 39,
  workingDaysPerWeek: 6,
  workingHoursPerWeek: 50,
};

function makeExpense(overrides: Partial<WorkExpense>): WorkExpense {
  return {
    id: 'e1',
    name: 'Test expense',
    amount: 100,
    frequency: 'weekly',
    activeWorkingPeriodOnly: false,
    businessUsePercentage: 100,
    taxDeductible: true,
    category: 'other',
    ...overrides,
  };
}

describe('annualiseExpense', () => {
  it('weekly active-only expenses scale by working weeks', () => {
    const expense = makeExpense({ amount: 10, frequency: 'weekly', activeWorkingPeriodOnly: true });
    expect(annualiseExpense(expense, pattern)).toBeCloseTo(390, 10);
  });

  it('weekly full-year expenses scale by 52', () => {
    const expense = makeExpense({ amount: 10, frequency: 'weekly' });
    expect(annualiseExpense(expense, pattern)).toBeCloseTo(520, 10);
  });

  it('monthly full-year expenses scale by 12', () => {
    const expense = makeExpense({ amount: 100, frequency: 'monthly' });
    expect(annualiseExpense(expense, pattern)).toBeCloseTo(1_200, 10);
  });

  it('monthly active-only expenses are pro-rated by working weeks', () => {
    const expense = makeExpense({
      amount: 100,
      frequency: 'monthly',
      activeWorkingPeriodOnly: true,
    });
    expect(annualiseExpense(expense, pattern)).toBeCloseTo(1_200 * (39 / 52), 10);
  });

  it('annual full-year expenses pass through unchanged', () => {
    const expense = makeExpense({ amount: 300, frequency: 'annual' });
    expect(annualiseExpense(expense, pattern)).toBeCloseTo(300, 10);
  });

  it('annual active-only expenses are pro-rated by working weeks', () => {
    const expense = makeExpense({
      amount: 300,
      frequency: 'annual',
      activeWorkingPeriodOnly: true,
    });
    expect(annualiseExpense(expense, pattern)).toBeCloseTo(300 * (39 / 52), 10);
  });

  it('applies the business-use percentage', () => {
    const expense = makeExpense({ amount: 10, frequency: 'weekly', businessUsePercentage: 50 });
    expect(annualiseExpense(expense, pattern)).toBeCloseTo(260, 10);
  });

  it('rejects invalid amounts and percentages', () => {
    expect(() => annualiseExpense(makeExpense({ amount: -5 }), pattern)).toThrow(
      CalculationInputError,
    );
    expect(() => annualiseExpense(makeExpense({ businessUsePercentage: 150 }), pattern)).toThrow(
      CalculationInputError,
    );
    expect(() => annualiseExpense(makeExpense({ businessUsePercentage: -1 }), pattern)).toThrow(
      CalculationInputError,
    );
    expect(() => annualiseExpense(makeExpense({ amount: Number.NaN }), pattern)).toThrow(
      CalculationInputError,
    );
  });
});

describe('summariseExpenses', () => {
  it('splits deductible and non-deductible totals and builds a category breakdown', () => {
    const expenses: WorkExpense[] = [
      makeExpense({ id: 'a', amount: 10, frequency: 'weekly', activeWorkingPeriodOnly: true }),
      makeExpense({ id: 'b', amount: 300, frequency: 'annual', category: 'accounting' }),
      makeExpense({
        id: 'c',
        amount: 20,
        frequency: 'monthly',
        taxDeductible: false,
        category: 'personal',
      }),
    ];

    const summary = summariseExpenses(expenses, pattern);
    expect(summary.deductible).toBeCloseTo(390 + 300, 10);
    expect(summary.nonDeductible).toBeCloseTo(240, 10);
    expect(summary.totalCashCost).toBeCloseTo(930, 10);
    expect(summary.breakdown['other']).toBeCloseTo(390, 10);
    expect(summary.breakdown['accounting']).toBeCloseTo(300, 10);
    expect(summary.breakdown['personal']).toBeCloseTo(240, 10);
  });

  it('returns zero totals for an empty list', () => {
    const summary = summariseExpenses([], pattern);
    expect(summary.deductible).toBe(0);
    expect(summary.nonDeductible).toBe(0);
    expect(summary.totalCashCost).toBe(0);
    expect(summary.breakdown).toEqual({});
  });

  it('aggregates multiple expenses in the same category', () => {
    const expenses: WorkExpense[] = [
      makeExpense({ id: 'a', amount: 100, frequency: 'annual', category: 'vehicle' }),
      makeExpense({ id: 'b', amount: 50, frequency: 'annual', category: 'vehicle' }),
    ];
    const summary = summariseExpenses(expenses, pattern);
    expect(summary.breakdown['vehicle']).toBeCloseTo(150, 10);
  });
});
