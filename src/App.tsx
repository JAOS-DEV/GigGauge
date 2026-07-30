import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
import { DisclaimerFooter } from './components/DisclaimerFooter';

export function App(): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Outlet />
      <DisclaimerFooter />
    </div>
  );
}
