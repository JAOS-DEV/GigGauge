import { useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Columns2, FolderOpen } from 'lucide-react';
import { buildComparisonColumns, type ComparisonColumn } from '../calculations/comparisons';
import { getSafeLocalStorage, type KeyValueStorage } from '../state/persistence';
import { loadSavedScenarios, type SavedScenarioEntry } from '../state/savedScenarios';
import { formatCurrencyGBP } from '../utils/format';

const MAX_SELECTED = 3;

interface CompareProps {
  storage?: KeyValueStorage | null;
}

function MetricRow({
  label,
  columns,
  render,
}: {
  label: string;
  columns: ComparisonColumn[];
  render: (column: ComparisonColumn) => string;
}): ReactElement {
  return (
    <tr className="border-t border-slate-200">
      <th
        scope="row"
        className="sticky left-0 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-700"
      >
        {label}
      </th>
      {columns.map((column) => (
        <td key={column.entryId} className="px-3 py-3 text-sm text-slate-900">
          {render(column)}
        </td>
      ))}
    </tr>
  );
}

export function Compare({ storage: storageProp }: CompareProps): ReactElement {
  const storage = useMemo<KeyValueStorage | null>(
    () => (storageProp !== undefined ? storageProp : getSafeLocalStorage()),
    [storageProp],
  );
  const entries = useMemo<SavedScenarioEntry[]>(
    () => (storage ? loadSavedScenarios(storage) : []),
    [storage],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);

  const selectedEntries = useMemo(
    () =>
      selectedIds
        .map((id) => entries.find((entry) => entry.id === id))
        .filter((entry): entry is SavedScenarioEntry => entry !== undefined),
    [entries, selectedIds],
  );

  const columns = useMemo(
    () =>
      buildComparisonColumns(
        selectedEntries.map((entry) => ({ entryId: entry.id, scenario: entry.scenario })),
      ),
    [selectedEntries],
  );

  const toggleSelection = (entryId: string): void => {
    if (selectedIds.includes(entryId)) {
      setSelectionMessage(null);
      setSelectedIds(selectedIds.filter((id) => id !== entryId));
      return;
    }
    if (selectedIds.length >= MAX_SELECTED) {
      setSelectionMessage('You can compare at most three saved plans at once.');
      return;
    }
    setSelectionMessage(null);
    setSelectedIds([...selectedIds, entryId]);
  };

  if (entries.length < 2) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">Compare</h1>
          <p className="text-base text-slate-600">
            Compare two or three saved plans side by side after costs, tax and time off.
          </p>
        </header>
        <section
          data-testid="compare-empty"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-center"
        >
          <Columns2 aria-hidden="true" className="mx-auto h-10 w-10 text-blue-800" />
          <p className="mt-3 text-base text-slate-700">
            Save at least two plans in your library before you can compare them.
          </p>
          <Link
            to="/scenarios"
            className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-950 px-5 text-base font-semibold text-white hover:bg-blue-900"
          >
            <FolderOpen aria-hidden="true" className="h-5 w-5" />
            Open scenarios
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">Compare</h1>
        <p className="text-base text-slate-600">
          Select two or three saved plans. Selection is for this visit only.
        </p>
      </header>

      <section aria-label="Saved plans to compare" className="flex flex-col gap-2">
        {entries.map((entry) => {
          const checked = selectedIds.includes(entry.id);
          return (
            <label
              key={entry.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSelection(entry.id)}
                className="h-5 w-5 accent-blue-900"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">
                  {entry.scenario.name}
                </span>
              </span>
            </label>
          );
        })}
      </section>

      {selectionMessage ? (
        <p role="alert" className="text-sm font-medium text-amber-800">
          {selectionMessage}
        </p>
      ) : null}

      {columns.length >= 2 ? (
        <section
          data-testid="compare-table"
          aria-label="Comparison results"
          className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"
        >
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50">
                <th scope="col" className="sticky left-0 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  Metric
                </th>
                {columns.map((column) => (
                  <th
                    key={column.entryId}
                    scope="col"
                    className="px-3 py-3 text-sm font-semibold text-blue-950"
                  >
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label="Arrangement"
                columns={columns}
                render={(column) => column.arrangementLabel}
              />
              <MetricRow
                label="Annual take-home"
                columns={columns}
                render={(column) => formatCurrencyGBP(column.annualTakeHome)}
              />
              <MetricRow
                label="Total tax"
                columns={columns}
                render={(column) => formatCurrencyGBP(column.totalTax)}
              />
              <MetricRow
                label="Total work costs"
                columns={columns}
                render={(column) => formatCurrencyGBP(column.totalWorkCosts)}
              />
              {columns.map((column) => column.incomeMetricLabel).every((label, _, arr) => label === arr[0]) ? (
                <MetricRow
                  label={columns[0]!.incomeMetricLabel}
                  columns={columns}
                  render={(column) => formatCurrencyGBP(column.incomeMetricValue)}
                />
              ) : (
                <MetricRow
                  label="Profit before tax / gross"
                  columns={columns}
                  render={(column) =>
                    `${column.incomeMetricLabel}: ${formatCurrencyGBP(column.incomeMetricValue)}`
                  }
                />
              )}
              <MetricRow
                label="Goal status"
                columns={columns}
                render={(column) => column.goalStatusLabel}
              />
              <MetricRow
                label="Per working week"
                columns={columns}
                render={(column) => formatCurrencyGBP(column.effectivePerWorkingWeek)}
              />
              <MetricRow
                label="Per working hour"
                columns={columns}
                render={(column) => formatCurrencyGBP(column.effectivePerWorkingHour)}
              />
            </tbody>
          </table>
        </section>
      ) : (
        <p className="text-sm text-slate-600" data-testid="compare-need-more">
          Select at least two saved plans to see the comparison.
        </p>
      )}
    </main>
  );
}
