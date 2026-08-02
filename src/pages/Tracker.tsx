import { useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { TextField, SelectField } from '../components/FieldControls';
import { getSafeLocalStorage, type KeyValueStorage } from '../state/persistence';
import { loadSavedScenarios } from '../state/savedScenarios';
import {
  addEarningsEntry,
  deleteEarningsEntry,
  EarningsTrackerValidationError,
  loadEarningsEntries,
  summariseEarningsTotals,
  updateEarningsEntry,
  type EarningsEntry,
} from '../state/earningsTracker';
import { formatCurrencyGBP } from '../utils/format';

interface TrackerProps {
  storage?: KeyValueStorage | null;
  /** Injectable clock for tests. */
  now?: Date;
}

function todayIso(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
    new Date(y, m - 1, d),
  );
}

export function Tracker({ storage: storageProp, now: nowProp }: TrackerProps): ReactElement {
  const storage = useMemo<KeyValueStorage | null>(
    () => (storageProp !== undefined ? storageProp : getSafeLocalStorage()),
    [storageProp],
  );
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);
  const library = useMemo(() => (storage ? loadSavedScenarios(storage) : []), [storage]);

  const [entries, setEntries] = useState<EarningsEntry[]>(() =>
    storage ? loadEarningsEntries(storage) : [],
  );
  const [date, setDate] = useState(() => todayIso(nowProp ?? new Date()));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [savedScenarioId, setSavedScenarioId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => summariseEarningsTotals(entries, now), [entries, now]);

  const refresh = (): void => {
    if (storage) {
      setEntries(loadEarningsEntries(storage));
    }
  };

  const resetForm = (): void => {
    setDate(todayIso(now));
    setAmount('');
    setNote('');
    setSavedScenarioId('');
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (!storage) {
      setError('Storage is unavailable in this browser.');
      return;
    }
    const parsedAmount = Number(amount);
    try {
      const input = {
        date,
        amount: parsedAmount,
        note: note.trim() || undefined,
        savedScenarioId: savedScenarioId || undefined,
      };
      if (editingId) {
        updateEarningsEntry(storage, editingId, input);
      } else {
        addEarningsEntry(storage, input);
      }
      resetForm();
      refresh();
    } catch (err) {
      if (err instanceof EarningsTrackerValidationError) {
        setError(err.message);
        return;
      }
      setError('Could not save this entry.');
    }
  };

  const startEdit = (entry: EarningsEntry): void => {
    setEditingId(entry.id);
    setDate(entry.date);
    setAmount(String(entry.amount));
    setNote(entry.note ?? '');
    setSavedScenarioId(entry.savedScenarioId ?? '');
    setError(null);
  };

  const handleDelete = (id: string): void => {
    if (!storage) {
      return;
    }
    const confirmed = window.confirm('Delete this earnings entry?');
    if (!confirmed) {
      return;
    }
    deleteEarningsEntry(storage, id);
    if (editingId === id) {
      resetForm();
    }
    refresh();
  };

  const scenarioLabel = (savedId: string | undefined): string | null => {
    if (!savedId) {
      return null;
    }
    const match = library.find((entry) => entry.id === savedId);
    return match ? match.scenario.name : 'Saved plan removed';
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">Tracker</h1>
        <p className="text-base text-slate-600">
          Log cash you actually received. This does not change your plan or tax estimates.
        </p>
      </header>

      <section
        aria-label="Earnings totals"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        data-testid="tracker-totals"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">This week</p>
          <p className="text-lg font-semibold text-blue-950">{formatCurrencyGBP(totals.week)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">This month</p>
          <p className="text-lg font-semibold text-blue-950">{formatCurrencyGBP(totals.month)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">This year</p>
          <p className="text-lg font-semibold text-blue-950">{formatCurrencyGBP(totals.year)}</p>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5"
        data-testid="tracker-form"
      >
        <h2 className="text-lg font-semibold text-blue-950">
          {editingId ? 'Edit entry' : 'Add entry'}
        </h2>
        <TextField
          id="tracker-date"
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <TextField
          id="tracker-amount"
          label="Amount received (£)"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hint="Must be greater than zero."
          required
        />
        <TextField
          id="tracker-note"
          label="Note (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <SelectField
          id="tracker-scenario"
          label="Link to saved plan (optional)"
          value={savedScenarioId}
          onChange={(event) => setSavedScenarioId(event.target.value)}
        >
          <option value="">None</option>
          {library.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.scenario.name}
            </option>
          ))}
        </SelectField>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-950 px-5 text-base font-semibold text-white hover:bg-blue-900"
          >
            {editingId ? (
              <>
                <Pencil aria-hidden="true" className="h-5 w-5" />
                Save changes
              </>
            ) : (
              <>
                <Plus aria-hidden="true" className="h-5 w-5" />
                Add entry
              </>
            )}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-base font-medium text-slate-700"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <section aria-label="Earnings entries" className="flex flex-col gap-3">
        {entries.length === 0 ? (
          <div
            data-testid="tracker-empty"
            className="rounded-2xl border border-slate-200 bg-white p-6 text-center"
          >
            <Wallet aria-hidden="true" className="mx-auto h-10 w-10 text-blue-800" />
            <p className="mt-3 text-base text-slate-700">No earnings logged yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const linkLabel = scenarioLabel(entry.savedScenarioId);
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  data-testid="tracker-entry"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-blue-950">
                      {formatCurrencyGBP(entry.amount)}
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        {formatDisplayDate(entry.date)}
                      </span>
                    </p>
                    {entry.note ? <p className="text-sm text-slate-600">{entry.note}</p> : null}
                    {linkLabel ? (
                      <p className="text-sm text-slate-500" data-testid="tracker-scenario-label">
                        Linked plan: {linkLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-700"
                      aria-label={`Edit entry of ${formatCurrencyGBP(entry.amount)}`}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-red-200 text-red-700"
                      aria-label={`Delete entry of ${formatCurrencyGBP(entry.amount)}`}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
