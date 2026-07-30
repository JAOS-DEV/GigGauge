import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import type { GigGaugeScenario } from '../calculations/types';
import { annualiseExpense } from '../calculations/expenses';
import { QuickFormFields } from '../components/quick/QuickFormFields';
import { ResultsPanel } from '../components/quick/ResultsPanel';
import { createDefaultScenario } from '../state/defaultScenario';
import { getQuickExample, parseQuickExampleId } from '../state/examples';
import { prepareScenarioForDetailedPlan } from '../state/planHandoff';
import type { StoredQuickForm } from '../state/persistence';
import {
  computeQuickResults,
  createDefaultQuickFormValues,
  getExampleCosts,
  quickFormSchema,
  quickFormToScenario,
  type QuickEstimateFormValues,
  type QuickEstimateResults,
} from '../state/quickEstimateMapping';
import { useScenario } from '../state/useScenario';

interface InitialQuickState {
  values: QuickEstimateFormValues;
  base: GigGaugeScenario;
  exampleTitle: string | null;
}

/** Restores persisted raw form values by picking known, correctly-typed keys. */
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

function buildInitialState(
  exampleParam: string | null,
  isNew: boolean,
  scenario: GigGaugeScenario,
  quickForm: StoredQuickForm | undefined,
): InitialQuickState {
  const exampleId = parseQuickExampleId(exampleParam);
  if (exampleId) {
    const example = getQuickExample(exampleId);
    return {
      values: example.formValues,
      base: example.baseScenario,
      exampleTitle: example.title,
    };
  }
  if (isNew) {
    return {
      values: createDefaultQuickFormValues(),
      base: createDefaultScenario(),
      exampleTitle: null,
    };
  }
  if (quickForm) {
    return {
      values: mergeStoredQuickForm(quickForm),
      base: scenario,
      exampleTitle: null,
    };
  }
  return {
    values: createDefaultQuickFormValues(),
    base: scenario,
    exampleTitle: null,
  };
}

export function QuickEstimate(): ReactElement {
  const { scenario, quickForm, setActiveState } = useScenario();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [initial] = useState<InitialQuickState>(() =>
    buildInitialState(
      searchParams.get('example'),
      searchParams.get('new') === '1',
      scenario,
      quickForm,
    ),
  );

  // The new/example params are one-shot instructions. Strip them once applied
  // so a browser reload restores the user's draft instead of re-resetting it.
  useEffect(() => {
    if (searchParams.has('new') || searchParams.has('example')) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const form = useForm<QuickEstimateFormValues>({
    resolver: zodResolver(quickFormSchema),
    mode: 'onTouched',
    defaultValues: initial.values,
  });

  const watched = useWatch({ control: form.control }) as QuickEstimateFormValues;
  const watchedJson = JSON.stringify(watched);

  const results = useMemo<QuickEstimateResults | null>(() => {
    const parsed = quickFormSchema.safeParse(watched);
    return parsed.success ? computeQuickResults(watched, initial.base) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedJson, initial.base]);

  // Live annual total of included example costs (needs a valid work pattern).
  const exampleCostsTotal = useMemo<number | null>(() => {
    if (watched.arrangementType === 'employed' || !watched.includeExampleCosts) {
      return 0;
    }
    const weeks = Number(watched.workingWeeks);
    const days = Number(watched.workingDays);
    const hours = Number(watched.workingHours);
    if (!(weeks >= 1 && weeks <= 52 && days >= 1 && days <= 7 && hours > 0 && hours <= 168)) {
      return null;
    }
    const pattern = {
      workingWeeksPerYear: weeks,
      workingDaysPerWeek: days,
      workingHoursPerWeek: hours,
    };
    return getExampleCosts(watched.exampleSet).reduce(
      (total, cost) => total + annualiseExpense(cost, pattern),
      0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedJson]);

  // Keep the last successful results visible while the form is temporarily
  // invalid (state adjusted during render, per the React docs pattern).
  const [lastGoodResults, setLastGoodResults] = useState<QuickEstimateResults | null>(null);
  if (results !== null && results !== lastGoodResults) {
    setLastGoodResults(results);
  }
  const displayResults = results ?? lastGoodResults;

  // Sync every draft change into the scenario context (which persists it) —
  // including incomplete, Scotland or unachievable states, so nothing the
  // user typed is lost on reload. The raw form values are stored verbatim;
  // the scenario is the latest one that passed validation.
  const lastValidScenario = useRef<GigGaugeScenario>(initial.base);
  useEffect(() => {
    if (quickFormSchema.safeParse(watched).success) {
      lastValidScenario.current = quickFormToScenario(watched, initial.base);
    }
    setActiveState(lastValidScenario.current, { ...watched } as unknown as StoredQuickForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedJson, setActiveState]);

  const handleReviewDetailedAssumptions = (): void => {
    const prepared = prepareScenarioForDetailedPlan(lastValidScenario.current, {
      ...watched,
    } as unknown as StoredQuickForm);
    setActiveState(prepared.scenario, prepared.quickForm);
    void navigate('/plan');
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <nav>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-blue-800 hover:text-blue-950"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          Home
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">Quick estimate</h1>
        <p className="mt-1 text-base text-slate-600">
          A fast answer to what you need to earn. You can refine every assumption later.
        </p>
      </header>

      {initial.exampleTitle ? (
        <p className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-base text-blue-900">
          <Sparkles aria-hidden="true" className="h-5 w-5 shrink-0" />
          Example: {initial.exampleTitle} — replace with your own figures.
        </p>
      ) : null}

      <form noValidate className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <QuickFormFields form={form} exampleCostsTotal={exampleCostsTotal} />
      </form>

      <button
        type="button"
        onClick={handleReviewDetailedAssumptions}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-800 bg-white px-4 text-base font-semibold text-blue-900 hover:bg-blue-50"
      >
        Review detailed assumptions
        <ArrowRight aria-hidden="true" className="h-5 w-5" />
      </button>

      <section aria-labelledby="results-heading" className="flex flex-col gap-4">
        <h2 id="results-heading" className="text-lg font-semibold text-blue-950">
          Your estimate
        </h2>
        <ResultsPanel results={displayResults} />
      </section>
    </main>
  );
}
