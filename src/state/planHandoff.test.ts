import { describe, expect, it } from 'vitest';
import { createDefaultScenario } from './defaultScenario';
import { getQuickExample } from './examples';
import { adoptExpensesForPlan, prepareScenarioForDetailedPlan } from './planHandoff';
import {
  EXAMPLE_COST_ID_PREFIX,
  QUICK_MAIN_COST_ID,
  createDefaultQuickFormValues,
  quickFormToScenario,
} from './quickEstimateMapping';

describe('prepareScenarioForDetailedPlan', () => {
  it('materialises private-hire example costs as Plan-owned editable rows', () => {
    const example = getQuickExample('privateHire');
    const scenario = quickFormToScenario(example.formValues, example.baseScenario);
    const prepared = prepareScenarioForDetailedPlan(scenario, {
      ...example.formValues,
    });

    expect(prepared.quickForm?.includeExampleCosts).toBe(false);
    expect(prepared.scenario.expenses.length).toBeGreaterThan(4);
    expect(
      prepared.scenario.expenses.every(
        (expense) =>
          !expense.id.startsWith(EXAMPLE_COST_ID_PREFIX) && expense.id !== QUICK_MAIN_COST_ID,
      ),
    ).toBe(true);
    expect(
      prepared.scenario.expenses.some((expense) => expense.id.startsWith('plan-example-')),
    ).toBe(true);
  });

  it('does not duplicate Plan-owned rows when Quick sync runs again', () => {
    const example = getQuickExample('privateHire');
    const first = prepareScenarioForDetailedPlan(
      quickFormToScenario(example.formValues, example.baseScenario),
      { ...example.formValues },
    );
    const values = {
      ...createDefaultQuickFormValues(),
      ...example.formValues,
      includeExampleCosts: false,
      mainCostAmount: '',
      mainCostName: '',
    };
    const afterQuick = quickFormToScenario(values, first.scenario);
    expect(afterQuick.expenses).toEqual(first.scenario.expenses);
  });
});

describe('adoptExpensesForPlan', () => {
  it('renames quick-managed ids only', () => {
    const scenario = createDefaultScenario();
    scenario.expenses = [
      {
        id: `${EXAMPLE_COST_ID_PREFIX}phone`,
        name: 'Phone',
        amount: 240,
        frequency: 'annual',
        activeWorkingPeriodOnly: false,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'phone',
      },
      {
        id: 'custom-1',
        name: 'Custom',
        amount: 10,
        frequency: 'weekly',
        activeWorkingPeriodOnly: true,
        businessUsePercentage: 100,
        taxDeductible: true,
        category: 'other',
      },
    ];
    const adopted = adoptExpensesForPlan(scenario);
    expect(adopted.expenses[0]?.id).toBe('plan-example-phone');
    expect(adopted.expenses[1]?.id).toBe('custom-1');
  });
});
