import { describe, expect, it } from 'vitest';
import { migrateStoredScenario } from './migrations';
import { createDefaultScenario, CURRENT_SCHEMA_VERSION } from './defaultScenario';

describe('migrateStoredScenario', () => {
  it('accepts a valid current-version scenario', () => {
    const scenario = createDefaultScenario();
    const result = migrateStoredScenario(CURRENT_SCHEMA_VERSION, scenario);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scenario).toEqual(scenario);
    }
  });

  it('rejects versions newer than the app supports', () => {
    const result = migrateStoredScenario(CURRENT_SCHEMA_VERSION + 1, createDefaultScenario());
    expect(result.ok).toBe(false);
  });

  it('rejects invalid version numbers', () => {
    expect(migrateStoredScenario(0, {}).ok).toBe(false);
    expect(migrateStoredScenario(Number.NaN, {}).ok).toBe(false);
  });

  it('rejects data that fails scenario validation', () => {
    const result = migrateStoredScenario(CURRENT_SCHEMA_VERSION, { nonsense: true });
    expect(result.ok).toBe(false);
  });
});
