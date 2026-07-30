import type { GigGaugeScenario } from '../calculations/types';

export const CURRENT_SCHEMA_VERSION = 1;

/** A fresh, valid scenario draft with neutral defaults and no income entered. */
export function createDefaultScenario(): GigGaugeScenario {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Quick estimate',
    arrangementType: 'selfEmployed',
    goal: { type: 'takeHome', period: 'annual', amount: 0 },
    work: {
      workingWeeksPerYear: 48,
      workingDaysPerWeek: 5,
      workingHoursPerWeek: 40,
      paidHolidayDays: 0,
      paidSickDays: 0,
    },
    income: {},
    expenses: [],
    tax: {
      country: 'UK',
      region: 'rUK',
      taxYear: '2026/27',
      otherTaxableIncome: 0,
      studentLoanEnabled: false,
    },
    employmentBenefits: {
      employerPensionValue: 0,
      otherBenefitsValue: 0,
      annualCommutingCost: 0,
    },
    personal: {
      annualRetirementSaving: 0,
      emergencyFundTarget: 0,
      currentEmergencySavings: 0,
      travelFundTarget: 0,
      currentTravelSavings: 0,
    },
  };
}
