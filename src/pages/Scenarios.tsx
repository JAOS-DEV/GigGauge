import { useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Copy,
  Download,
  FolderOpen,
  Pencil,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { getSafeLocalStorage, type KeyValueStorage } from '../state/persistence';
import {
  deleteSavedScenario,
  duplicateSavedScenario,
  exportSavedScenariosJson,
  loadSavedScenarios,
  materialiseSavedEntryForLoad,
  mergeImportedSavedScenarios,
  promptAndSaveActiveDraftToLibrary,
  renameSavedScenario,
  SAVED_SCENARIOS_SOFT_CAP,
  type SavedScenarioEntry,
} from '../state/savedScenarios';
import { useScenario } from '../state/useScenario';
import { formatCurrencyGBP } from '../utils/format';

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function arrangementLabel(type: SavedScenarioEntry['scenario']['arrangementType']): string {
  switch (type) {
    case 'employed':
      return 'Employed';
    case 'selfEmployed':
      return 'Self-employed';
    case 'contractor':
      return 'Contractor';
    case 'gigPlatform':
      return 'Gig / platform';
    case 'hybrid':
      return 'Hybrid';
    case 'custom':
      return 'Custom';
  }
}

interface ScenariosProps {
  /** Injectable for tests; defaults to guarded window.localStorage. */
  storage?: KeyValueStorage | null;
}

export function Scenarios({ storage: storageProp }: ScenariosProps): ReactElement {
  const navigate = useNavigate();
  const { scenario, quickForm, setActiveState } = useScenario();
  const storage = useMemo<KeyValueStorage | null>(
    () => (storageProp !== undefined ? storageProp : getSafeLocalStorage()),
    [storageProp],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<SavedScenarioEntry[]>(() =>
    storage ? loadSavedScenarios(storage) : [],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleSave = (): void => {
    setError(null);
    const result = promptAndSaveActiveDraftToLibrary(storage, scenario, quickForm);
    if (result.status === 'cancelled') {
      return;
    }
    if (result.status === 'unavailable') {
      setError('Saving is unavailable in this browser (storage blocked).');
      return;
    }
    if (result.status === 'full') {
      setError(
        `You already have ${SAVED_SCENARIOS_SOFT_CAP} saved scenarios. Delete or export some before saving another.`,
      );
      setEntries(result.entries);
      return;
    }
    setEntries(result.entries);
    setMessage(`Saved “${result.entry.scenario.name}” to your library.`);
  };

  const handleLoad = (entry: SavedScenarioEntry): void => {
    setError(null);
    const confirmed = window.confirm(
      'Replace your current plan with this saved scenario?',
    );
    if (!confirmed) {
      return;
    }
    const loaded = materialiseSavedEntryForLoad(entry);
    setActiveState(loaded.scenario, loaded.quickForm);
    setMessage(`Loaded “${entry.scenario.name}”.`);
    void navigate('/');
  };

  const handleRenameStart = (entry: SavedScenarioEntry): void => {
    setRenamingId(entry.id);
    setRenameValue(entry.scenario.name);
  };

  const handleRenameCommit = (entryId: string): void => {
    if (!storage) {
      return;
    }
    setEntries(renameSavedScenario(storage, entryId, renameValue));
    setRenamingId(null);
    setMessage('Name updated.');
  };

  const handleDuplicate = (entryId: string): void => {
    setError(null);
    if (!storage) {
      return;
    }
    const result = duplicateSavedScenario(storage, entryId);
    if (!result.ok) {
      if (result.reason === 'full') {
        setError(
          `You already have ${SAVED_SCENARIOS_SOFT_CAP} saved scenarios. Delete or export some before duplicating.`,
        );
      }
      setEntries(result.entries);
      return;
    }
    setEntries(result.entries);
    setMessage(`Duplicated as “${result.entry.scenario.name}”.`);
  };

  const handleDelete = (entry: SavedScenarioEntry): void => {
    if (!storage) {
      return;
    }
    const confirmed = window.confirm(`Delete “${entry.scenario.name}” from your library?`);
    if (!confirmed) {
      return;
    }
    setEntries(deleteSavedScenario(storage, entry.id));
    setMessage('Deleted from your library.');
  };

  const handleExport = (): void => {
    setError(null);
    const json = exportSavedScenariosJson(entries);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `giggauge-scenarios-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Exported your scenario library.');
  };

  const handleImportClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>): void => {
    setError(null);
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !storage) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (): void => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = mergeImportedSavedScenarios(storage, text);
      if (!result.ok) {
        setError(result.error);
        setEntries(result.entries);
        return;
      }
      setEntries(result.entries);
      const parts = [`Imported ${result.imported}`];
      if (result.skipped > 0) {
        parts.push(`skipped ${result.skipped}`);
      }
      if (result.capped) {
        parts.push('stopped at the 20-scenario limit');
      }
      setMessage(`${parts.join('; ')}.`);
    };
    reader.onerror = (): void => {
      setError('Could not read that file.');
    };
    reader.readAsText(file);
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          <FolderOpen aria-hidden="true" className="h-4 w-4" />
          Scenarios
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">Saved scenarios</h1>
        <p className="text-base text-slate-600">
          Keep named copies of your plans on this device. Save the active draft, load one back,
          or export a JSON backup. You can store up to {SAVED_SCENARIOS_SOFT_CAP} scenarios.
        </p>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-base font-semibold text-white hover:bg-blue-900"
        >
          <Save aria-hidden="true" className="h-5 w-5" />
          Save current plan
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={entries.length === 0}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-blue-950 hover:border-blue-700 disabled:opacity-50"
        >
          <Download aria-hidden="true" className="h-5 w-5" />
          Export library
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-blue-950 hover:border-blue-700"
        >
          <Upload aria-hidden="true" className="h-5 w-5" />
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
      </section>

      {message ? (
        <p role="status" className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-green-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900">
          {error}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          data-testid="scenarios-empty"
        >
          <p className="text-base text-slate-700">
            No saved scenarios yet. Build a plan in Quick or Plan, then use{' '}
            <span className="font-medium">Save current plan</span> to keep a copy here.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/plan"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-4 text-base font-semibold text-white hover:bg-blue-900"
            >
              Open detailed plan
            </Link>
            <Link
              to="/quick"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-blue-950 hover:border-blue-700"
            >
              Open quick estimate
            </Link>
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="scenarios-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              data-testid={`scenario-entry-${entry.id}`}
            >
              {renamingId === entry.id ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label="Scenario name"
                    className="min-h-12 flex-1 rounded-lg border border-slate-300 px-3 text-base"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button
                    type="button"
                    className="inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-950 px-4 text-sm font-semibold text-white"
                    onClick={() => handleRenameCommit(entry.id)}
                  >
                    Save name
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold text-blue-950">{entry.scenario.name}</h2>
                  <p className="text-sm text-slate-500">
                    {arrangementLabel(entry.scenario.arrangementType)} · Goal{' '}
                    {formatCurrencyGBP(entry.scenario.goal.amount)} · Saved{' '}
                    {formatSavedAt(entry.savedAt)}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-950 px-3 text-sm font-semibold text-white hover:bg-blue-900"
                  onClick={() => handleLoad(entry)}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:border-blue-700"
                  onClick={() => handleRenameStart(entry)}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  Rename
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:border-blue-700"
                  onClick={() => handleDuplicate(entry.id)}
                >
                  <Copy aria-hidden="true" className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-800 hover:bg-red-50"
                  onClick={() => handleDelete(entry)}
                  aria-label={`Delete ${entry.scenario.name}`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
