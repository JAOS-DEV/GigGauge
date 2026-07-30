import { z } from 'zod';
import type {
  GigGaugeScenario,
  GoalPeriod,
  GoalStatus,
  WorkExpense,
  WorkPattern,
} from '../calculations/types';
import {
  annualiseAmount,
  buildPeriodBreakdown,
  type PeriodBreakdown,
} from '../calculations/periods';
import { annualiseExpense, summariseExpenses } from '../calculations/expenses';
import { computeScenarioResult } from '../calculations/scenarioResult';
import { getTaxConfig } from '../calculations/tax/taxConfig';
import { solveRequiredGrossSalary } from '../calculations/targets/solveRequiredGross';
import { solveRequiredRevenue } from '../calculations/targets/solveRequiredRevenue';

export type QuickArrangement = 'employed' | 'selfEmployed' | 'contractor' | 'gigPlatform';
export type QuickExampleSet = 'neutral' | 'privateHire';

/** Raw form values. Numeric fields are strings so blanks stay blank instead of becoming zeroes. */
export interface QuickEstimateFormValues {
  scenarioName: string;
  arrangementType: QuickArrangement;
  targetAmount: string;
  targetPeriod: GoalPeriod;
  workingWeeks: string;
  workingDays: string;
  workingHours: string;
  mainCostName: string;
  mainCostAmount: string;
  mainCostFrequency: 'weekly' | 'monthly';
  mainCostActiveOnly: boolean;
  includeExampleCosts: boolean;
  exampleSet: QuickExampleSet;
  expectedIncomeAmount: string;
  expectedIncomePeriod: GoalPeriod;
  region: 'rUK' | 'scotland';
}

export function createDefaultQuickFormValues(): QuickEstimateFormValues {
  return {
    scenarioName: 'Quick estimate',
    arrangementType: 'selfEmployed',
    targetAmount: '',
    targetPeriod: 'annual',
    workingWeeks: '48',
    workingDays: '5',
    workingHours: '40',
    mainCostName: '',
    mainCostAmount: '',
    mainCostFrequency: 'weekly',
    mainCostActiveOnly: true,
    includeExampleCosts: true,
    exampleSet: 'neutral',
    expectedIncomeAmount: '',
    expectedIncomePeriod: 'annual',
    region: 'rUK',
  };
}

const toNumber = (value: string): number => Number(value.trim());

const numericString = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)), { message });

const optionalNonNegativeString = z
  .string()
  .trim()
  .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), {
    message: 'Enter an amount of zero or more',
  });

export const goalPeriodValues = ['annual', 'monthly', 'weekly', 'daily', 'hourly'] as const;

export const quickFormSchema = z.object({
  scenarioName: z.string(),
  arrangementType: z.enum(['employed', 'selfEmployed', 'contractor', 'gigPlatform']),
  targetAmount: numericString('Enter your target amount').refine((v) => Number(v) > 0, {
    message: 'Enter a target above zero',
  }),
  targetPeriod: z.enum(goalPeriodValues),
  workingWeeks: numericString('Enter your working weeks').refine(
    (v) => Number(v) >= 1 && Number(v) <= 52,
    { message: 'Working weeks must be between 1 and 52' },
  ),
  workingDays: numericString('Enter your working days').refine(
    (v) => Number(v) >= 1 && Number(v) <= 7,
    { message: 'Working days must be between 1 and 7' },
  ),
  workingHours: numericString('Enter your working hours').refine(
    (v) => Number(v) > 0 && Number(v) <= 168,
    { message: 'Working hours must be above 0 and at most 168' },
  ),
  mainCostName: z.string(),
  mainCostAmount: optionalNonNegativeString,
  mainCostFrequency: z.enum(['weekly', 'monthly']),
  mainCostActiveOnly: z.boolean(),
  includeExampleCosts: z.boolean(),
  exampleSet: z.enum(['neutral', 'privateHire']),
  expectedIncomeAmount: optionalNonNegativeString,
  expectedIncomePeriod: z.enum(goalPeriodValues),
  region: z.enum(['rUK', 'scotland']),
});

