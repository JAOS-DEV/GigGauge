import type { GigGaugeScenario } from '../calculations/types';
import { scenarioSchema } from '../calculations/validation';
import { CURRENT_SCHEMA_VERSION } from './defaultScenario';

/**
 * Transforms stored scenario data from one schema version to the next
 * (version N in, version N+1 out).
 */
type ScenarioMigration = (data: unknown) => unknown;

/**
 * Registered migrations keyed by the version they migrate FROM.
 * Empty while the schema is at version 1; when the schema changes, bump
 * CURRENT_SCHEMA_VERSION and register a migration here so existing users'
 * drafts are upgraded rather than discarded.
 */
const migrations: Record<number, ScenarioMigration> = {};

export type MigrationResult =
  { ok: true; scenario: GigGaugeScenario } | { ok: false; reason: string };

/**
 * Validates and, when necessary, migrates a stored scenario value to the
 * current schema version. Never throws — callers decide how to handle
 * failures (the persistence layer backs the raw data up first).
 */
export function migrateStoredScenario(storedVersion: number, data: unknown): MigrationResult {
  if (!Number.isInteger(storedVersion) || storedVersion < 1) {
    return { ok: false, reason: `Invalid stored schema version: ${String(storedVersion)}` };
  }
  if (storedVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `Stored schema version ${storedVersion} is newer than this app supports (${CURRENT_SCHEMA_VERSION})`,
    };
  }

  let current = data;
  for (let version = storedVersion; version < CURRENT_SCHEMA_VERSION; version += 1) {
    const migration = migrations[version];
    if (!migration) {
      return { ok: false, reason: `No migration registered from schema version ${version}` };
    }
    current = migration(current);
  }

  const parsed = scenarioSchema.safeParse(current);
  if (!parsed.success) {
    return { ok: false, reason: 'Stored scenario failed validation after migration' };
  }
  return { ok: true, scenario: parsed.data };
}
