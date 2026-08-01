// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createDefaultScenario } from './defaultScenario';
import type { KeyValueStorage } from './persistence';
import {
  deleteSavedScenario,
  duplicateSavedScenario,
  exportSavedScenariosJson,
  loadSavedScenarios,
  materialiseSavedEntryForLoad,
  mergeImportedSavedScenarios,
  promptAndSaveActiveDraftToLibrary,
  renameSavedScenario,
  saveActiveDraftToLibrary,
  SAVED_SCENARIOS_SOFT_CAP,
  saveSavedScenarios,
} from './savedScenarios';

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

describe('savedScenarios', () => {
  it('saves a copy of the active draft without changing its id on the original', () => {
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    scenario.name = 'Gig plan';
    scenario.goal.amount = 30_000;
    const originalId = scenario.id;
    const quickForm = { workingWeeks: '48', targetAmount: '30000' };

    const result = saveActiveDraftToLibrary(storage, scenario, quickForm);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.scenario.id).not.toBe(originalId);
    expect(result.entry.id).not.toBe(result.entry.scenario.id);
    expect(result.entry.quickForm?.workingWeeks).toBe('48');
    expect(scenario.id).toBe(originalId);

    const loaded = loadSavedScenarios(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.scenario.name).toBe('Gig plan');
    expect(scenario.name).toBe('Gig plan');
  });

  it('uses an explicit library name without changing the active draft name', () => {
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    scenario.name = 'Quick estimate';

    const result = saveActiveDraftToLibrary(storage, scenario, undefined, ' Summer gig ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.scenario.name).toBe('Summer gig');
    expect(scenario.name).toBe('Quick estimate');
  });

  it('promptAndSaveActiveDraftToLibrary cancels without writing', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    const result = promptAndSaveActiveDraftToLibrary(storage, scenario);
    expect(result.status).toBe('cancelled');
    expect(loadSavedScenarios(storage)).toHaveLength(0);
    promptSpy.mockRestore();
  });

  it('renames, duplicates and deletes entries', () => {
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    scenario.name = 'Original';
    const saved = saveActiveDraftToLibrary(storage, scenario);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    const renamed = renameSavedScenario(storage, saved.entry.id, 'Renamed');
    expect(renamed[0]?.scenario.name).toBe('Renamed');

    const duplicated = duplicateSavedScenario(storage, saved.entry.id);
    expect(duplicated.ok).toBe(true);
    if (!duplicated.ok) return;
    expect(duplicated.entry.scenario.name).toBe('Copy of Renamed');
    expect(loadSavedScenarios(storage)).toHaveLength(2);

    const remaining = deleteSavedScenario(storage, duplicated.entry.id);
    expect(remaining).toHaveLength(1);
  });

  it('blocks saves at the soft cap', () => {
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    for (let index = 0; index < SAVED_SCENARIOS_SOFT_CAP; index += 1) {
      scenario.name = `Plan ${index}`;
      const result = saveActiveDraftToLibrary(storage, scenario);
      expect(result.ok).toBe(true);
    }
    const blocked = saveActiveDraftToLibrary(storage, scenario);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('full');
    }
    expect(loadSavedScenarios(storage)).toHaveLength(SAVED_SCENARIOS_SOFT_CAP);
  });

  it('exports and merges import with new ids without wiping existing entries', () => {
    const storage = makeMemoryStorage();
    const first = createDefaultScenario();
    first.name = 'First';
    saveActiveDraftToLibrary(storage, first);

    const exportJson = exportSavedScenariosJson(loadSavedScenarios(storage));
    expect(exportJson).toContain('giggauge-saved-scenarios');

    const second = createDefaultScenario();
    second.name = 'Second';
    saveActiveDraftToLibrary(storage, second);
    expect(loadSavedScenarios(storage)).toHaveLength(2);

    const merged = mergeImportedSavedScenarios(storage, exportJson);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.imported).toBe(1);
    expect(merged.entries.length).toBe(3);
    const names = merged.entries.map((entry) => entry.scenario.name);
    expect(names).toContain('First');
    expect(names).toContain('Second');
  });

  it('rejects invalid import JSON', () => {
    const storage = makeMemoryStorage();
    const result = mergeImportedSavedScenarios(storage, '{not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/valid JSON/i);
    }
  });

  it('materialises a load copy with a fresh scenario id', () => {
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    scenario.name = 'Load me';
    const saved = saveActiveDraftToLibrary(storage, scenario, { workingWeeks: '40' });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const loaded = materialiseSavedEntryForLoad(saved.entry);
    expect(loaded.scenario.id).not.toBe(saved.entry.scenario.id);
    expect(loaded.scenario.name).toBe('Load me');
    expect(loaded.quickForm?.workingWeeks).toBe('40');
  });

  it('survives round-trip through saveSavedScenarios', () => {
    const storage = makeMemoryStorage();
    const scenario = createDefaultScenario();
    scenario.name = 'Persist';
    const saved = saveActiveDraftToLibrary(storage, scenario);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    saveSavedScenarios(storage, saved.entries);
    expect(loadSavedScenarios(storage)[0]?.scenario.name).toBe('Persist');
  });
});