export const EXAMPLE_COST_ID_PREFIX = 'example-';
export const EXAMPLE_COST_NOTE = 'Example only — replace this with your actual cost.';
export const QUICK_MAIN_COST_ID = 'quick-main-cost';

const exampleCost = (
  id: string,
  name: string,
  amount: number,
  frequency: WorkExpense['frequency'],
  category: string,
  activeWorkingPeriodOnly = false,
): WorkExpense => ({
  id: `${EXAMPLE_COST_ID_PREFIX}${id}`,
  name,
  amount,
  frequency,
  activeWorkingPeriodOnly,
  businessUsePercentage: 100,
  taxDeductible: true,
  category,
  notes: EXAMPLE_COST_NOTE,
});

/** Conservative neutral defaults for a generic self-employed quick estimate. */
export const NEUTRAL_EXAMPLE_COSTS: readonly WorkExpense[] = [
  exampleCost('phone', 'Phone and data (business share)', 240, 'annual', 'phone'),
  exampleCost('accountant', 'Accountant or bookkeeping', 300, 'annual', 'accounting'),
  exampleCost('licensing', 'Licensing, checks and accessories', 100, 'annual', 'licensing'),
  exampleCost('other', 'Other expenses', 300, 'annual', 'other'),
];

/** The private-hire example adds weekly running costs on top of the neutral set. */
export const PRIVATE_HIRE_EXAMPLE_COSTS: readonly WorkExpense[] = [
  ...NEUTRAL_EXAMPLE_COSTS,
  exampleCost('charging', 'Charging or fuel', 40, 'weekly', 'fuel', true),
  exampleCost('cleaning', 'Cleaning', 10, 'weekly', 'cleaning', true),
];

export function getExampleCosts(set: QuickExampleSet): readonly WorkExpense[] {
  return set === 'privateHire' ? PRIVATE_HIRE_EXAMPLE_COSTS : NEUTRAL_EXAMPLE_COSTS;
}

/**
 * Builds the authoritative scenario from validated quick-form values.
 *
 * - The main cost is tax-deductible for self-employed-type arrangements;
 *   employees get no tax relief on work costs, so it is marked non-deductible.
 * - Expected income maps to actualAnnualTakeHome (payslip figure, the
 *   higher-confidence path) for employed workers and to grossRevenue for
 *   everyone else, annualised using the entered period.
 * - Fields the quick form does not cover (paid holiday, pension, savings…)
 *   are preserved from the base scenario.
 */
export function quickFormToScenario(
  values: QuickEstimateFormValues,
  base: GigGaugeScenario,
): GigGaugeScenario {
  const pattern: WorkPattern = {
    workingWeeksPerYear: toNumber(values.workingWeeks),
    workingDaysPerWeek: toNumber(values.workingDays),
    workingHoursPerWeek: toNumber(values.workingHours),
  };
  const isEmployed = values.arrangementType === 'employed';

  // Preserve expenses added or edited on the Detailed plan so Quick↔Plan
  // trips do not wipe Plan-owned rows. Only rebuild the Quick-managed ids.
  const expenses: WorkExpense[] = base.expenses.filter(
    (expense) =>
      expense.id !== QUICK_MAIN_COST_ID && !expense.id.startsWith(EXAMPLE_COST_ID_PREFIX),
  );
  const mainCostAmount = values.mainCostAmount.trim() === '' ? 0 : toNumber(values.mainCostAmount);
  if (mainCostAmount > 0) {
    expenses.push({
      id: QUICK_MAIN_COST_ID,
      name: values.mainCostName.trim() === '' ? 'Main work cost' : values.mainCostName,
      amount: mainCostAmount,
      frequency: values.mainCostFrequency,
      activeWorkingPeriodOnly: values.mainCostActiveOnly,
      businessUsePercentage: 100,
      taxDeductible: !isEmployed,
      category: 'main',
    });
  }
  if (!isEmployed && values.includeExampleCosts) {
    expenses.push(...getExampleCosts(values.exampleSet));
  }

  const expectedRaw = values.expectedIncomeAmount.trim();
  const expectedAnnual =
    expectedRaw === ''
      ? undefined
      : annualiseAmount(toNumber(expectedRaw), values.expectedIncomePeriod, pattern);

  return {
    ...base,
    name: values.scenarioName,
    arrangementType: values.arrangementType,
    goal: {
      type: 'takeHome',
      period: values.targetPeriod,
      amount: toNumber(values.targetAmount),
    },
    work: { ...base.work, ...pattern },
    income:
      expectedAnnual === undefined
        ? {}
        : isEmployed
          ? { actualAnnualTakeHome: expectedAnnual }
          : { grossRevenue: expectedAnnual },
    expenses,
    tax: { ...base.tax, region: values.region },
  };
}

