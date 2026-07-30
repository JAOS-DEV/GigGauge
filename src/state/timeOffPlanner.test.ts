import { describe, expect, it } from 'vitest';
import { createDefaultScenario } from './defaultScenario';
import {
  buildTimeOffRows,
  computeTimeOffRow,
  getTimeOffPlannerGate,
  TIME_OFF_WEEK_PRESETS,
} from './timeOffPlanner';

describe('timeOffPlanner', () => {
  it('is not ready without a take-home goal amount', () => {
    const gate = getTimeOffPlannerGate(createDefaultScenario());
    expect(gate.ready).toBe(false);
  });

  it('is not ready for Scotland', () => {
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 50_000 };
    scenario.tax.region = 'scotland';
    const gate = getTimeOffPlannerGate(scenario);
    expect(gate.ready).toBe(false);
    if (!gate.ready) {
      expect(gate.reason.toLowerCase()).toMatch(/scotland|supported/);
    }
  });

  it('builds preset rows with required period rates for a solvable plan', () => {
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };
    scenario.work.workingWeeksPerYear = 48;

    expect(getTimeOffPlannerGate(scenario).ready).toBe(true);

    const row48 = computeTimeOffRow(scenario, 48);
    expect(row48.kind).toBe('ok');
    if (row48.kind !== 'ok') return;
    expect(row48.weeksOff).toBe(4);
    expect(row48.annualAmount).toBeGreaterThan(30_000);
    expect(row48.workingWeekly).toBeCloseTo(row48.annualAmount / 48, 6);
    expect(row48.workingDaily).toBeCloseTo(row48.workingWeekly / 5, 6);
    expect(row48.workingHourly).toBeCloseTo(row48.workingWeekly / 40, 6);

    const rows = buildTimeOffRows(scenario, null);
    expect(rows.map((row) => row.workingWeeks)).toEqual([...TIME_OFF_WEEK_PRESETS]);
  });

  it('includes a custom weeks row without duplicating a preset', () => {
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };

    const withCustom = buildTimeOffRows(scenario, 42);
    expect(withCustom.some((row) => row.workingWeeks === 42)).toBe(true);
    expect(withCustom.filter((row) => row.workingWeeks === 48)).toHaveLength(1);

    const withPresetCustom = buildTimeOffRows(scenario, 40);
    expect(withPresetCustom.filter((row) => row.workingWeeks === 40)).toHaveLength(1);
  });

  it('shows higher weekly rates when working fewer weeks', () => {
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };

    const many = computeTimeOffRow(scenario, 52);
    const few = computeTimeOffRow(scenario, 30);
    expect(many.kind).toBe('ok');
    expect(few.kind).toBe('ok');
    if (many.kind !== 'ok' || few.kind !== 'ok') return;
    expect(few.workingWeekly).toBeGreaterThan(many.workingWeekly);
  });
});
