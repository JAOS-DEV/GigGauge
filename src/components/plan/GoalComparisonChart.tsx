import type { ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GoalType } from '../../calculations/types';
import { formatCurrencyGBP } from '../../utils/format';

interface GoalComparisonChartProps {
  goalAnnual: number;
  achievedAnnual: number;
  goalType: GoalType;
}

function achievedLabel(goalType: GoalType): string {
  switch (goalType) {
    case 'grossIncome':
      return 'Gross income';
    case 'profitBeforeTax':
      return 'Profit before tax';
    case 'takeHome':
    case 'matchScenario':
    case 'savingsTarget':
      return 'Estimated take-home';
  }
}

/**
 * Single bar chart comparing annualised goal vs the engine’s achieved value for that goal type.
 * Text figures must also be shown alongside — the chart is supplementary.
 */
export function GoalComparisonChart({
  goalAnnual,
  achievedAnnual,
  goalType,
}: GoalComparisonChartProps): ReactElement {
  const achievedName = achievedLabel(goalType);
  const data = [
    { name: 'Annual goal', value: goalAnnual },
    { name: achievedName, value: achievedAnnual },
  ];

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5"
      data-testid="goal-comparison-chart"
      aria-labelledby="goal-comparison-heading"
    >
      <h3 id="goal-comparison-heading" className="text-base font-semibold text-blue-950">
        Goal comparison
      </h3>
      <dl className="mt-3 flex flex-col gap-1 text-base text-slate-700">
        <div className="flex justify-between gap-4">
          <dt>Annual goal</dt>
          <dd className="font-medium text-slate-900">{formatCurrencyGBP(goalAnnual)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>{achievedName}</dt>
          <dd className="font-medium text-slate-900">{formatCurrencyGBP(achievedAnnual)}</dd>
        </div>
      </dl>
      <div className="mt-4 h-56 w-full" role="img" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis
              tick={{ fill: '#475569', fontSize: 12 }}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat('en-GB', {
                  style: 'currency',
                  currency: 'GBP',
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(value)
              }
            />
            <Tooltip
              formatter={(value) => formatCurrencyGBP(typeof value === 'number' ? value : Number(value))}
            />
            <Bar dataKey="value" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
