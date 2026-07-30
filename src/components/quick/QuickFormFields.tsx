import type { ReactElement } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  getExampleCosts,
  goalPeriodValues,
  type QuickEstimateFormValues,
} from '../../state/quickEstimateMapping';
import { formatCurrencyGBP } from '../../utils/format';
import { CheckboxField, SelectField, TextField } from '../FieldControls';

const PERIOD_LABELS: Record<(typeof goalPeriodValues)[number], string> = {
  annual: 'Per year',
  monthly: 'Per calendar month',
  weekly: 'Per working week',
  daily: 'Per working day',
  hourly: 'Per working hour',
};

interface QuickFormFieldsProps {
  form: UseFormReturn<QuickEstimateFormValues>;
  /** Live annual total of included example costs; null while the pattern is invalid. */
  exampleCostsTotal: number | null;
}

export function QuickFormFields({ form, exampleCostsTotal }: QuickFormFieldsProps): ReactElement {
  const { register, watch, formState } = form;
  const errors = formState.errors;
  const arrangement = watch('arrangementType');
  const exampleSet = watch('exampleSet');
  const includeExamples = watch('includeExampleCosts');
  const weeksValue = Number(watch('workingWeeks'));
  const weeksOff =
    Number.isFinite(weeksValue) && weeksValue >= 1 && weeksValue <= 52 ? 52 - weeksValue : null;
  const isEmployed = arrangement === 'employed';

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-blue-950">Your work</h2>
        <SelectField id="arrangementType" label="Work arrangement" {...register('arrangementType')}>
          <option value="employed">Employed</option>
          <option value="selfEmployed">Self-employed</option>
          <option value="contractor">Contractor</option>
          <option value="gigPlatform">Gig or platform worker</option>
        </SelectField>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-blue-950">Your take-home target</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            id="targetAmount"
            label="Target amount (£)"
            inputMode="decimal"
            placeholder="e.g. 40000"
            error={errors.targetAmount?.message}
            {...register('targetAmount')}
          />
          <SelectField id="targetPeriod" label="Target period" {...register('targetPeriod')}>
            {goalPeriodValues.map((period) => (
              <option key={period} value={period}>
                {PERIOD_LABELS[period]}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="text-sm text-slate-500">
          Take-home is what you keep after work costs, tax and National Insurance.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-blue-950">Your work pattern</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField
            id="workingWeeks"
            label="Working weeks per year"
            inputMode="numeric"
            error={errors.workingWeeks?.message}
            {...register('workingWeeks')}
          />
          <TextField
            id="workingDays"
            label="Working days per week"
            inputMode="numeric"
            error={errors.workingDays?.message}
            {...register('workingDays')}
          />
          <TextField
            id="workingHours"
            label="Working hours per week"
            inputMode="numeric"
            error={errors.workingHours?.message}
            {...register('workingHours')}
          />
        </div>
        {weeksOff !== null ? (
          <p className="text-sm text-slate-500">
            That leaves {weeksOff} {weeksOff === 1 ? 'week' : 'weeks'} off per year. Working fewer
            weeks increases the amount you need to earn during each working week.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-blue-950">Your main work cost (optional)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            id="mainCostAmount"
            label={isEmployed ? 'Main work cost, e.g. commuting (£)' : 'Main work cost (£)'}
            inputMode="decimal"
            placeholder="e.g. 280"
            error={errors.mainCostAmount?.message}
            {...register('mainCostAmount')}
          />
          <SelectField id="mainCostFrequency" label="How often?" {...register('mainCostFrequency')}>
            <option value="weekly">Per week</option>
            <option value="monthly">Per month</option>
          </SelectField>
        </div>
        <CheckboxField
          id="mainCostActiveOnly"
          label="Only paid during working weeks"
          {...register('mainCostActiveOnly')}
        />

        {!isEmployed ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <CheckboxField
              id="includeExampleCosts"
              label="Include example costs"
              {...register('includeExampleCosts')}
            />
            {includeExamples ? (
              <ul className="mt-2 flex flex-col gap-1">
                {getExampleCosts(exampleSet).map((cost) => (
                  <li key={cost.id} className="flex justify-between text-sm text-slate-600">
                    <span>{cost.name}</span>
                    <span>
                      {formatCurrencyGBP(cost.amount)}{' '}
                      {cost.frequency === 'annual' ? 'a year' : 'a week'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {includeExamples && exampleCostsTotal !== null && exampleCostsTotal > 0 ? (
              <p
                className="mt-2 text-sm font-medium text-slate-700"
                data-testid="example-costs-disclosure"
              >
                Your estimate currently includes {formatCurrencyGBP(exampleCostsTotal)} of example
                annual costs.
              </p>
            ) : null}
            <p className="mt-2 text-sm text-slate-500">
              Example only — replace this with your actual cost.
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-blue-950">
          {isEmployed ? 'Your current take-home (optional)' : 'Your expected income (optional)'}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            id="expectedIncomeAmount"
            label={isEmployed ? 'Actual take-home pay (£)' : 'Expected revenue (£)'}
            inputMode="decimal"
            placeholder="Leave blank to skip"
            error={errors.expectedIncomeAmount?.message}
            {...register('expectedIncomeAmount')}
          />
          <SelectField
            id="expectedIncomePeriod"
            label="Income period"
            {...register('expectedIncomePeriod')}
          >
            {goalPeriodValues.map((period) => (
              <option key={period} value={period}>
                {PERIOD_LABELS[period]}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="text-sm text-slate-500">
          Add this to see whether your plan meets your target.
          {!isEmployed
            ? ' Gross revenue is the money received before your work expenses and tax.'
            : ''}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-blue-950">Tax region</h2>
        <SelectField id="region" label="Where do you pay Income Tax?" {...register('region')}>
          <option value="rUK">England, Wales or Northern Ireland</option>
          <option value="scotland">Scotland</option>
        </SelectField>
      </section>
    </div>
  );
}
