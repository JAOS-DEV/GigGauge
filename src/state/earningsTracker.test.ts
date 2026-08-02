import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from './persistence';
import {
  addEarningsEntry,
  calendarWeekBounds,
  deleteEarningsEntry,
  EARNINGS_TRACKER_BACKUP_KEY,
  EARNINGS_TRACKER_KEY,
  EARNINGS_TRACKER_SCHEMA_VERSION,
  EarningsTrackerValidationError,
  loadEarningsEntries,
  localDateFromIso,
  saveEarningsEntries,
  summariseEarningsTotals,
  updateEarningsEntry,
} from './earningsTracker';

function makeMemoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('earningsTracker persistence', () => {
  it('adds, updates and deletes entries with versioned storage', () => {
    const storage = makeMemoryStorage();
    const created = addEarningsEntry(storage, {
      date: '2026-08-02',
      amount: 120.5,
      note: '  Saturday shift  ',
    });
    expect(created.note).toBe('Saturday shift');
    expect(loadEarningsEntries(storage)).toHaveLength(1);

    const raw = JSON.parse(storage.data.get(EARNINGS_TRACKER_KEY)!) as {
      schemaVersion: number;
    };
    expect(raw.schemaVersion).toBe(EARNINGS_TRACKER_SCHEMA_VERSION);

    updateEarningsEntry(storage, created.id, {
      date: '2026-08-03',
      amount: 200,
      savedScenarioId: 'lib-1',
    });
    expect(loadEarningsEntries(storage)[0]?.amount).toBe(200);
    expect(loadEarningsEntries(storage)[0]?.savedScenarioId).toBe('lib-1');

    deleteEarningsEntry(storage, created.id);
    expect(loadEarningsEntries(storage)).toHaveLength(0);
  });

  it('rejects zero, negative and invalid dates', () => {
    const storage = makeMemoryStorage();
    expect(() => addEarningsEntry(storage, { date: '2026-08-02', amount: 0 })).toThrow(
      EarningsTrackerValidationError,
    );
    expect(() => addEarningsEntry(storage, { date: '2026-08-02', amount: -5 })).toThrow(
      EarningsTrackerValidationError,
    );
    expect(() => addEarningsEntry(storage, { date: '02-08-2026', amount: 10 })).toThrow(
      EarningsTrackerValidationError,
    );
    expect(() => addEarningsEntry(storage, { date: '2026-02-30', amount: 10 })).toThrow(
      EarningsTrackerValidationError,
    );
  });

  it('backs up newer schema versions and returns empty', () => {
    const storage = makeMemoryStorage();
    storage.setItem(
      EARNINGS_TRACKER_KEY,
      JSON.stringify({ schemaVersion: 99, entries: [{ id: 'x', date: '2026-01-01', amount: 1 }] }),
    );
    expect(loadEarningsEntries(storage)).toEqual([]);
    expect(storage.data.get(EARNINGS_TRACKER_BACKUP_KEY)).toBeTruthy();
  });

  it('backs up corrupt JSON', () => {
    const storage = makeMemoryStorage();
    storage.setItem(EARNINGS_TRACKER_KEY, '{not-json');
    expect(loadEarningsEntries(storage)).toEqual([]);
    expect(storage.data.get(EARNINGS_TRACKER_BACKUP_KEY)).toBe('{not-json');
  });
});

describe('calendar week and totals', () => {
  it('uses Monday-start weeks (en-GB)', () => {
    // Sunday 2 Aug 2026 → week Mon 27 Jul – Sun 2 Aug
    const sunday = localDateFromIso('2026-08-02');
    expect(calendarWeekBounds(sunday)).toEqual({ start: '2026-07-27', end: '2026-08-02' });
    // Wednesday 29 Jul 2026 → same week
    expect(calendarWeekBounds(localDateFromIso('2026-07-29'))).toEqual({
      start: '2026-07-27',
      end: '2026-08-02',
    });
  });

  it('summarises week, month and year totals', () => {
    const storage = makeMemoryStorage();
    saveEarningsEntries(storage, [
      { id: '1', date: '2026-07-28', amount: 10 }, // this week
      { id: '2', date: '2026-08-01', amount: 20 }, // this week + August
      { id: '3', date: '2026-08-10', amount: 40 }, // August + year, not this week
      { id: '4', date: '2025-12-31', amount: 100 }, // prior year
    ]);
    const entries = loadEarningsEntries(storage);
    const totals = summariseEarningsTotals(entries, localDateFromIso('2026-08-02'));
    expect(totals.week).toBe(30);
    expect(totals.month).toBe(60);
    expect(totals.year).toBe(70);
  });
});
