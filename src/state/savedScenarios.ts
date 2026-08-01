import { z } from 'zod';
import type { GigGaugeScenario } from '../calculations/types';
import { migrateStoredScenario } from './migrations';
import { CURRENT_SCHEMA_VERSION } from './defaultScenario';
import type { KeyValueStorage, StoredQuickForm } from './persistence';

/** Soft cap on library size (Spec 6). */
export const SAVED_SCENARIOS_SOFT_CAP = 20;

export const SAVED_SCENARIOS_KEY = 'giggauge:savedScenarios';

/**
 * Library envelope schemaVersion (independent of active-draft scenario schemaVersion).
 * Export files use the same version on the `giggauge-saved-scenarios` document.
 */
export const SAVED_LIBRARY_SCHEMA_VERSION = 1;

export const SAVED_EXPORT_FORMAT = 'giggauge-saved-scenarios' as const;

export interface SavedScenarioEntry {
  /** Library entry id (distinct from scenario.id). */
  id: string;
  /** ISO timestamp when this entry was last written. */
  savedAt: string;
  scenario: GigGaugeScenario;
  quickForm?: StoredQuickForm;
}

/**
 * Exported JSON document shape (whole library).
 * Import also accepts `{ entries: [...] }` or a bare `SavedScenarioEntry[]`
 * for flexibility; all imported items receive new ids.
 */
export interface SavedScenariosExportDocument {
  format: typeof SAVED_EXPORT_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  entries: SavedScenarioEntry[];
}

const storedQuickFormSchema = z.record(z.string(), z.union([z.string(), z.boolean()]));

const libraryEnvelopeSchema = z.object({
  schemaVersion: z.number(),
  entries: z.array(z.unknown()),
});

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepCloneScenario(scenario: GigGaugeScenario): GigGaugeScenario {
  return JSON.parse(JSON.stringify(scenario)) as GigGaugeScenario;
}

function deepCloneQuickForm(quickForm: StoredQuickForm | undefined): StoredQuickForm | undefined {
  if (quickForm === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(quickForm)) as StoredQuickForm;
}

function parseEntry(raw: unknown): SavedScenarioEntry | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.savedAt !== 'string') {
    return null;
  }
  const scenarioVersion =
    typeof record.scenario === 'object' &&
    record.scenario !== null &&
    typeof (record.scenario as { schemaVersion?: unknown }).schemaVersion === 'number'
      ? ((record.scenario as { schemaVersion: number }).schemaVersion)
      : CURRENT_SCHEMA_VERSION;

  const migrated = migrateStoredScenario(scenarioVersion, record.scenario);
  if (!migrated.ok) {
    return null;
  }

  let quickForm: StoredQuickForm | undefined;
  if (record.quickForm !== undefined) {
    const parsedQuick = storedQuickFormSchema.safeParse(record.quickForm);
    if (!parsedQuick.success) {
      return null;
    }
    quickForm = parsedQuick.data;
  }

  return {
    id: record.id,
    savedAt: record.savedAt,
    scenario: migrated.scenario,
    quickForm,
  };
}

/** Load the saved-scenarios library. Corrupt data returns an empty list (never throws). */
export function loadSavedScenarios(storage: KeyValueStorage): SavedScenarioEntry[] {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVED_SCENARIOS_KEY);
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
    return [];
  }

  const envelope = libraryEnvelopeSchema.safeParse(parsedJson);
  if (!envelope.success) {
    return [];
  }
  if (envelope.data.schemaVersion > SAVED_LIBRARY_SCHEMA_VERSION) {
    return [];
  }

  const entries: SavedScenarioEntry[] = [];
  for (const item of envelope.data.entries) {
    const entry = parseEntry(item);
    if (entry) {
      entries.push(entry);
    }
  }
  return entries;
}

/** Persist the library. Failures (quota, unavailable store) are swallowed. */
export function saveSavedScenarios(storage: KeyValueStorage, entries: SavedScenarioEntry[]): void {
  try {
    storage.setItem(
      SAVED_SCENARIOS_KEY,
      JSON.stringify({
        schemaVersion: SAVED_LIBRARY_SCHEMA_VERSION,
        entries,
      }),
    );
  } catch {
    // localStorage may be full or unavailable.
  }
}

export type SaveToLibraryResult =
  | { ok: true; entry: SavedScenarioEntry; entries: SavedScenarioEntry[] }
  | { ok: false; reason: 'full' | 'notFound'; entries: SavedScenarioEntry[] };

/** Resolve the display name for a new library entry (active draft name unchanged). */
export function resolveLibrarySaveName(
  scenarioName: string,
  libraryName?: string,
): string {
  const fromPrompt = libraryName?.trim();
  if (fromPrompt) {
    return fromPrompt;
  }
  const fromScenario = scenarioName.trim();
  return fromScenario === '' ? 'Saved plan' : fromScenario;
}

