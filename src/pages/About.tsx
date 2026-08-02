import type { ReactElement } from 'react';
import { TAX_DISCLAIMER } from '../calculations/tax/taxConfig';

export function About(): ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">About GigGauge</h1>
        <p className="text-base text-slate-600">
          How estimates work, and what this app does and does not calculate.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-blue-950">How estimates work</h2>
        <p className="text-base leading-relaxed text-slate-700">
          GigGauge helps you plan by converting a take-home (or other) target into required earnings,
          after work costs, unpaid time off and UK tax estimates for England, Wales and Northern
          Ireland. You can compare saved plans, log cash you actually received, and keep everything
          on this device in your browser — there is no account and no server-side storage.
        </p>
        <p className="text-base leading-relaxed text-slate-700">
          Figures are planning estimates. They use published rates and thresholds for the selected
          tax year, keep full precision internally, and round only for display. Your real tax
          position depends on your circumstances.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-blue-950">Tax disclaimer</h2>
        <p className="text-base leading-relaxed text-slate-700">{TAX_DISCLAIMER}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-blue-950">Limitations and simplifications</h2>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-700">
          <li>
            <strong>Scottish Income Tax</strong> is not supported. Scotland is reported as
            unsupported rather than silently using rest-of-UK bands.
          </li>
          <li>
            <strong>Student loan repayments</strong> are not calculated, even if the option is
            present in a plan.
          </li>
          <li>
            <strong>Class 2 National Insurance</strong> (voluntary from 2026/27) is excluded.
          </li>
          <li>
            The <strong>Class 1 / Class 4 annual-maximum</strong> interaction is not modelled.
          </li>
          <li>
            <strong>Marriage allowance</strong>, <strong>blind person&apos;s allowance</strong>, and
            dividend / savings-income rates are out of scope.
          </li>
          <li>
            Employee pension contributions are modelled as <strong>salary sacrifice</strong>{' '}
            (deducted before Income Tax and National Insurance) — a simplification.
          </li>
          <li>
            Self-employed retirement saving is treated as a post-tax allocation with no tax relief
            modelled.
          </li>
        </ul>
      </section>
    </main>
  );
}
