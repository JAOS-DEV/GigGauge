// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TimeOff } from './TimeOff';
import { ScenarioProvider } from '../state/scenarioContext';
import { createDefaultScenario } from '../state/defaultScenario';
import { saveActiveState, type KeyValueStorage, type StoredQuickForm } from '../state/persistence';
import { createDefaultQuickFormValues } from '../state/quickEstimateMapping';

function makeMemoryStorage(seed?: {
  scenario: ReturnType<typeof createDefaultScenario>;
  quickForm?: StoredQuickForm;
}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const storage: KeyValueStorage & { data: Map<string, string> } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
  if (seed) {
    saveActiveState(storage, seed.scenario, seed.quickForm);
  }
  return storage;
}

function renderTimeOff(storage: KeyValueStorage) {
  return render(
    <ScenarioProvider storage={storage}>
      <MemoryRouter initialEntries={['/time-off']}>
        <Routes>
          <Route path="/time-off" element={<TimeOff />} />
        </Routes>
      </MemoryRouter>
    </ScenarioProvider>,
  );
}

afterEach(cleanup);

describe('TimeOff', () => {
  it('shows an empty state with Plan and Quick links when not ready', () => {
    renderTimeOff(makeMemoryStorage());
    expect(screen.getByTestId('time-off-empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open detailed plan/i })).toHaveAttribute(
      'href',
      '/plan',
    );
    expect(screen.getByRole('link', { name: /open quick estimate/i })).toHaveAttribute(
      'href',
      '/quick',
    );
    expect(screen.queryByTestId('time-off-rows')).not.toBeInTheDocument();
  });

  it('shows preset rows and applies weeks with quickForm sync', async () => {
    const user = userEvent.setup();
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };
    scenario.work.workingWeeksPerYear = 48;
    const quickForm = {
      ...createDefaultQuickFormValues(),
      workingWeeks: '48',
      targetAmount: '30000',
    } as unknown as StoredQuickForm;

    const storage = makeMemoryStorage({ scenario, quickForm });
    renderTimeOff(storage);

    expect(screen.getByTestId('time-off-rows')).toBeInTheDocument();
    expect(screen.getByTestId('time-off-row-52')).toBeInTheDocument();
    expect(screen.getByTestId('time-off-row-30')).toBeInTheDocument();

    const applyButtons = screen.getAllByRole('button', { name: 'Apply' });
    await user.click(applyButtons[0]!);

    expect(screen.getByText(/Applied to your active plan/i)).toBeInTheDocument();

    // Flush debounce by waiting slightly over save debounce if needed — state is in React.
    // Re-read storage after a tick for persistence.
    await new Promise((resolve) => setTimeout(resolve, 600));
    const raw = storage.getItem('giggauge:activeScenario');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as {
      scenario: { work: { workingWeeksPerYear: number } };
      quickForm?: { workingWeeks?: string };
    };
    expect(parsed.scenario.work.workingWeeksPerYear).toBe(52);
    expect(parsed.quickForm?.workingWeeks).toBe('52');
  });

  it('updates custom weeks into the list', async () => {
    const user = userEvent.setup();
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };
    renderTimeOff(makeMemoryStorage({ scenario }));

    const input = screen.getByLabelText(/custom working weeks/i);
    await user.clear(input);
    await user.type(input, '42');
    await user.tab();
    expect(await screen.findByTestId('time-off-row-42')).toBeInTheDocument();
  });
});
