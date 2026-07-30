import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarOff, Check } from 'lucide-react';
import { DraftNumberField } from '../components/FieldControls';
import {
  buildTimeOffRows,
  getTimeOffPlannerGate,
  TIME_OFF_WEEK_PRESETS,
  type TimeOffRowResult,
} from '../state/timeOffPlanner';
import { useScenario } from '../state/useScenario';
import { formatCurrencyGBP, formatWeeks } from '../utils/format';

function RowCard({
  row,
  isCurrent,
  onApply,
}: {
  row: TimeOffRowResult;
  isCurrent: boolean;
  onApply: (weeks: number) => void;
}): ReactElement {
  const presetLabel = (TIME_OFF_WEEK_PRESETS as readonly number[]).includes(row.workingWeeks)
    ? null
    : 'Custom';

  return (
    <li
      className={[
        'flex flex-col gap-3 rounded-xl border p-4',
        isCurrent ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white',
      ].join(' ')}
      data-testid={`time-off-row-${row.workingWeeks}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-blue-950">
            {row.workingWeeks} working weeks
            {presetLabel ? (
              <span className="ml-2 text-sm font-medium text-slate-500">({presetLabel})</span>
            ) : null}
          </p>
          <p className="text-sm text-slate-500">
            {formatWeeks(row.weeksOff)} off per year
            {isCurrent ? ' · Current plan' : ''}
          </p>
        </div>
        {row.kind === 'ok' ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-950 px-4 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
            disabled={isCurrent}
            onClick={() => onApply(row.workingWeeks)}
          >
            {isCurrent ? 'Applied' : 'Apply'}
          </button>
        ) : null}
      </div>

      {row.kind === 'ok' ? (
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">
              Required annual {row.requiredKind === 'grossSalary' ? 'salary' : 'revenue'}
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900">
              {formatCurrencyGBP(row.annualAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Per working week</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900">
              {formatCurrencyGBP(row.workingWeekly)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Per working day</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900">
              {formatCurrencyGBP(row.workingDaily)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Per working hour</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900">
              {formatCurrencyGBP(row.workingHourly)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-amber-900">{row.reason}</p>
      )}
    </li>
  );
}

export function TimeOff(): ReactElement {
  const { scenario, quickForm, setActiveState } = useScenario();
  const gate = getTimeOffPlannerGate(scenario);
  const [customWeeks, setCustomWeeks] = useState<number | null>(null);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  const rows = gate.ready ? buildTimeOffRows(scenario, customWeeks) : [];

  const handleApply = (weeks: number): void => {
    const nextScenario = {
      ...scenario,
      work: {
        ...scenario.work,
        workingWeeksPerYear: weeks,
      },
    };
    const nextQuickForm = quickForm
      ? { ...quickForm, workingWeeks: String(weeks) }
      : quickForm;
    setActiveState(nextScenario, nextQuickForm);
    setAppliedMessage('Applied to your active plan.');
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          <CalendarOff aria-hidden="true" className="h-4 w-4" />
          Time off
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">Time-off planner</h1>
        <p className="text-base text-slate-600">
          Unpaid time off is modelled by reducing working weeks. Days and hours stay as on your
          Plan — change those there if needed. Compare patterns below, then apply one to your
          active plan.
        </p>
      </header>

      {!gate.ready ? (
        <section
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
          data-testid="time-off-empty"
        >
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
            Planner not ready
          </p>
          <p className="mt-2 text-base">{gate.reason}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/plan"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-4 text-base font-semibold text-white hover:bg-blue-900"
            >
              Open detailed plan
            </Link>
            <Link
              to="/quick"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-blue-950 hover:border-blue-700"
            >
              Open quick estimate
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <DraftNumberField
              id="customWorkingWeeks"
              label="Custom working weeks per year"
              value={customWeeks ?? scenario.work.workingWeeksPerYear}
              min={1}
              max={52}
              hint="Enter any value from 1 to 52 to add a custom row."
              onCommit={(value) => setCustomWeeks(value)}
            />
          </section>

          {appliedMessage ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-base text-green-900"
            >
              <Check aria-hidden="true" className="h-5 w-5 shrink-0" />
              {appliedMessage}
            </p>
          ) : null}

          <ul className="flex flex-col gap-3" data-testid="time-off-rows">
            {rows.map((row) => (
              <RowCard
                key={row.workingWeeks}
                row={row}
                isCurrent={row.workingWeeks === scenario.work.workingWeeksPerYear}
                onApply={handleApply}
              />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
