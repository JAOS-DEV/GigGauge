// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Tracker } from './Tracker';
import { createDefaultScenario } from '../state/defaultScenario';
import { type KeyValueStorage } from '../state/persistence';
import {
  SAVED_LIBRARY_SCHEMA_VERSION,
  SAVED_SCENARIOS_KEY,
} from '../state/savedScenarios';
import {
  EARNINGS_TRACKER_KEY,
  EARNINGS_TRACKER_SCHEMA_VERSION,
  loadEarningsEntries,
} from '../state/earningsTracker';

function makeMemoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const scenario = createDefaultScenario();
  scenario.name = 'Linked plan';
  data.set(
    SAVED_SCENARIOS_KEY,
    JSON.stringify({
      schemaVersion: SAVED_LIBRARY_SCHEMA_VERSION,
      entries: [{ id: 'lib-1', savedAt: '2026-08-01T12:00:00.000Z', scenario }],
    }),
  );
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function renderTracker(storage: KeyValueStorage & { data: Map<string, string> }) {
  return render(
    <MemoryRouter initialEntries={['/tracker']}>
      <Routes>
        <Route
          path="/tracker"
          element={<Tracker storage={storage} now={new Date(2026, 7, 2)} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('Tracker page', () => {
  it('adds an entry that survives reload from storage', async () => {
    const user = userEvent.setup();
    const storage = makeMemoryStorage();
    renderTracker(storage);

    expect(screen.getByTestId('tracker-empty')).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/amount received/i));
    await user.type(screen.getByLabelText(/amount received/i), '150.25');
    await user.selectOptions(screen.getByLabelText(/link to saved plan/i), 'lib-1');
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    expect(screen.getByTestId('tracker-entry')).toBeInTheDocument();
    expect(screen.getByText('Linked plan: Linked plan')).toBeInTheDocument();
    expect(loadEarningsEntries(storage)).toHaveLength(1);

    cleanup();
    renderTracker(storage);
    expect(screen.getByTestId('tracker-entry')).toBeInTheDocument();
  });

  it('shows Saved plan removed when the linked library entry is gone', () => {
    const storage = makeMemoryStorage();
    storage.setItem(
      EARNINGS_TRACKER_KEY,
      JSON.stringify({
        schemaVersion: EARNINGS_TRACKER_SCHEMA_VERSION,
        entries: [
          {
            id: 'earn-1',
            date: '2026-08-01',
            amount: 80,
            savedScenarioId: 'missing-lib',
          },
        ],
      }),
    );
    renderTracker(storage);
    expect(screen.getByText('Linked plan: Saved plan removed')).toBeInTheDocument();
  });

  it('rejects zero amounts with a validation message', async () => {
    const user = userEvent.setup();
    const storage = makeMemoryStorage();
    renderTracker(storage);
    await user.clear(screen.getByLabelText(/amount received/i));
    await user.type(screen.getByLabelText(/amount received/i), '0');
    await user.click(screen.getByRole('button', { name: /add entry/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(loadEarningsEntries(storage)).toHaveLength(0);
  });

  it('deletes an entry after confirm', async () => {
    const user = userEvent.setup();
    const storage = makeMemoryStorage();
    storage.setItem(
      EARNINGS_TRACKER_KEY,
      JSON.stringify({
        schemaVersion: EARNINGS_TRACKER_SCHEMA_VERSION,
        entries: [{ id: 'earn-1', date: '2026-08-01', amount: 80 }],
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderTracker(storage);
    await user.click(screen.getByRole('button', { name: /delete entry/i }));
    expect(loadEarningsEntries(storage)).toHaveLength(0);
  });
});
