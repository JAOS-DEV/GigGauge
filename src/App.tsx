import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
import { AppNav } from './components/AppNav';
import { DisclaimerFooter } from './components/DisclaimerFooter';

export function App(): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppNav />
      <div className="flex flex-1 flex-col pb-20 md:pb-0">
        <Outlet />
        <DisclaimerFooter />
      </div>
    </div>
  );
}
