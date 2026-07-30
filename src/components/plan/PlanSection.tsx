import type { ReactElement, ReactNode } from 'react';

interface PlanSectionProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function PlanSection({
  id,
  title,
  defaultOpen = false,
  children,
}: PlanSectionProps): ReactElement {
  return (
    <details
      id={id}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm open:pb-1"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-lg font-semibold text-blue-950 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-h-11 items-center justify-between gap-3">
          {title}
          <span aria-hidden="true" className="text-slate-400">
            ▾
          </span>
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4">{children}</div>
    </details>
  );
}
