import type { GigGaugeScenario } from '../calculations/types';
import { computePlanResults } from './planResults';

export const TIME_OFF_WEEK_PRESETS = [52, 48, 46, 40, 36, 30] as const;

export type TimeOffPlannerGate =
  | { ready: true }
  | { ready: false; reason: string };

export type TimeOffRowResult =
  | {
      kind: 'ok';
      workingWeeks: number;
      weeksOff: number;
      requiredKind: 'grossSalary' | 'revenue';
      annualAmount: number;
      workingWeekly: number;
      workingDaily: number;
      workingHourly: number;
    }
  | {
      kind: 'unavailable';
      workingWeeks: number;
      weeksOff: number;
      reason: string;
    };

/** Clone the active scenario with a what-if working-weeks value (days/hours unchanged). */
export function scenarioWithWorkingWeeks(
  scenario: GigGaugeScenario,
  workingWeeksPerYear: number,
): GigGaugeScenario {
  return {
    ...scenario,
    work: {
      ...scenario.work,
      workingWeeksPerYear,
    },
  };
}

/**
 * Whether the Time-off planner can show a what-if table for this active draft.
 * Requires a solvable take-home required solve on the current scenario.
 */
export function getTimeOffPlannerGate(scenario: GigGaugeScenario): TimeOffPlannerGate {
  if (scenario.goal.type !== 'takeHome' || scenario.goal.amount <= 0) {
    return {
      ready: false,
      reason:
        'Add a take-home goal on your active plan first. The time-off planner compares how many working weeks you need to hit that target.',
    };
  }

  const results = computePlanResults(scenario);
  if (results.kind === 'regionUnsupported') {
    return {
      ready: false,
      reason: results.reason,
    };
  }
  if (results.required === null) {
    return {
      ready: false,
      reason:
        'Add a take-home goal on your active plan first. The time-off planner compares how many working weeks you need to hit that target.',
    };
  }
  if (!results.required.achievable) {
    return {
      ready: false,
      reason: results.required.reason,
    };
  }
  return { ready: true };
}

/** Required earnings for a single what-if working-weeks value. */
export function computeTimeOffRow(
  scenario: GigGaugeScenario,
  workingWeeks: number,
): TimeOffRowResult {
  const weeksOff = 52 - workingWeeks;
  const results = computePlanResults(scenarioWithWorkingWeeks(scenario, workingWeeks));

  if (results.kind === 'regionUnsupported') {
    return { kind: 'unavailable', workingWeeks, weeksOff, reason: results.reason };
  }
  if (results.required === null) {
    return {
      kind: 'unavailable',
      workingWeeks,
      weeksOff,
      reason: 'A take-home goal is required to compare working-week patterns.',
    };
  }
  if (!results.required.achievable) {
    return {
      kind: 'unavailable',
      workingWeeks,
      weeksOff,
      reason: results.required.reason,
    };
  }

  return {
    kind: 'ok',
    workingWeeks,
    weeksOff,
    requiredKind: results.required.kind,
    annualAmount: results.required.annualAmount,
    workingWeekly: results.required.breakdown.workingWeekly,
    workingDaily: results.required.breakdown.workingDaily,
    workingHourly: results.required.breakdown.workingHourly,
  };
}

/**
 * Build display rows: presets plus a custom weeks value when it is valid and
 * not already in the preset list (avoids duplicate rows).
 */
export function buildTimeOffRows(
  scenario: GigGaugeScenario,
  customWeeks: number | null,
): TimeOffRowResult[] {
  const weeks = new Set<number>(TIME_OFF_WEEK_PRESETS);
  if (
    customWeeks !== null &&
    Number.isInteger(customWeeks) &&
    customWeeks >= 1 &&
    customWeeks <= 52
  ) {
    weeks.add(customWeeks);
  }

  return [...weeks]
    .sort((a, b) => b - a)
    .map((value) => computeTimeOffRow(scenario, value));
}
