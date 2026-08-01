// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Scenarios } from './Scenarios';
import { Home } from './Home';
import { ScenarioProvider } from '../state/scenarioContext';
import { createDefaultScenario } from '../state/defaultScenario';
import { saveActiveState, type KeyValueStorage } from '../state/persistence';
import { SAVED_SCENARIOS_KEY } from '../state/savedScenarios';

function makeMemoryStorage(seed?: {
  scenario: ReturnType<typeof createDefaultScenario>;
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
    saveActiveState(storage, seed.scenario);
  }
  return storage;
}

function renderScenarios(storage: KeyValueStorage & { data: Map<string, string> }) {
  return render(
    <ScenarioProvider storage={storage}>
      <MemoryRouter initialEntries={['/scenarios']}>
        <Routes>
          <Route path="/scenarios" element={<Scenarios storage={storage} />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    </ScenarioProvider>,
  );
}

afterEach(cleanup);

describe('Scenarios page', () => {
  it('shows empty state with Plan and Quick links', () => {
    renderScenarios(makeMemoryStorage());
    expect(screen.getByTestId('scenarios-empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open detailed plan/i })).toHaveAttribute(
      'href',
      '/plan',
    );
    expect(screen.getByRole('link', { name: /open quick estimate/i })).toHaveAttribute(
      'href',
      '/quick',
    );
  });

  it('saves the active plan into the library and lists it after reload from storage', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Private hire saved');
    const scenario = createDefaultScenario();
    scenario.name = 'Private hire';
    scenario.goal.amount = 30_000;
    const storage = makeMemoryStorage({ scenario });
    renderScenarios(storage);

    await user.click(screen.getByRole('button', { name: /save current plan/i }));
    expect(promptSpy).toHaveBeenCalledWith('Name for this saved scenario', 'Private hire');
    expect(screen.getByTestId('scenarios-list')).toBeInTheDocument();
    expect(screen.getByText('Private hire saved')).toBeInTheDocument();
    expect(storage.data.get(SAVED_SCENARIOS_KEY)).toBeTruthy();

    cleanup();
    renderScenarios(storage);
    expect(screen.getByText('Private hire saved')).toBeInTheDocument();
    promptSpy.mockRestore();
  });

  it('does not save when the name prompt is cancelled', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const scenario = createDefaultScenario();
    scenario.name = 'Private hire';
    const storage = makeMemoryStorage({ scenario });
    renderScenarios(storage);

    await user.click(screen.getByRole('button', { name: /save current plan/i }));
    expect(screen.getByTestId('scenarios-empty')).toBeInTheDocument();
    expect(storage.data.get(SAVED_SCENARIOS_KEY)).toBeUndefined();
    promptSpy.mockRestore();
  });

  it('loads a saved scenario into the active draft after confirm', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const active = createDefaultScenario();
    active.name = 'Draft';
    active.goal.amount = 0;
    const storage = makeMemoryStorage({ scenario: active });

    const saved = createDefaultScenario();
    saved.name = 'Saved plan';
    saved.goal.amount = 30_000;
    saved.income = { grossRevenue: 55_000 };
    const { saveActiveDraftToLibrary } = await import('../state/savedScenarios');
    saveActiveDraftToLibrary(storage, saved);

    renderScenarios(storage);
    expect(screen.getByText('Saved plan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(await screen.findByTestId('home-results-dashboard')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('renames and deletes with confirm', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const scenario = createDefaultScenario();
    scenario.name = 'To rename';
    const storage = makeMemoryStorage({ scenario });
    const { saveActiveDraftToLibrary } = await import('../state/savedScenarios');
    saveActiveDraftToLibrary(storage, scenario);
    renderScenarios(storage);

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const nameInput = screen.getByLabelText('Scenario name');
    await user.clear(nameInput);
    await user.type(nameInput, 'New name');
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(screen.getByText('New name')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete New name' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId('scenarios-empty')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
