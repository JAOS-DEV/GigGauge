import { describe, expect, it } from 'vitest';
import { annualiseAmount, buildPeriodBreakdown } from './periods';
import { CalculationInputError } from './validation';
import type { WorkPattern } from './types';

const briefPattern: WorkPattern = {
  workingWeeksPerYear: 39,
  workingDaysPerWeek: 6,
  workingHoursPerWeek: 50,
};

const fullTimePattern: WorkPattern = {
  workingWeeksPerYear: 52,
  workingDaysPerWeek: 5,
  workingHoursPerWeek: 40,
};

describe('annualiseAmount', () => {
  it('returns annual amounts unchanged', () => {
    expect(annualiseAmount(40_000, 'annual', briefPattern)).toBe(40_000);
  });

  it('multiplies monthly amounts by 12', () => {
    expect(annualiseAmount(2_000, 'monthly', fullTimePattern)).toBe(24_000);
  });

  it('multiplies weekly amounts by working weeks', () => {
    expect(annualiseAmount(1_000, 'weekly', briefPattern)).toBe(39_000);
  });

  it('multiplies daily amounts by working weeks × days', () => {
    expect(annualiseAmount(100, 'daily', briefPattern)).toBe(100 * 39 * 6);
  });

  it('multiplies hourly amounts by working weeks × hours', () => {
    expect(annualiseAmount(20, 'hourly', briefPattern)).toBe(20 * 39 * 50);
  });

  it('rejects non-finite amounts', () => {
    expect(() => annualiseAmount(Number.NaN, 'annual', briefPattern)).toThrow(
      CalculationInputError,
    );
    expect(() => annualiseAmount(Number.POSITIVE_INFINITY, 'annual', briefPattern)).toThrow(
      CalculationInputError,
    );
  });
});

describe('buildPeriodBreakdown', () => {
  it('matches the product-brief worked example (£40,000 / 39 weeks / 6 days / 50 hours)', () => {
    const breakdown = buildPeriodBreakdown(40_000, briefPattern);
    expect(breakdown.annual).toBe(40_000);
    expect(breakdown.calendarMonthly).toBeCloseTo(3_333.33, 2);
    expect(breakdown.workingWeekly).toBeCloseTo(1_025.64, 2);
    expect(breakdown.workingDaily).toBeCloseTo(170.94, 2);
    expect(breakdown.workingHourly).toBeCloseTo(20.51, 2);
    expect(breakdown.weeksOff).toBe(13);
  });

  it('retains full precision internally', () => {
    const breakdown = buildPeriodBreakdown(40_000, briefPattern);
    expect(breakdown.workingWeekly).toBe(40_000 / 39);
    expect(breakdown.workingHourly).toBe(40_000 / (39 * 50));
  });

  it('never produces NaN or Infinity because degenerate patterns are rejected', () => {
    expect(() => buildPeriodBreakdown(40_000, { ...briefPattern, workingHoursPerWeek: 0 })).toThrow(
      CalculationInputError,
    );
    expect(() => buildPeriodBreakdown(40_000, { ...briefPattern, workingDaysPerWeek: 0 })).toThrow(
      CalculationInputError,
    );
    expect(() => buildPeriodBreakdown(40_000, { ...briefPattern, workingWeeksPerYear: 0 })).toThrow(
      CalculationInputError,
    );
  });

  it('rejects out-of-range work patterns', () => {
    expect(() => buildPeriodBreakdown(1_000, { ...briefPattern, workingWeeksPerYear: 53 })).toThrow(
      CalculationInputError,
    );
    expect(() => buildPeriodBreakdown(1_000, { ...briefPattern, workingDaysPerWeek: 8 })).toThrow(
      CalculationInputError,
    );
    expect(() =>
      buildPeriodBreakdown(1_000, { ...briefPattern, workingHoursPerWeek: 169 }),
    ).toThrow(CalculationInputError);
  });

  it('allows negative annual amounts (losses) to be broken down', () => {
    const breakdown = buildPeriodBreakdown(-5_200, fullTimePattern);
    expect(breakdown.workingWeekly).toBeCloseTo(-100, 10);
  });
});
