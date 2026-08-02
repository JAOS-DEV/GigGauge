import type { ReactElement } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { GigGaugeScenario } from '../../calculations/types';
import { computePlanResults, type PlanResults } from '../../state/planResults';
import { formatCurrencyGBP, formatPercent, formatWeeks } from '../../utils/format';
import { StatusBanner } from '../quick/StatusBanner';
import { GoalComparisonChart } from './GoalComparisonChart';

interface PlanResultsPanelProps {
  scenario: GigGaugeScenario;
  /** When true, show the goal-vs-achieved chart if goal status is assessable. */
  showGoalChart?: boolean;
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

function BreakdownRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}): ReactElement {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'border-t border-slate-200 pt-2' : ''}`}>
      <dt className={strong ? 'font-semibold text-blue-950 text-lg' : undefined}>{label}</dt>
      <dd
        className={
          strong ? 'text-lg font-bold text-blue-950' : 'font-medium text-slate-900'
        }
      >
        {formatCurrencyGBP(value)}
      </dd>
    </div>
  );
}

/**
 * Cash-flow lines that reconcile to takeHomeAfterRetirement:
 * employment gross − employee pension + revenue + other taxable
 * − total cash costs − income tax − NI − retirement saving.
 */
function Breakdown({
  scenario,
  results,
}: {
  scenario: GigGaugeScenario;
  results: Extract<PlanResults, { kind: 'ok' }>;
}): ReactElement {
  const { scenarioResult } = results;
  const employmentGross = scenarioResult.annualGrossIncome;
  const revenue = scenarioResult.annualRevenue;
  const pension = scenario.income.employeePensionContribution ?? 0;
  const otherTaxable = scenario.tax.otherTaxableIncome;
  const costs = scenarioResult.expenses.totalCashCost;
  const tax = scenarioResult.tax.incomeTax;
  const ni = scenarioResult.tax.nationalInsurance;
  const retirement = scenario.personal.annualRetirementSaving;
  const takeHomeAfterRetirement = scenarioResult.takeHomeAfterRetirementSaving;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5"
      data-testid="financial-breakdown"
    >
      <h3 className="text-base font-semibold text-blue-950">Financial breakdown</h3>
      {results.projectedFromRequired ? (
        <p className="mt-2 text-sm text-slate-600" data-testid="breakdown-projected-note">
          {results.required?.achievable && results.required.kind === 'grossSalary'
            ? 'Based on the required gross salary to hit your take-home goal (you have not entered income yet).'
            : 'Based on the required revenue to hit your take-home goal (you have not entered income yet).'}
        </p>
      ) : null}
      <dl className="mt-3 flex flex-col gap-2 text-base text-slate-700">
        {employmentGross > 0 || scenario.arrangementType === 'employed' ? (
          <BreakdownRow label="Gross employment income" value={employmentGross} />
        ) : null}
        {pension > 0 ? (
          <BreakdownRow label="− Employee pension contribution" value={pension} />
        ) : null}
        {revenue > 0 ||
        scenario.arrangementType === 'selfEmployed' ||
        scenario.arrangementType === 'contractor' ||
        scenario.arrangementType === 'gigPlatform' ||
        scenario.arrangementType === 'hybrid' ||
        scenario.arrangementType === 'custom' ? (
          <BreakdownRow label="Gross revenue" value={revenue} />
        ) : null}
        {otherTaxable > 0 ? (
          <BreakdownRow label="+ Other taxable income" value={otherTaxable} />
        ) : null}
        {scenario.arrangementType !== 'employed' ? (
          <p className="text-sm text-slate-500">
            Business profit before tax (after deductible costs):{' '}
            {formatCurrencyGBP(scenarioResult.profitBeforeTax)}.
          </p>
        ) : null}
        <BreakdownRow label="− Total work costs (cash)" value={costs} />
        <p className="text-sm text-slate-500">
          Of which deductible {formatCurrencyGBP(scenarioResult.expenses.deductible)},
          non-deductible {formatCurrencyGBP(scenarioResult.expenses.nonDeductible)}.
        </p>
        <BreakdownRow label="− Income Tax" value={tax} />
        <BreakdownRow label="− National Insurance" value={ni} />
        <BreakdownRow label="− Retirement saving" value={retirement} />
        <BreakdownRow
          label="= Personal take-home after retirement saving"
          value={takeHomeAfterRetirement}
          strong
        />
      </dl>
      <p className="mt-3 text-sm text-slate-500">
        Effective tax rate {formatPercent(scenarioResult.tax.effectiveRate)}. Weeks off:{' '}
        {formatWeeks(52 - scenario.work.workingWeeksPerYear)}.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: 'Per calendar month', value: scenarioResult.effective.perCalendarMonth },
          { label: 'Per working week', value: scenarioResult.effective.perWorkingWeek },
          { label: 'Per working day', value: scenarioResult.effective.perWorkingDay },
          { label: 'Per working hour', value: scenarioResult.effective.perWorkingHour },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <dt className="text-sm text-slate-500">{card.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrencyGBP(card.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PlanResultsPanel({
  scenario,
  showGoalChart = false,
}: PlanResultsPanelProps): ReactElement {
  const results = computePlanResults(scenario);
  const goalAssessable =
    results.kind === 'ok' && results.scenarioResult.goal.status !== 'insufficientData';

  return (
    <div aria-live="polite" className="flex flex-col gap-4" data-testid="plan-results-panel">
      {results.kind === 'regionUnsupported' ? (
        <Notice title="Scottish Income Tax isn't supported yet" message={results.reason} />
      ) : (
        <>
          {results.required?.achievable === false ? (
            <Notice
              title="This take-home target can't be reached"
              message={results.required.reason}
            />
          ) : null}

          {results.required && results.required.achievable ? (
            <section className="rounded-2xl bg-blue-950 p-5 text-white shadow-sm">
              <h3 className="text-sm font-medium uppercase tracking-wide text-blue-200">
                {results.required.kind === 'grossSalary'
                  ? 'Required annual gross salary'
                  : 'Required annual revenue'}
              </h3>
              <p className="mt-1 text-3xl font-bold">
                {formatCurrencyGBP(results.required.annualAmount)}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-blue-100">
                <div>
                  <dt>Per calendar month</dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrencyGBP(results.required.breakdown.calendarMonthly)}
                  </dd>
                </div>
                <div>
                  <dt>Per working week</dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrencyGBP(results.required.breakdown.workingWeekly)}
                  </dd>
                </div>
                <div>
                  <dt>Per working day</dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrencyGBP(results.required.breakdown.workingDaily)}
                  </dd>
                </div>
                <div>
                  <dt>Per working hour</dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrencyGBP(results.required.breakdown.workingHourly)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-sm text-blue-200">
                {formatWeeks(results.required.breakdown.weeksOff)} off per year
              </p>
            </section>
          ) : null}

          {goalAssessable ? (
            <StatusBanner
              summary={{
                status: results.scenarioResult.goal.status,
                differenceAnnual: results.scenarioResult.goal.difference,
                takeHome: results.scenarioResult.takeHome,
              }}
            />
          ) : (
            <p className="text-base text-slate-500">
              Enter a goal amount and enough income to see whether this plan meets your target.
            </p>
          )}

          {showGoalChart && goalAssessable ? (
            <GoalComparisonChart
              goalAnnual={results.scenarioResult.goal.amount}
              achievedAnnual={
                results.scenarioResult.goal.amount + results.scenarioResult.goal.difference
              }
              goalType={scenario.goal.type}
            />
          ) : null}

          <Breakdown scenario={scenario} results={results} />
        </>
      )}
    </div>
  );
}
