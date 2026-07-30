import { describe, expect, it } from 'vitest';
import { computeScenarioResult, NARROW_ACHIEVEMENT_MARGIN } from './scenarioResult';
import { CalculationInputError } from './validation';
import type { GigGaugeScenario } from './types';

function makeScenario(overrides: Partial<GigGaugeScenario> = {}): GigGaugeScenario {
  return {
    schemaVersion: 1,
    id: 's1',
    name: 'Test scenario',
    arrangementType: 'selfEmployed',
    goal: { type: 'takeHome', period: 'annual', amount: 30_000 },
    work: {
      workingWeeksPerYear: 52,
      workingDaysPerWeek: 5,
      workingHoursPerWeek: 40,
      paidHolidayDays: 0,
      paidSickDays: 0,
    },
    income: { grossRevenue: 50_000 },
    expenses: [],
    tax: {
      country: 'UK',
      region: 'rUK',
      taxYear: '2026/27',
      otherTaxableIncome: 0,
      studentLoanEnabled: false,
    },
    employmentBenefits: { employerPensionValue: 0, otherBenefitsValue: 0, annualCommutingCost: 0 },
    personal: {
      annualRetirementSaving: 0,
      emergencyFundTarget: 0,
      currentEmergencySavings: 0,
      travelFundTarget: 0,
      currentTravelSavings: 0,
    },
    ...overrides,
  };
}

describe('computeScenarioResult — self-employed', () => {
  it('computes profit, tax and take-home for a sole trader', () => {
    const result = computeScenarioResult(makeScenario());
    expect(result.annualRevenue).toBe(50_000);
    expect(result.profitBeforeTax).toBe(50_000);
    expect(result.tax.incomeTax).toBeCloseTo(7_486, 2);
    expect(result.tax.nationalInsurance).toBeCloseTo(2_245.8, 2);
    expect(result.takeHome).toBeCloseTo(40_268.2, 2);
    expect(result.goal.status).toBe('comfortablyAchieved');
    expect(result.goal.achieved).toBe(true);
  });

  it('reduces taxable profit with deductible expenses but cash with all expenses', () => {
    const result = computeScenarioResult(
      makeScenario({
        expenses: [
          {
            id: 'a',
            name: 'Accountant',
            amount: 1_000,
            frequency: 'annual',
            activeWorkingPeriodOnly: false,
            businessUsePercentage: 100,
            taxDeductible: true,
            category: 'accounting',
          },
          {
            id: 'b',
            name: 'Personal work cost',
            amount: 500,
            frequency: 'annual',
            activeWorkingPeriodOnly: false,
            businessUsePercentage: 100,
            taxDeductible: false,
            category: 'personal',
          },
        ],
      }),
    );
    expect(result.profitBeforeTax).toBe(49_000);
    expect(result.expenses.deductible).toBe(1_000);
    expect(result.expenses.nonDeductible).toBe(500);
    expect(result.expenses.totalCashCost).toBe(1_500);
    // Take-home: net after tax on 49,000 profit, minus the 500 non-deductible.
    // IT = (49,000 − 12,570) × 20% = 7,286; C4 = 36,430 × 6% = 2,185.80
    expect(result.takeHome).toBeCloseTo(49_000 - 7_286 - 2_185.8 - 500, 2);
  });

  it('surfaces a business loss instead of hiding it', () => {
    const result = computeScenarioResult(
      makeScenario({
        income: { grossRevenue: 1_000 },
        expenses: [
          {
            id: 'a',
            name: 'Van rental',
            amount: 5_000,
            frequency: 'annual',
            activeWorkingPeriodOnly: false,
            businessUsePercentage: 100,
            taxDeductible: true,
            category: 'vehicle',
          },
        ],
      }),
    );
    expect(result.profitBeforeTax).toBe(-4_000);
    expect(result.businessLoss).toBe(4_000);
    expect(result.tax.total).toBe(0);
    expect(result.takeHome).toBe(-4_000);
    expect(result.notes).toContain('businessLoss');
    expect(result.goal.status).toBe('notAchieved');
  });
});

