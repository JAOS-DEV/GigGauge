import { CalculationInputError } from '../calculations/validation';

const currencyGBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const currencyGBPSigned = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  signDisplay: 'always',
});

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new CalculationInputError(`${label} must be a finite number, received ${value}`);
  }
}

export function formatCurrencyGBP(amount: number): string {
  assertFinite(amount, 'Currency amount');
  return currencyGBP.format(amount);
}

/** Formats a signed difference, e.g. +£4,750.00 or -£3,200.00. */
export function formatDifference(amount: number): string {
  assertFinite(amount, 'Difference amount');
  return currencyGBPSigned.format(amount);
}

/** Formats a fraction (0.253) as a percentage string (25.3%). */
export function formatPercent(fraction: number, maximumFractionDigits = 1): string {
  assertFinite(fraction, 'Percentage fraction');
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    maximumFractionDigits,
  }).format(fraction);
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  assertFinite(value, 'Number');
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits }).format(value);
}

export function formatWeeks(weeks: number): string {
  assertFinite(weeks, 'Weeks');
  return `${formatNumber(weeks)} ${weeks === 1 ? 'week' : 'weeks'}`;
}

export function formatHours(hours: number): string {
  assertFinite(hours, 'Hours');
  return `${formatNumber(hours)} ${hours === 1 ? 'hour' : 'hours'}`;
}
