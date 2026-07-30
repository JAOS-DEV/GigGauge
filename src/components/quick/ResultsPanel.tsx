import type { ReactElement } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { QuickEstimateResults } from '../../state/quickEstimateMapping';
import { formatCurrencyGBP, formatWeeks } from '../../utils/format';
import { StatusBanner } from './StatusBanner';

interface ResultsPanelProps {
  results: QuickEstimateResults | null;
}

function Notice({ title, message }: { title: string; message: string }): ReactElement {
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
        {title}
      </p>
      <p className="mt-1 text-base">{message}</p>
    </section>
  );
}

export function ResultsPanel({ results }: ResultsPanelProps): ReactElement {
  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      {results === null ? (
        <p className="text-base text-slate-500">
          Enter a target and your work pattern to see what you need to earn.
        </p>
      ) : results.kind === 'regionUnsupported' ? (
        <Notice title="Scottish Income Tax isn't supported yet" message={results.reason} />
      ) : results.kind === 'unachievable' ? (
        <Notice title="This target can't be reached" message={results.reason} />
      ) : (
        <>
          <section className="rounded-2xl bg-blue-950 p-5 text-white shadow-sm">
            <h3 className="text-sm font-medium uppercase tracking-wide text-blue-200">
              {results.requiredKind === 'grossSalary'
                ? 'Required annual gross salary'
                : 'Required annual revenue'}
            </h3>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrencyGBP(results.requiredAnnualAmount)}
            </p>
            <p className="mt-1 text-sm text-blue-200">
              To reach your take-home target after
              {results.requiredKind === 'grossSalary'
                ? ' tax, National Insurance and your work costs.'
                : ' your work costs, tax and National Insurance.'}
            </p>
          </section>

          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: 'Per calendar month', value: results.breakdown.calendarMonthly },
              { label: 'Per working week', value: results.breakdown.workingWeekly },
              { label: 'Per working day', value: results.breakdown.workingDaily },
              { label: 'Per working hour', value: results.breakdown.workingHourly },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <dt className="text-sm text-slate-500">{card.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">
                  {formatCurrencyGBP(card.value)}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-base text-slate-600">
            This pattern gives you {formatWeeks(results.breakdown.weeksOff)} off per year, with{' '}
            {formatCurrencyGBP(results.totalAnnualCosts)} of annual work costs included.
          </p>

          {results.status ? <StatusBanner summary={results.status} /> : null}
        </>
      )}
    </div>
  );
}
