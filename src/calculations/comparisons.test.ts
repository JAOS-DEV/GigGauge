import { describe, expect, it } from 'vitest';
import { createDefaultScenario } from '../state/defaultScenario';
import {
  arrangementTypeLabel,
  buildComparisonColumns,
  goalStatusLabel,
} from './comparisons';

function employedScenario(name: string, gross: number, goal: number) {
  const scenario = createDefaultScenario();
  scenario.name = name;
  scenario.arrangementType = 'employed';
  scenario.income = { grossAnnualSalary: gross };
  scenario.goal = { type: 'takeHome', period: 'annual', amount: goal };
  return scenario;
}

function selfEmployedScenario(name: string, revenue: number, goal: number) {
  const scenario = createDefaultScenario();
  scenario.name = name;
  scenario.arrangementType = 'selfEmployed';
  scenario.income = { grossRevenue: revenue };
  scenario.goal = { type: 'takeHome', period: 'annual', amount: goal };
  return scenario;
}

describe('buildComparisonColumns', () => {
  it('builds two columns with employed Gross income labelling', () => {
    const a = employedScenario('Job A', 50_000, 40_000);
    const b = employedScenario('Job B', 60_000, 40_000);
    const columns = buildComparisonColumns([
      { entryId: 'e1', scenario: a },
      { entryId: 'e2', scenario: b },
    ]);

    expect(columns).toHaveLength(2);
    expect(columns[0]?.name).toBe('Job A');
    expect(columns[0]?.arrangementLabel).toBe('Employed');
    expect(columns[0]?.incomeMetricLabel).toBe('Gross income');
    expect(columns[0]?.incomeMetricValue).toBe(50_000);
    expect(columns[0]?.totalTax).toBeGreaterThan(0);
    expect(columns[0]?.goalStatusLabel).toBe(goalStatusLabel(columns[0]!.goalStatus));
    expect(columns[1]?.name).toBe('Job B');
    expect(columns[1]?.incomeMetricValue).toBe(60_000);
  });

  it('labels self-employed columns with Profit before tax', () => {
    const a = selfEmployedScenario('Gig A', 40_000, 25_000);
    const b = selfEmployedScenario('Gig B', 30_000, 25_000);
    const c = employedScenario('Job', 45_000, 30_000);
    const columns = buildComparisonColumns([
      { entryId: 's1', scenario: a },
      { entryId: 's2', scenario: b },
      { entryId: 's3', scenario: c },
    ]);

    expect(columns).toHaveLength(3);
    expect(columns[0]?.incomeMetricLabel).toBe('Profit before tax');
    expect(columns[0]?.incomeMetricValue).toBe(40_000);
    expect(columns[2]?.incomeMetricLabel).toBe('Gross income');
    expect(Number.isFinite(columns[0]?.effectivePerWorkingWeek)).toBe(true);
    expect(Number.isFinite(columns[0]?.effectivePerWorkingHour)).toBe(true);
  });
});

describe('arrangementTypeLabel', () => {
  it('covers all arrangement types', () => {
    expect(arrangementTypeLabel('employed')).toBe('Employed');
    expect(arrangementTypeLabel('selfEmployed')).toBe('Self-employed');
    expect(arrangementTypeLabel('contractor')).toBe('Contractor');
    expect(arrangementTypeLabel('gigPlatform')).toBe('Gig / platform');
    expect(arrangementTypeLabel('hybrid')).toBe('Hybrid');
    expect(arrangementTypeLabel('custom')).toBe('Custom');
  });
});
