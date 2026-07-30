import { z } from 'zod';

/** Thrown by engine functions when inputs are structurally invalid or out of range. */
export class CalculationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationInputError';
  }
}

export const moneySchema = z
  .number()
  .finite('Amount must be a finite number')
  .nonnegative('Amount must not be negative');

/** For fields that explicitly permit losses (e.g. business profit). */
export const signedMoneySchema = z.number().finite('Amount must be a finite number');

export const percentageSchema = z
  .number()
  .finite('Percentage must be a finite number')
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must be at most 100');

export const workPatternSchema = z.object({
  workingWeeksPerYear: z
    .number()
    .finite()
    .min(1, 'Working weeks must be between 1 and 52')
    .max(52, 'Working weeks must be between 1 and 52'),
  workingDaysPerWeek: z
    .number()
    .finite()
    .min(1, 'Working days must be between 1 and 7')
    .max(7, 'Working days must be between 1 and 7'),
  workingHoursPerWeek: z
    .number()
    .finite()
    .gt(0, 'Working hours must be greater than 0')
    .max(168, 'Working hours must be at most 168'),
});

export const expenseFrequencySchema = z.enum(['weekly', 'monthly', 'annual']);

export const workExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: moneySchema,
  frequency: expenseFrequencySchema,
  activeWorkingPeriodOnly: z.boolean(),
  businessUsePercentage: percentageSchema,
  taxDeductible: z.boolean(),
  category: z.string(),
  notes: z.string().optional(),
});

export const goalPeriodSchema = z.enum(['annual', 'monthly', 'weekly', 'daily', 'hourly']);

export const goalTypeSchema = z.enum([
  'grossIncome',
  'profitBeforeTax',
  'takeHome',
  'matchScenario',
  'savingsTarget',
]);

export const arrangementTypeSchema = z.enum([
  'employed',
  'selfEmployed',
  'contractor',
  'gigPlatform',
  'hybrid',
  'custom',
]);

export const scenarioSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id: z.string(),
  name: z.string(),
  arrangementType: arrangementTypeSchema,
  goal: z.object({
    type: goalTypeSchema,
    period: goalPeriodSchema,
    amount: moneySchema,
    comparisonScenarioId: z.string().optional(),
  }),
  work: workPatternSchema.extend({
    paidHolidayDays: z.number().finite().min(0).max(365),
    paidSickDays: z.number().finite().min(0).max(365),
  }),
  income: z.object({
    grossAnnualSalary: moneySchema.optional(),
    grossRevenue: moneySchema.optional(),
    actualAnnualTakeHome: moneySchema.optional(),
    bonuses: moneySchema.optional(),
    tips: moneySchema.optional(),
    otherIncome: moneySchema.optional(),
    platformFeesAlreadyDeducted: z.boolean().optional(),
    employeePensionContribution: moneySchema.optional(),
  }),
  expenses: z.array(workExpenseSchema),
  tax: z.object({
    country: z.literal('UK'),
    region: z.enum(['rUK', 'scotland']),
    taxYear: z.string(),
    otherTaxableIncome: moneySchema,
    studentLoanEnabled: z.boolean(),
  }),
  employmentBenefits: z.object({
    employerPensionValue: moneySchema,
    otherBenefitsValue: moneySchema,
    annualCommutingCost: moneySchema,
  }),
  personal: z.object({
    annualRetirementSaving: moneySchema,
    emergencyFundTarget: moneySchema,
    currentEmergencySavings: moneySchema,
    travelFundTarget: moneySchema,
    currentTravelSavings: moneySchema,
  }),
});

/**
 * Parses a value with the given schema, converting Zod failures into a
 * CalculationInputError so callers get one predictable error type.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, context: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new CalculationInputError(`Invalid ${context} — ${detail}`);
  }
  return result.data;
}
