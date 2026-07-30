import type { GigGaugeScenario, WorkExpense } from '../calculations/types';
import type { StoredQuickForm } from './persistence';
import {
  EXAMPLE_COST_ID_PREFIX,
  EXAMPLE_COST_NOTE,
  QUICK_MAIN_COST_ID,
  createDefaultQuickFormValues,
  quickFormSchema,
  quickFormToScenario,
  type QuickEstimateFormValues,
} from './quickEstimateMapping';

export const EXPENSE_CATEGORIES = [
  'vehicle',
  'fuel',
  'cleaning',
  'insurance',
  'phone',
  'accounting',
  'licensing',
  'travel',
  'equipment',
  'workspace',
  'main',
  'other',
] as const;

export function isExampleExpense(expense: WorkExpense): boolean {
  return (
    expense.id.startsWith(EXAMPLE_COST_ID_PREFIX) ||
    expense.id.startsWith('plan-example-') ||
    expense.notes === EXAMPLE_COST_NOTE ||
    (expense.notes?.includes('Example only') ?? false)
  );
}

export function createEmptyExpense(): WorkExpense {
  return {
    id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    amount: 0,
    frequency: 'monthly',
    activeWorkingPeriodOnly: false,
    businessUsePercentage: 100,
    taxDeductible: true,
    category: 'other',
  };
}

function mergeStoredQuickForm(stored: StoredQuickForm): QuickEstimateFormValues {
  const defaults = createDefaultQuickFormValues();
  const merged: Record<string, string | boolean> = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof QuickEstimateFormValues)[]) {
    const value = stored[key];
    if (value !== undefined && typeof value === typeof defaults[key]) {
      merged[key] = value;
    }
  }
  return merged as unknown as QuickEstimateFormValues;
}

/** Give Quick-managed rows stable Plan ids so Quick sync will not wipe them. */
export function adoptExpensesForPlan(scenario: GigGaugeScenario): GigGaugeScenario {
  return {
    ...scenario,
    expenses: scenario.expenses.map((expense) => {
      if (expense.id.startsWith(EXAMPLE_COST_ID_PREFIX)) {
        return {
          ...expense,
          id: `plan-${expense.id}`,
        };
      }
      if (expense.id === QUICK_MAIN_COST_ID) {
        return {
          ...expense,
          id: `plan-main-${Date.now().toString(36)}`,
        };
      }
      return expense;
    }),
  };
}

/**
 * Ensures the active scenario carries the Quick form's costs as real expense
 * rows, then turns off the Quick "include example costs" flag so returning to
 * Quick does not re-inject deleted example rows.
 */
export function prepareScenarioForDetailedPlan(
  scenario: GigGaugeScenario,
  quickForm?: StoredQuickForm,
): { scenario: GigGaugeScenario; quickForm?: StoredQuickForm } {
  if (!quickForm) {
    return { scenario: adoptExpensesForPlan(scenario), quickForm };
  }

  const values = mergeStoredQuickForm(quickForm);
  const parsed = quickFormSchema.safeParse(values);
  const nextScenario = parsed.success ? quickFormToScenario(values, scenario) : scenario;

  return {
    scenario: adoptExpensesForPlan(nextScenario),
    quickForm: {
      ...quickForm,
      includeExampleCosts: false,
      // Main cost was adopted into scenario.expenses; avoid Quick re-adding it.
      mainCostAmount: '',
      mainCostName: '',
    },
  };
}
