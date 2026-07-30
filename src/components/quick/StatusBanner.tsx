import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { QuickStatusSummary } from '../../state/quickEstimateMapping';
import { formatCurrencyGBP, formatDifference } from '../../utils/format';

const STATUS_PRESENTATION = {
  comfortablyAchieved: {
    label: 'Target comfortably achieved',
    Icon: CheckCircle2,
    container: 'border-green-300 bg-green-50 text-green-900',
  },
  narrowlyAchieved: {
    label: 'Target narrowly achieved',
    Icon: AlertTriangle,
    container: 'border-amber-300 bg-amber-50 text-amber-900',
  },
  notAchieved: {
    label: 'Target not achieved',
    Icon: XCircle,
    container: 'border-red-300 bg-red-50 text-red-900',
  },
  insufficientData: {
    label: 'Insufficient information',
    Icon: Info,
    container: 'border-slate-300 bg-slate-50 text-slate-700',
  },
} as const;

function statusSentence(summary: QuickStatusSummary): string {
  if (summary.status === 'insufficientData') {
    return 'There is not enough information to assess this target yet.';
  }
  if (summary.differenceAnnual < 0) {
    return `At your current assumptions, this plan is estimated to leave you ${formatCurrencyGBP(
      Math.abs(summary.differenceAnnual),
    )} below your annual target (${formatDifference(summary.differenceAnnual)}).`;
  }
  if (Math.abs(summary.differenceAnnual) < 0.005) {
    return 'This plan meets your annual target exactly.';
  }
  return `This plan exceeds your annual target by approximately ${formatCurrencyGBP(
    summary.differenceAnnual,
  )} (${formatDifference(summary.differenceAnnual)}).`;
}

interface StatusBannerProps {
  summary: QuickStatusSummary;
}

export function StatusBanner({ summary }: StatusBannerProps): ReactElement {
  const presentation = STATUS_PRESENTATION[summary.status];
  const { Icon } = presentation;
  return (
    <section
      data-testid="status-banner"
      className={`rounded-xl border p-4 ${presentation.container}`}
    >
      <p className="flex items-center gap-2 font-semibold">
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
        {presentation.label}
      </p>
      <p className="mt-1 text-base">{statusSentence(summary)}</p>
      {summary.status !== 'insufficientData' ? (
        <p className="mt-1 text-sm">
          Estimated take-home at your expected income: {formatCurrencyGBP(summary.takeHome)} a year.
        </p>
      ) : null}
    </section>
  );
}
