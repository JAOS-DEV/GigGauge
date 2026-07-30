import { z } from 'zod';
import type { GigGaugeScenario } from '../calculations/types';
import { migrateStoredScenario } from './migrations';
import { CURRENT_SCHEMA_VERSION } from './defaultScenario';

export const ACTIVE_SCENARIO_KEY = 'giggauge:activeScenario';
export const ACTIVE_SCENARIO_BACKUP_KEY = 'giggauge:activeScenario:backup';

/** Minimal storage contract so tests can supply an in-memory implementation. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Raw quick-estimate form values are persisted alongside the scenario so the
 * form restores exactly what the user typed (including chosen periods that
 * the annualised scenario model cannot represent). The scenario remains the
 * authoritative model for calculations.
 */
const storedQuickFormSchema = z.record(z.string(), z.union([z.string(), z.boolean()]));

export type StoredQuickForm = z.infer<typeof storedQuickFormSchema>;

const envelopeSchema = z.object({
  schemaVersion: z.number(),
  scenario: z.unknown(),
  quickForm: storedQuickFormSchema.optional(),
});

export interface LoadedActiveState {
  scenario: GigGaugeScenario;
  quickForm?: StoredQuickForm;
}

/** Returns window.localStorage when it is usable, otherwise null (e.g. blocked in private browsing). */
export function getSafeLocalStorage(): KeyValueStorage | null {
  try {
    const probeKey = 'giggauge:probe';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function backupRawValue(storage: KeyValueStorage, raw: string): void {
  try {
    storage.setItem(ACTIVE_SCENARIO_BACKUP_KEY, raw);
  } catch {
    // Backup is best-effort; a full or unavailable store must not crash the app.
  }
}

/**
 * Loads the persisted active draft. Corrupt, invalid or unknown-version data
 * is copied to the backup key and null is returned so the caller starts a
 * fresh draft — stored data is never silently discarded.
 */
export function loadActiveState(storage: KeyValueStorage): LoadedActiveState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(ACTIVE_SCENARIO_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    backupRawValue(storage, raw);
    return null;
  }

  const envelope = envelopeSchema.safeParse(parsedJson);
  if (!envelope.success) {
    backupRawValue(storage, raw);
    return null;
  }

  const migrated = migrateStoredScenario(envelope.data.schemaVersion, envelope.data.scenario);
  if (!migrated.ok) {
    backupRawValue(storage, raw);
    return null;
  }

  return { scenario: migrated.scenario, quickForm: envelope.data.quickForm };
}

/** Saves the active draft. Failures (quota, unavailable store) are swallowed. */
export function saveActiveState(
  storage: KeyValueStorage,
  scenario: GigGaugeScenario,
  quickForm?: StoredQuickForm,
): void {
  try {
    storage.setItem(
      ACTIVE_SCENARIO_KEY,
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, scenario, quickForm }),
    );
  } catch {
    // localStorage may be full or unavailable; the in-memory state still works.
  }
}
