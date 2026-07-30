import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SCENARIO_BACKUP_KEY,
  ACTIVE_SCENARIO_KEY,
  loadActiveState,
  saveActiveState,
  type KeyValueStorage,
} from './persistence';
import { createDefaultScenario, CURRENT_SCHEMA_VERSION } from './defaultScenario';

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

describe('saveActiveState / loadActiveState', () => {
  it('round-trips a scenario and quick-form values', () => {
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    saveActiveState(storage, scenario, { targetAmount: '40000', includeExampleCosts: true });

    const loaded = loadActiveState(storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.scenario).toEqual(scenario);
    expect(loaded?.quickForm).toEqual({ targetAmount: '40000', includeExampleCosts: true });

    const raw = JSON.parse(storage.data.get(ACTIVE_SCENARIO_KEY) ?? '');
    expect(raw.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('returns null when nothing is stored', () => {
    expect(loadActiveState(makeMemoryStorage())).toBeNull();
  });

  it('backs up corrupt JSON before starting fresh', () => {
    const storage = makeMemoryStorage();
    storage.setItem(ACTIVE_SCENARIO_KEY, '{not json');

    expect(loadActiveState(storage)).toBeNull();
    expect(storage.data.get(ACTIVE_SCENARIO_BACKUP_KEY)).toBe('{not json');
  });

  it('backs up data from an unknown newer schema version', () => {
    const storage = makeMemoryStorage();
    const newer = JSON.stringify({ schemaVersion: 99, scenario: { future: true } });
    storage.setItem(ACTIVE_SCENARIO_KEY, newer);

    expect(loadActiveState(storage)).toBeNull();
    expect(storage.data.get(ACTIVE_SCENARIO_BACKUP_KEY)).toBe(newer);
  });

  it('backs up structurally invalid scenarios', () => {
    const storage = makeMemoryStorage();
    const invalid = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      scenario: { name: 'missing everything else' },
    });
    storage.setItem(ACTIVE_SCENARIO_KEY, invalid);

    expect(loadActiveState(storage)).toBeNull();
    expect(storage.data.get(ACTIVE_SCENARIO_BACKUP_KEY)).toBe(invalid);
  });

  it('swallows storage failures on save', () => {
    const throwingStorage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(() => saveActiveState(throwingStorage, createDefaultScenario())).not.toThrow();
  });
});
