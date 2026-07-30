import type { ReactElement } from 'react';
import { Gauge } from 'lucide-react';
import { TAX_DISCLAIMER } from './calculations/tax/taxConfig';

export function App(): ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-center">
      <Gauge aria-hidden="true" className="mb-4 h-12 w-12 text-blue-900" />
      <h1 className="text-4xl font-bold tracking-tight text-blue-950">GigGauge</h1>
      <p className="mt-2 text-lg text-slate-700">Know what your work is really worth.</p>
      <p className="mt-1 max-w-md text-base text-slate-500">
        Compare salary, self-employment, contracting and gig work after costs, tax and time off.
      </p>
      <p className="mt-8 max-w-md text-sm leading-relaxed text-slate-500">{TAX_DISCLAIMER}</p>
    </main>
  );
}