describe('computeScenarioResult — employed', () => {
  it('estimates tax from gross salary and treats all expenses as cash costs', () => {
    const result = computeScenarioResult(
      makeScenario({
        arrangementType: 'employed',
        income: { grossAnnualSalary: 50_000 },
        expenses: [
          {
            id: 'c',
            name: 'Commuting',
            amount: 1_000,
            frequency: 'annual',
            activeWorkingPeriodOnly: false,
            businessUsePercentage: 100,
            taxDeductible: true,
            category: 'travel',
          },
        ],
      }),
    );
    expect(result.annualGrossIncome).toBe(50_000);
    expect(result.profitBeforeTax).toBe(50_000);
    expect(result.tax.incomeTax).toBeCloseTo(7_486, 2);
    expect(result.tax.nationalInsurance).toBeCloseTo(2_994.4, 2);
    // Employees get no tax relief on work costs; the 1,000 reduces cash only.
    expect(result.takeHome).toBeCloseTo(39_519.6 - 1_000, 2);
  });

  it('uses actual payslip take-home directly when provided', () => {
    const result = computeScenarioResult(
      makeScenario({
        arrangementType: 'employed',
        income: { actualAnnualTakeHome: 40_000 },
      }),
    );
    expect(result.takeHome).toBe(40_000);
    expect(result.tax.total).toBe(0);
    expect(result.notes).toContain('takeHomeProvidedDirectly');
  });
});

describe('computeScenarioResult — hybrid', () => {
  it('applies combined-income tax to salary plus side revenue', () => {
    const result = computeScenarioResult(
      makeScenario({
        arrangementType: 'hybrid',
        income: { grossAnnualSalary: 30_000, grossRevenue: 15_000 },
      }),
    );
    // Combined IT 6,486 + Class 1 1,394.40 + Class 4 145.80 = 8,026.20
    expect(result.tax.total).toBeCloseTo(8_026.2, 2);
    expect(result.takeHome).toBeCloseTo(45_000 - 8_026.2, 2);
    expect(result.annualGrossIncome).toBe(30_000);
    expect(result.annualRevenue).toBe(15_000);
  });
});

describe('computeScenarioResult — goal status', () => {
  it('is narrowly achieved when the surplus is below the margin', () => {
    const result = computeScenarioResult(
      makeScenario({
        arrangementType: 'employed',
        income: { actualAnnualTakeHome: 40_000 },
        goal: { type: 'takeHome', period: 'annual', amount: 40_000 },
      }),
    );
    expect(result.goal.difference).toBe(0);
    expect(result.goal.status).toBe('narrowlyAchieved');
  });

  it('is comfortably achieved at or above the margin', () => {
    const result = computeScenarioResult(
      makeScenario({
        arrangementType: 'employed',
        income: { actualAnnualTakeHome: 42_000 },
        goal: { type: 'takeHome', period: 'annual', amount: 40_000 },
      }),
    );
    // Surplus of exactly 5% counts as comfortable.
    expect(result.goal.difference).toBeCloseTo(40_000 * NARROW_ACHIEVEMENT_MARGIN, 10);
    expect(result.goal.status).toBe('comfortablyAchieved');
  });

  it('is not achieved when below target, with the shortfall reported', () => {
    const result = computeScenarioResult(
      makeScenario({
        arrangementType: 'employed',
        income: { actualAnnualTakeHome: 36_800 },
        goal: { type: 'takeHome', period: 'annual', amount: 40_000 },
      }),
    );
    expect(result.goal.status).toBe('notAchieved');
    expect(result.goal.difference).toBeCloseTo(-3_200, 10);
    expect(result.goal.achieved).toBe(false);
  });

  it('annualises non-annual goal periods using the work pattern', () => {
    const result = computeScenarioResult(
      makeScenario({
        goal: { type: 'takeHome', period: 'weekly', amount: 500 },
        work: {
          workingWeeksPerYear: 40,
          workingDaysPerWeek: 5,
          workingHoursPerWeek: 40,
          paidHolidayDays: 0,
          paidSickDays: 0,
        },
      }),
    );
    expect(result.goal.amount).toBe(20_000);
    expect(result.periodTargets.weekly).toBe(500);
    expect(result.periodTargets.monthly).toBeCloseTo(20_000 / 12, 10);
  });
});

