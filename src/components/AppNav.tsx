import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { Calculator, CalendarOff, ClipboardList, Home } from 'lucide-react';

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/quick', label: 'Quick', icon: Calculator, end: false },
  { to: '/plan', label: 'Plan', icon: ClipboardList, end: false },
  { to: '/time-off', label: 'Time off', icon: CalendarOff, end: false },
] as const;

export function AppNav(): ReactElement {
  return (
    <>
      {/* Desktop / tablet top nav */}
      <nav
        aria-label="Primary"
        className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block"
      >
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-start gap-1 px-6">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center gap-2 rounded-lg px-4 text-sm font-medium',
                  isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-500 hover:text-blue-800',
                ].join(' ')
              }
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
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
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-14 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-3 text-sm font-medium',
                  isActive ? 'text-blue-900' : 'text-slate-500 hover:text-blue-800',
                ].join(' ')
              }
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
