import type { GigGaugeScenario, GoalStatus, WorkArrangementType } from './types';
import { computeScenarioResult } from './scenarioResult';

export type IncomeMetricLabel = 'Profit before tax' | 'Gross income';

export interface ComparisonColumn {
  /** Saved-library entry id (stable selection key). */
  entryId: string;
  scenarioId: string;
  name: string;
  arrangementLabel: string;
  annualTakeHome: number;
  totalTax: number;
  totalWorkCosts: number;
  incomeMetricLabel: IncomeMetricLabel;
  incomeMetricValue: number;
  goalStatus: GoalStatus;
  goalStatusLabel: string;
  effectivePerWorkingWeek: number;
  effectivePerWorkingHour: number;
}

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  comfortablyAchieved: 'Target comfortably achieved',
  narrowlyAchieved: 'Target narrowly achieved',
  notAchieved: 'Target not achieved',
  insufficientData: 'Insufficient information',
};

export function arrangementTypeLabel(type: WorkArrangementType): string {
  switch (type) {
    case 'employed':
      return 'Employed';
    case 'selfEmployed':
      return 'Self-employed';
    case 'contractor':
      return 'Contractor';
    case 'gigPlatform':
      return 'Gig / platform';
    case 'hybrid':
      return 'Hybrid';
    case 'custom':
      return 'Custom';
  }
}

export function goalStatusLabel(status: GoalStatus): string {
  return GOAL_STATUS_LABELS[status];
}

function isEmployedOnly(type: WorkArrangementType): boolean {
  return type === 'employed';
}

/**
 * Builds side-by-side comparison columns from saved scenarios.
 * Pure TypeScript — no React or DOM imports.
 */
export function buildComparisonColumns(
  items: ReadonlyArray<{ entryId: string; scenario: GigGaugeScenario }>,
): ComparisonColumn[] {
  return items.map(({ entryId, scenario }) => {
    const result = computeScenarioResult(scenario);
    const employedOnly = isEmployedOnly(scenario.arrangementType);

    return {
      entryId,
      scenarioId: scenario.id,
      name: scenario.name,
      arrangementLabel: arrangementTypeLabel(scenario.arrangementType),
      annualTakeHome: result.takeHome,
      totalTax: result.tax.total,
      totalWorkCosts: result.expenses.totalCashCost,
      incomeMetricLabel: employedOnly ? 'Gross income' : 'Profit before tax',
      incomeMetricValue: employedOnly ? result.annualGrossIncome : result.profitBeforeTax,
      goalStatus: result.goal.status,
      goalStatusLabel: goalStatusLabel(result.goal.status),
      effectivePerWorkingWeek: result.effective.perWorkingWeek,
      effectivePerWorkingHour: result.effective.perWorkingHour,
    };
  });
}
