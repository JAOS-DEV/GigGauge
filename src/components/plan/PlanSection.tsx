import { useState, type ReactElement, type ReactNode, type MouseEvent } from 'react';
import { Info } from 'lucide-react';

/** Helper copy at or under this length stays visible; longer copy uses the section info control. */
export const SECTION_HELP_CHAR_LIMIT = 100;

interface PlanSectionProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  /** Longer help shown via the header info icon (use for copy over ~100 characters). */
  help?: ReactNode;
  children: ReactNode;
}

export function PlanSection({
  id,
  title,
  defaultOpen = false,
  help,
  children,
}: PlanSectionProps): ReactElement {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpPanelId = `${id}-help`;

  const toggleHelp = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setHelpOpen((current) => !current);
  };

  return (
    <details
      id={id}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm open:pb-1"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-lg font-semibold text-blue-950 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-h-11 items-center justify-between gap-3">
          <span className="min-w-0 flex-1">{title}</span>
          <span className="flex shrink-0 items-center gap-1">
            {help ? (
              <button
                type="button"
                className={
                  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 ' +
                  'hover:bg-slate-100 hover:text-blue-800 ' +
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700/30'
                }
                aria-expanded={helpOpen}
                aria-controls={helpPanelId}
                aria-label={`About ${title}`}
                onClick={toggleHelp}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
              >
                <Info aria-hidden="true" className="h-5 w-5 shrink-0" />
              </button>
            ) : null}
            <span aria-hidden="true" className="px-1 text-slate-400">
              ▾
            </span>
          </span>
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4">
        {help && helpOpen ? (
          <div id={helpPanelId} className="text-sm leading-relaxed text-slate-500">
            {help}
          </div>
        ) : null}
        {children}
      </div>
    </details>
  );
}
