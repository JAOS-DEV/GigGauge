// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Compare } from './Compare';
import { createDefaultScenario } from '../state/defaultScenario';
import { type KeyValueStorage } from '../state/persistence';
import {
  SAVED_LIBRARY_SCHEMA_VERSION,
  SAVED_SCENARIOS_KEY,
  type SavedScenarioEntry,
} from '../state/savedScenarios';

function makeMemoryStorage(entries: SavedScenarioEntry[] = []): KeyValueStorage & {
  data: Map<string, string>;
} {
  const data = new Map<string, string>();
  if (entries.length > 0) {
    data.set(
      SAVED_SCENARIOS_KEY,
      JSON.stringify({ schemaVersion: SAVED_LIBRARY_SCHEMA_VERSION, entries }),
    );
  }
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function entry(name: string, id: string, gross = 50_000): SavedScenarioEntry {
  const scenario = createDefaultScenario();
  scenario.name = name;
  scenario.arrangementType = 'employed';
  scenario.income = { grossAnnualSalary: gross };
  scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
  return { id, savedAt: '2026-08-01T12:00:00.000Z', scenario };
}

function renderCompare(storage: KeyValueStorage) {
  return render(
    <MemoryRouter initialEntries={['/compare']}>
      <Routes>
        <Route path="/compare" element={<Compare storage={storage} />} />
        <Route path="/scenarios" element={<div>Scenarios page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('Compare page', () => {
  it('shows empty state when fewer than two saved scenarios', () => {
    renderCompare(makeMemoryStorage([entry('Only one', 'e1')]));
    expect(screen.getByTestId('compare-empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open scenarios/i })).toHaveAttribute(
      'href',
      '/scenarios',
    );
  });

  it('allows selecting up to three plans and blocks a fourth', async () => {
    const user = userEvent.setup();
    const storage = makeMemoryStorage([
      entry('A', 'e1', 50_000),
      entry('B', 'e2', 55_000),
      entry('C', 'e3', 60_000),
      entry('D', 'e4', 65_000),
    ]);
    renderCompare(storage);

    await user.click(screen.getByRole('checkbox', { name: /A/i }));
    await user.click(screen.getByRole('checkbox', { name: /B/i }));
    expect(screen.getByTestId('compare-table')).toBeInTheDocument();
    expect(screen.getByText('Annual take-home')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /C/i }));
    expect(screen.getAllByRole('columnheader')).toHaveLength(4); // Metric + 3

    await user.click(screen.getByRole('checkbox', { name: /D/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at most three saved plans/i);
    expect(screen.getByRole('checkbox', { name: /D/i })).not.toBeChecked();
  });
});
