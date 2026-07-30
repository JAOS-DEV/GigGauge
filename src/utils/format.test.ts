import { describe, expect, it } from 'vitest';
import {
  formatCurrencyGBP,
  formatDifference,
  formatHours,
  formatNumber,
  formatPercent,
  formatWeeks,
} from './format';
import { CalculationInputError } from '../calculations/validation';

describe('formatCurrencyGBP', () => {
  it('formats using en-GB GBP currency style', () => {
    expect(formatCurrencyGBP(1_234.5)).toBe('£1,234.50');
    expect(formatCurrencyGBP(0)).toBe('£0.00');
    expect(formatCurrencyGBP(-3_200)).toBe('-£3,200.00');
  });

  it('rejects non-finite values', () => {
    expect(() => formatCurrencyGBP(Number.NaN)).toThrow(CalculationInputError);
    expect(() => formatCurrencyGBP(Number.POSITIVE_INFINITY)).toThrow(CalculationInputError);
  });
});

describe('formatDifference', () => {
  it('always shows the sign', () => {
    expect(formatDifference(4_750)).toBe('+£4,750.00');
    expect(formatDifference(-3_200)).toBe('-£3,200.00');
  });
});

describe('formatPercent', () => {
  it('formats fractions as percentages', () => {
    expect(formatPercent(0.25)).toBe('25%');
    expect(formatPercent(0.253)).toBe('25.3%');
    expect(formatPercent(0.2534, 2)).toBe('25.34%');
  });
});

describe('formatNumber', () => {
  it('formats with en-GB grouping', () => {
    expect(formatNumber(1_234.567)).toBe('1,234.57');
    expect(formatNumber(1_000_000, 0)).toBe('1,000,000');
  });
});

describe('formatWeeks and formatHours', () => {
  it('pluralises correctly', () => {
    expect(formatWeeks(13)).toBe('13 weeks');
    expect(formatWeeks(1)).toBe('1 week');
    expect(formatHours(50)).toBe('50 hours');
    expect(formatHours(1)).toBe('1 hour');
  });
});
