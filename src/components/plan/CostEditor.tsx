import type { ReactElement } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { WorkExpense } from '../../calculations/types';
import { annualiseExpense } from '../../calculations/expenses';
import type { WorkPattern } from '../../calculations/types';
import { formatCurrencyGBP } from '../../utils/format';
import { CheckboxField, SelectField, TextField } from '../FieldControls';
import { createEmptyExpense, EXPENSE_CATEGORIES, isExampleExpense } from '../../state/planHandoff';
import { EXAMPLE_COST_NOTE } from '../../state/quickEstimateMapping';

interface CostEditorProps {
  expenses: WorkExpense[];
  workPattern: WorkPattern;
  onChange: (expenses: WorkExpense[]) => void;
}

function updateExpense(
  expenses: WorkExpense[],
  id: string,
  patch: Partial<WorkExpense>,
): WorkExpense[] {
  return expenses.map((expense) => {
    if (expense.id !== id) {
      return expense;
    }
    const next = { ...expense, ...patch };
    // Clear the example badge once the user edits name or amount.
    if (
      (patch.name !== undefined || patch.amount !== undefined) &&
      next.notes === EXAMPLE_COST_NOTE
    ) {
      return { ...next, notes: undefined };
    }
    return next;
  });
}

export function CostEditor({ expenses, workPattern, onChange }: CostEditorProps): ReactElement {
  const handleAdd = (): void => {
    onChange([...expenses, createEmptyExpense()]);
  };

  const handleDelete = (id: string): void => {
    onChange(expenses.filter((expense) => expense.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Add every work cost separately. Tick “Only paid during working weeks” on costs you can pause
        when you take time off (for example vehicle rental), and leave it unticked for year-round
        costs such as insurance.
      </p>

      {expenses.length === 0 ? (
        <p className="text-base text-slate-500">No costs yet. Add your first cost below.</p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {expenses.map((expense, index) => {
          const annual = annualiseExpense(expense, workPattern);
          const example = isExampleExpense(expense);
          return (
            <li
              key={expense.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              data-testid={`cost-row-${expense.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Cost {index + 1}
                  {example ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      Example — replace with your actual cost
                    </span>
                  ) : null}
                </h3>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                  aria-label={`Delete cost ${expense.name || index + 1}`}
                  onClick={() => handleDelete(expense.id)}
                >
                  <Trash2 aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>

              <TextField
                id={`${expense.id}-name`}
                label="Name"
                value={expense.name}
                onChange={(event) =>
                  onChange(updateExpense(expenses, expense.id, { name: event.target.value }))
                }
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  id={`${expense.id}-amount`}
                  label="Amount (£)"
                  inputMode="decimal"
                  value={expense.amount === 0 ? '' : String(expense.amount)}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    if (raw === '') {
                      onChange(updateExpense(expenses, expense.id, { amount: 0 }));
                      return;
                    }
                    const amount = Number(raw);
                    if (Number.isFinite(amount) && amount >= 0) {
                      onChange(updateExpense(expenses, expense.id, { amount }));
                    }
                  }}
                />
                <SelectField
                  id={`${expense.id}-frequency`}
                  label="Frequency"
                  value={expense.frequency}
                  onChange={(event) =>
                    onChange(
                      updateExpense(expenses, expense.id, {
                        frequency: event.target.value as WorkExpense['frequency'],
                      }),
                    )
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </SelectField>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  id={`${expense.id}-businessUse`}
                  label="Business use (%)"
                  inputMode="numeric"
                  value={String(expense.businessUsePercentage)}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value >= 0 && value <= 100) {
                      onChange(
                        updateExpense(expenses, expense.id, { businessUsePercentage: value }),
                      );
                    }
                  }}
                />
                <SelectField
                  id={`${expense.id}-category`}
                  label="Category"
                  value={expense.category}
                  onChange={(event) =>
                    onChange(updateExpense(expenses, expense.id, { category: event.target.value }))
                  }
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </SelectField>
              </div>

              <CheckboxField
                id={`${expense.id}-activeOnly`}
                label="Only paid during working weeks"
                checked={expense.activeWorkingPeriodOnly}
                onChange={(event) =>
                  onChange(
                    updateExpense(expenses, expense.id, {
                      activeWorkingPeriodOnly: event.target.checked,
                    }),
                  )
                }
              />
              <CheckboxField
                id={`${expense.id}-deductible`}
                label="Tax-deductible business expense"
                checked={expense.taxDeductible}
                onChange={(event) =>
                  onChange(
                    updateExpense(expenses, expense.id, { taxDeductible: event.target.checked }),
                  )
                }
              />

              <TextField
                id={`${expense.id}-notes`}
                label="Notes (optional)"
                value={expense.notes ?? ''}
                onChange={(event) => {
                  const notes = event.target.value;
                  onChange(
                    updateExpense(expenses, expense.id, {
                      notes: notes === '' ? undefined : notes,
                    }),
                  );
                }}
              />

              <p className="text-sm text-slate-600">
                Annualised at your current work pattern:{' '}
                <span className="font-medium">{formatCurrencyGBP(annual)}</span>
              </p>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-4 text-base font-medium text-blue-900 hover:border-blue-700"
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
        Add cost
      </button>
    </div>
  );
}
