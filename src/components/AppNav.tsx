import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calculator,
  CalendarOff,
  ClipboardList,
  Columns2,
  FolderOpen,
  Home,
  Wallet,
} from 'lucide-react';

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/quick', label: 'Quick', icon: Calculator, end: false },
  { to: '/plan', label: 'Plan', icon: ClipboardList, end: false },
  { to: '/time-off', label: 'Time off', icon: CalendarOff, end: false },
  { to: '/scenarios', label: 'Scenarios', icon: FolderOpen, end: false },
  { to: '/compare', label: 'Compare', icon: Columns2, end: false },
  { to: '/tracker', label: 'Tracker', icon: Wallet, end: false },
] as const;

export function AppNav(): ReactElement {
  return (
    <>
      {/* Desktop / tablet top nav */}
      <nav
        aria-label="Primary"
        className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-stretch justify-start gap-1 px-4">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium',
                  isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-500 hover:text-blue-800',
                ].join(' ')
              }
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-0.5 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-tight',
                  isActive ? 'text-blue-900' : 'text-slate-500 hover:text-blue-800',
                ].join(' ')
              }
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate text-center">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
