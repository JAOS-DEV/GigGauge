import { z } from 'zod';
import type { KeyValueStorage } from './persistence';

export const EARNINGS_TRACKER_KEY = 'giggauge:earningsTracker';
export const EARNINGS_TRACKER_BACKUP_KEY = 'giggauge:earningsTracker:backup';

/** Tracker envelope schemaVersion (independent of scenario / library versions). */
export const EARNINGS_TRACKER_SCHEMA_VERSION = 1;

export interface EarningsEntry {
  id: string;
  /** Calendar date as YYYY-MM-DD. */
  date: string;
  /** Cash actually received in GBP; must be finite and > 0. */
  amount: number;
  note?: string;
  /** Optional saved-library entry id for display context only. */
  savedScenarioId?: string;
}

export interface EarningsTrackerEnvelope {
  schemaVersion: number;
  entries: EarningsEntry[];
}

export interface EarningsTotals {
  week: number;
  month: number;
  year: number;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number);
    if (y === undefined || m === undefined || d === undefined) {
      return false;
    }
    const parsed = new Date(y, m - 1, d);
    return (
      parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
    );
  }, 'Date is not a valid calendar day');

const entrySchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  amount: z.number().finite().positive(),
  note: z.string().optional(),
  savedScenarioId: z.string().optional(),
});

const envelopeSchema = z.object({
  schemaVersion: z.number(),
  entries: z.array(z.unknown()),
});

export type EarningsEntryInput = {
  date: string;
  amount: number;
  note?: string;
  savedScenarioId?: string;
};

export class EarningsTrackerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EarningsTrackerValidationError';
  }
}

function newId(): string {
  return `earn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function backupRawValue(storage: KeyValueStorage, raw: string): void {
  try {
    storage.setItem(EARNINGS_TRACKER_BACKUP_KEY, raw);
  } catch {
    // Best-effort.
  }
}

function parseEntry(raw: unknown): EarningsEntry | null {
  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const note = parsed.data.note?.trim();
  return {
    id: parsed.data.id,
    date: parsed.data.date,
    amount: parsed.data.amount,
    note: note ? note : undefined,
    savedScenarioId: parsed.data.savedScenarioId,
  };
}

function normaliseInput(input: EarningsEntryInput): Omit<EarningsEntry, 'id'> {
  const parsed = entrySchema
    .omit({ id: true })
    .safeParse({
      date: input.date,
      amount: input.amount,
      note: input.note,
      savedScenarioId: input.savedScenarioId,
    });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new EarningsTrackerValidationError(issue?.message ?? 'Invalid earnings entry');
  }
  const note = parsed.data.note?.trim();
  return {
    date: parsed.data.date,
    amount: parsed.data.amount,
    note: note ? note : undefined,
    savedScenarioId: parsed.data.savedScenarioId,
  };
}

/**
 * Loads tracker entries. Corrupt or newer-than-supported envelopes are backed
 * up and return [] — never silently discard without a backup attempt.
 */
export function loadEarningsEntries(storage: KeyValueStorage): EarningsEntry[] {
  let raw: string | null;
  try {
    raw = storage.getItem(EARNINGS_TRACKER_KEY);
  } catch {
    return [];
  }
  if (raw === null) {
    return [];
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    backupRawValue(storage, raw);
    return [];
  }

  const envelope = envelopeSchema.safeParse(parsedJson);
  if (!envelope.success) {
    backupRawValue(storage, raw);
    return [];
  }

  if (envelope.data.schemaVersion > EARNINGS_TRACKER_SCHEMA_VERSION) {
    backupRawValue(storage, raw);
    return [];
  }

  // v1: no migrations yet; future versions bump schemaVersion and migrate here.
  return envelope.data.entries
    .map(parseEntry)
    .filter((entry): entry is EarningsEntry => entry !== null);
}

export function saveEarningsEntries(storage: KeyValueStorage, entries: EarningsEntry[]): void {
  try {
    const envelope: EarningsTrackerEnvelope = {
      schemaVersion: EARNINGS_TRACKER_SCHEMA_VERSION,
      entries,
    };
    storage.setItem(EARNINGS_TRACKER_KEY, JSON.stringify(envelope));
  } catch {
    // Quota / unavailable store — in-memory UI state still works for the session.
  }
}

export function addEarningsEntry(
  storage: KeyValueStorage,
  input: EarningsEntryInput,
): EarningsEntry {
  const normalised = normaliseInput(input);
  const entry: EarningsEntry = { id: newId(), ...normalised };
  const entries = loadEarningsEntries(storage);
  entries.unshift(entry);
  saveEarningsEntries(storage, entries);
  return entry;
}

export function updateEarningsEntry(
  storage: KeyValueStorage,
  id: string,
  input: EarningsEntryInput,
): EarningsEntry {
  const normalised = normaliseInput(input);
  const entries = loadEarningsEntries(storage);
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new EarningsTrackerValidationError('Earnings entry not found');
  }
  const updated: EarningsEntry = { id, ...normalised };
  entries[index] = updated;
  saveEarningsEntries(storage, entries);
  return updated;
}

export function deleteEarningsEntry(storage: KeyValueStorage, id: string): void {
  const entries = loadEarningsEntries(storage).filter((entry) => entry.id !== id);
  saveEarningsEntries(storage, entries);
}

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Monday-start calendar week (en-GB convention) containing `reference`.
 * Returns inclusive YYYY-MM-DD bounds [start, end].
 */
export function calendarWeekBounds(reference: Date): { start: string; end: string } {
  const day = reference.getDay(); // 0 = Sunday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  start.setDate(start.getDate() - daysFromMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

/** Sums amounts for the calendar week / month / year containing `reference`. */
export function summariseEarningsTotals(
  entries: ReadonlyArray<EarningsEntry>,
  reference: Date = new Date(),
): EarningsTotals {
  const { start: weekStart, end: weekEnd } = calendarWeekBounds(reference);
  const month = reference.getMonth();
  const year = reference.getFullYear();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const yearPrefix = String(year);

  let week = 0;
  let monthTotal = 0;
  let yearTotal = 0;

  for (const entry of entries) {
    if (entry.date >= weekStart && entry.date <= weekEnd) {
      week += entry.amount;
    }
    if (entry.date.startsWith(monthPrefix)) {
      monthTotal += entry.amount;
    }
    if (entry.date.startsWith(yearPrefix)) {
      yearTotal += entry.amount;
    }
  }

  return { week, month: monthTotal, year: yearTotal };
}

/** Exported for tests that need a stable local Date from YYYY-MM-DD. */
export function localDateFromIso(isoDate: string): Date {
  return parseLocalDate(isoDate);
}