describe('computeScenarioResult — insufficient data', () => {
  it('reports insufficientData when no income is provided', () => {
    const result = computeScenarioResult(makeScenario({ income: {} }));
    expect(result.goal.status).toBe('insufficientData');
    expect(result.goal.achieved).toBe(false);
  });

  it('reports insufficientData when the goal amount is zero', () => {
    const result = computeScenarioResult(
      makeScenario({ goal: { type: 'takeHome', period: 'annual', amount: 0 } }),
    );
    expect(result.goal.status).toBe('insufficientData');
  });

  it('reports insufficientData for Scotland rather than applying rUK bands', () => {
    const result = computeScenarioResult(
      makeScenario({
        tax: {
          country: 'UK',
          region: 'scotland',
          taxYear: '2026/27',
          otherTaxableIncome: 0,
          studentLoanEnabled: false,
        },
      }),
    );
    expect(result.goal.status).toBe('insufficientData');
    expect(result.tax.total).toBe(0);
    expect(result.notes).toContain('taxRegionUnsupported');
  });

  it('reports unsupported goal types as insufficientData with a note', () => {
    const result = computeScenarioResult(
      makeScenario({
        goal: { type: 'matchScenario', period: 'annual', amount: 30_000 },
      }),
    );
    expect(result.goal.status).toBe('insufficientData');
    expect(result.notes).toContain('goalTypeNotYetSupported');
  });
});

describe('computeScenarioResult — notes and extras', () => {
  it('notes that student loans are not included when the flag is enabled', () => {
    const result = computeScenarioResult(
      makeScenario({
        tax: {
          country: 'UK',
          region: 'rUK',
          taxYear: '2026/27',
          otherTaxableIncome: 0,
          studentLoanEnabled: true,
        },
      }),
    );
    expect(result.notes).toContain('studentLoansNotIncluded');
  });

  it('subtracts retirement saving as a post-tax allocation', () => {
    const result = computeScenarioResult(
      makeScenario({
        personal: {
          annualRetirementSaving: 3_000,
          emergencyFundTarget: 0,
          currentEmergencySavings: 0,
          travelFundTarget: 0,
          currentTravelSavings: 0,
        },
      }),
    );
    expect(result.takeHomeAfterRetirementSaving).toBeCloseTo(result.takeHome - 3_000, 10);
  });

  it('computes effective per-period take-home and the expense ratio', () => {
    const result = computeScenarioResult(makeScenario());
    expect(result.effective.perCalendarMonth).toBeCloseTo(result.takeHome / 12, 10);
    expect(result.effective.perWorkingWeek).toBeCloseTo(result.takeHome / 52, 10);
    expect(result.effective.perWorkingHour).toBeCloseTo(result.takeHome / (52 * 40), 10);
    expect(result.effective.expenseRatio).toBe(0);
  });
});

describe('computeScenarioResult — invalid input', () => {
  it('rejects out-of-range work patterns', () => {
    expect(() =>
      computeScenarioResult(
        makeScenario({
          work: {
            workingWeeksPerYear: 0,
            workingDaysPerWeek: 5,
            workingHoursPerWeek: 40,
            paidHolidayDays: 0,
            paidSickDays: 0,
          },
        }),
      ),
    ).toThrow(CalculationInputError);
    expect(() =>
      computeScenarioResult(
        makeScenario({
          work: {
            workingWeeksPerYear: 52,
            workingDaysPerWeek: 8,
            workingHoursPerWeek: 40,
            paidHolidayDays: 0,
            paidSickDays: 0,
          },
        }),
      ),
    ).toThrow(CalculationInputError);
  });

  it('rejects negative money fields', () => {
    expect(() => computeScenarioResult(makeScenario({ income: { grossRevenue: -1 } }))).toThrow(
      CalculationInputError,
    );
  });
});