export interface QuickStatusSummary {
  status: GoalStatus;
  differenceAnnual: number;
  takeHome: number;
}

export type QuickEstimateResults =
  | { kind: 'regionUnsupported'; reason: string }
  | { kind: 'unachievable'; reason: string }
  | {
      kind: 'ok';
      requiredKind: 'grossSalary' | 'revenue';
      requiredAnnualAmount: number;
      breakdown: PeriodBreakdown;
      totalAnnualCosts: number;
      exampleCostsAnnualTotal: number;
      scenario: GigGaugeScenario;
      /** Present only when the user entered an expected income. */
      status?: QuickStatusSummary;
    };

/**
 * Computes the quick-estimate outputs for validated form values: the required
 * gross salary or revenue to hit the take-home target, its period breakdown,
 * and (when expected income was entered) the goal status.
 */
export function computeQuickResults(
  values: QuickEstimateFormValues,
  base: GigGaugeScenario,
): QuickEstimateResults {
  const scenario = quickFormToScenario(values, base);
  const configResult = getTaxConfig(scenario.tax.taxYear, scenario.tax.region);
  if (!configResult.supported) {
    return { kind: 'regionUnsupported', reason: configResult.reason };
  }

  const pattern: WorkPattern = scenario.work;
  const summary = summariseExpenses(scenario.expenses, pattern);
  const targetAnnualTakeHome = annualiseAmount(scenario.goal.amount, scenario.goal.period, pattern);

  const solved =
    scenario.arrangementType === 'employed'
      ? solveRequiredGrossSalary(
          { targetAnnualTakeHome, annualWorkCosts: summary.totalCashCost },
          configResult.config,
        )
      : solveRequiredRevenue(
          {
            targetAnnualTakeHome,
            annualDeductibleExpenses: summary.deductible,
            annualNonDeductibleExpenses: summary.nonDeductible,
          },
          configResult.config,
        );

  if (!solved.achievable) {
    return { kind: 'unachievable', reason: solved.reason };
  }

  const exampleCostsAnnualTotal = scenario.expenses
    .filter((expense) => expense.id.startsWith(EXAMPLE_COST_ID_PREFIX))
    .reduce((total, expense) => total + annualiseExpense(expense, pattern), 0);

  const hasExpectedIncome =
    scenario.income.actualAnnualTakeHome !== undefined ||
    scenario.income.grossRevenue !== undefined;

  let status: QuickStatusSummary | undefined;
  if (hasExpectedIncome) {
    const result = computeScenarioResult(scenario);
    status = {
      status: result.goal.status,
      differenceAnnual: result.goal.difference,
      takeHome: result.takeHome,
    };
  }

  return {
    kind: 'ok',
    requiredKind: scenario.arrangementType === 'employed' ? 'grossSalary' : 'revenue',
    requiredAnnualAmount: solved.requiredAmount,
    breakdown: buildPeriodBreakdown(solved.requiredAmount, pattern),
    totalAnnualCosts: summary.totalCashCost,
    exampleCostsAnnualTotal,
    scenario,
    status,
  };
}
