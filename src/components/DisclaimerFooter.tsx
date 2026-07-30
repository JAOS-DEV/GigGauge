import type { ReactElement } from 'react';
import { TAX_DISCLAIMER } from '../calculations/tax/taxConfig';

export function DisclaimerFooter(): ReactElement {
  return (
    <footer className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4">
      <p className="text-sm leading-relaxed text-slate-500">{TAX_DISCLAIMER}</p>
    </footer>
  );
}
