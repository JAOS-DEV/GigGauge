import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { TAX_DISCLAIMER } from '../calculations/tax/taxConfig';

export function DisclaimerFooter(): ReactElement {
  return (
    <footer className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4">
      <p className="text-sm leading-relaxed text-slate-500">{TAX_DISCLAIMER}</p>
      <p className="mt-2 text-sm text-slate-500">
        <Link to="/about" className="font-medium text-blue-800 underline-offset-2 hover:underline">
          About estimates and limitations
        </Link>
      </p>
    </footer>
  );
}