/** Copy the active draft into the library (active draft unchanged). */
export function saveActiveDraftToLibrary(
  storage: KeyValueStorage,
  scenario: GigGaugeScenario,
  quickForm?: StoredQuickForm,
  libraryName?: string,
): SaveToLibraryResult {
  const entries = loadSavedScenarios(storage);
  if (entries.length >= SAVED_SCENARIOS_SOFT_CAP) {
    return { ok: false, reason: 'full', entries };
  }

  const name = resolveLibrarySaveName(scenario.name, libraryName);
  const cloned = deepCloneScenario(scenario);
  cloned.id = newId('scenario');
  cloned.name = name;

  const entry: SavedScenarioEntry = {
    id: newId('saved'),
    savedAt: new Date().toISOString(),
    scenario: cloned,
    quickForm: deepCloneQuickForm(quickForm),
  };

  const next = [entry, ...entries];
  saveSavedScenarios(storage, next);
  return { ok: true, entry, entries: next };
}

export function renameSavedScenario(
  storage: KeyValueStorage,
  entryId: string,
  name: string,
): SavedScenarioEntry[] {
  const trimmed = name.trim() === '' ? 'Saved plan' : name.trim();
  const entries = loadSavedScenarios(storage).map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }
    return {
      ...entry,
      savedAt: new Date().toISOString(),
      scenario: { ...entry.scenario, name: trimmed },
    };
  });
  saveSavedScenarios(storage, entries);
  return entries;
}

export function duplicateSavedScenario(
  storage: KeyValueStorage,
  entryId: string,
): SaveToLibraryResult {
  const entries = loadSavedScenarios(storage);
  if (entries.length >= SAVED_SCENARIOS_SOFT_CAP) {
    return { ok: false, reason: 'full', entries };
  }
  const source = entries.find((entry) => entry.id === entryId);
  if (!source) {
    return { ok: false, reason: 'notFound', entries };
  }

  const cloned = deepCloneScenario(source.scenario);
  cloned.id = newId('scenario');
  cloned.name = source.scenario.name.startsWith('Copy of ')
    ? source.scenario.name
    : `Copy of ${source.scenario.name}`;

  const entry: SavedScenarioEntry = {
    id: newId('saved'),
    savedAt: new Date().toISOString(),
    scenario: cloned,
    quickForm: deepCloneQuickForm(source.quickForm),
  };

  const next = [entry, ...entries];
  saveSavedScenarios(storage, next);
  return { ok: true, entry, entries: next };
}

export function deleteSavedScenario(
  storage: KeyValueStorage,
  entryId: string,
): SavedScenarioEntry[] {
  const entries = loadSavedScenarios(storage).filter((entry) => entry.id !== entryId);
  saveSavedScenarios(storage, entries);
  return entries;
}

/** Build a deep copy suitable for replacing the active draft. */
export function materialiseSavedEntryForLoad(entry: SavedScenarioEntry): {
  scenario: GigGaugeScenario;
  quickForm?: StoredQuickForm;
} {
  const scenario = deepCloneScenario(entry.scenario);
  scenario.id = newId('scenario');
  return {
    scenario,
    quickForm: deepCloneQuickForm(entry.quickForm),
  };
}

export function exportSavedScenariosJson(entries: SavedScenarioEntry[]): string {
  const document: SavedScenariosExportDocument = {
    format: SAVED_EXPORT_FORMAT,
    schemaVersion: SAVED_LIBRARY_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

export type ImportMergeResult =
  | {
      ok: true;
      entries: SavedScenarioEntry[];
      imported: number;
      skipped: number;
      capped: boolean;
    }
  | { ok: false; error: string; entries: SavedScenarioEntry[] };

function extractImportCandidates(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.entries)) {
    if (
      record.format !== undefined &&
      record.format !== SAVED_EXPORT_FORMAT
    ) {
      return null;
    }
    return record.entries;
  }
  if (typeof record.id === 'string' && record.scenario !== undefined) {
    return [record];
  }
  return null;
}

/**
 * Merge imported JSON into the library. Assigns new entry and scenario ids.
 * Does not wipe existing saves. Stops adding when the soft cap is reached.
 */
export function mergeImportedSavedScenarios(
  storage: KeyValueStorage,
  rawJson: string,
): ImportMergeResult {
  const existing = loadSavedScenarios(storage);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.', entries: existing };
  }

  const candidates = extractImportCandidates(parsed);
  if (candidates === null) {
    return {
      ok: false,
      error: 'That file does not look like a GigGauge saved-scenarios export.',
      entries: existing,
    };
  }

  const next = [...existing];
  let imported = 0;
  let skipped = 0;
  let capped = false;

  for (const candidate of candidates) {
    if (next.length >= SAVED_SCENARIOS_SOFT_CAP) {
      capped = true;
      skipped += 1;
      continue;
    }
    const entry = parseEntry(candidate);
    if (!entry) {
      skipped += 1;
      continue;
    }
    const scenario = deepCloneScenario(entry.scenario);
    scenario.id = newId('scenario');
    next.unshift({
      id: newId('saved'),
      savedAt: new Date().toISOString(),
      scenario,
      quickForm: deepCloneQuickForm(entry.quickForm),
    });
    imported += 1;
  }

  if (imported === 0 && skipped > 0 && existing.length === next.length) {
    return {
      ok: false,
      error: 'No valid scenarios could be imported from that file.',
      entries: existing,
    };
  }

  saveSavedScenarios(storage, next);
  return { ok: true, entries: next, imported, skipped, capped };
}
