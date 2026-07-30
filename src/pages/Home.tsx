import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ClipboardList, Gauge, Sparkles } from 'lucide-react';
import { PlanResultsPanel } from '../components/plan/PlanResultsPanel';
import { getQuickExample } from '../state/examples';
import { computePlanResults, shouldShowHomeDashboard } from '../state/planResults';
import { useScenario } from '../state/useScenario';

function MarketingHome(): ReactElement {
  const examples = [getQuickExample('employedJob'), getQuickExample('privateHire')];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col items-center gap-2 text-center">
        <Gauge aria-hidden="true" className="h-12 w-12 text-blue-900" />
        <h1 className="text-4xl font-bold tracking-tight text-blue-950">GigGauge</h1>
        <p className="text-lg text-slate-700">Know what your work is really worth.</p>
        <p className="max-w-md text-base text-slate-500">
          Set your target. See what the work is really worth — after costs, tax and time off.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <Link
          to="/quick?new=1"
          className="group flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-700"
        >
          <span className="flex items-center gap-3">
            <Calculator aria-hidden="true" className="h-6 w-6 text-blue-800" />
            <span>
              <span className="block text-lg font-semibold text-blue-950">Quick estimate</span>
              <span className="block text-sm text-slate-500">
                Find out what you need to earn to reach your take-home target.
              </span>
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-blue-700"
          />
        </Link>

        <Link
          to="/plan"
          className="group flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-700"
        >
          <span className="flex items-center gap-3">
            <ClipboardList aria-hidden="true" className="h-6 w-6 text-blue-800" />
            <span>
              <span className="block text-lg font-semibold text-blue-950">Detailed plan</span>
              <span className="block text-sm text-slate-500">
                Edit every cost, income and leave assumption with a full breakdown.
              </span>
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-blue-700"
          />
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-3 text-lg font-semibold text-blue-950">
            <Sparkles aria-hidden="true" className="h-6 w-6 text-blue-800" />
            Try an example
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Explore with realistic example figures — everything stays editable.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {examples.map((example) => (
              <li key={example.id}>
                <Link
                  to={`/quick?example=${example.id}`}
                  className="flex min-h-12 flex-col justify-center rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-blue-700"
                >
                  <span className="font-medium text-slate-900">{example.title}</span>
                  <span className="text-sm text-slate-500">{example.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}

function ResultsDashboard(): ReactElement {
  const { scenario } = useScenario();

  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8"
      data-testid="home-results-dashboard"
    >
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">GigGauge</p>
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">{scenario.name}</h1>
        <p className="text-base text-slate-600">
          Results for your active plan. Edit assumptions anytime.
        </p>
      </header>

      <PlanResultsPanel scenario={scenario} showGoalChart />

      <section className="flex flex-col gap-3">
        <Link
          to="/plan"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-950 px-5 text-base font-semibold text-white hover:bg-blue-900"
        >
          <ClipboardList aria-hidden="true" className="h-5 w-5" />
          Edit detailed plan
        </Link>
        <Link
          to="/quick"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-base font-semibold text-blue-950 hover:border-blue-700"
        >
          <Calculator aria-hidden="true" className="h-5 w-5" />
          Quick estimate
        </Link>
      </section>
    </main>
  );
}

export function Home(): ReactElement {
  const { scenario } = useScenario();
  const results = computePlanResults(scenario);

  if (shouldShowHomeDashboard(results)) {
    return <ResultsDashboard />;
  }

  return <MarketingHome />;
}
