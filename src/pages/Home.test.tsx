// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';
import { ScenarioProvider } from '../state/scenarioContext';
import { createDefaultScenario } from '../state/defaultScenario';
import { saveActiveState, type KeyValueStorage } from '../state/persistence';

function makeMemoryStorage(seed?: {
  scenario: ReturnType<typeof createDefaultScenario>;
}): KeyValueStorage {
  const data = new Map<string, string>();
  const storage: KeyValueStorage = {
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

function renderHome(storage: KeyValueStorage) {
  return render(
    <ScenarioProvider storage={storage}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </ScenarioProvider>,
  );
}

afterEach(cleanup);

describe('Home', () => {
  it('shows the marketing empty state when the draft has no assessable results', () => {
    renderHome(makeMemoryStorage());

    expect(screen.getByRole('heading', { name: 'GigGauge' })).toBeInTheDocument();
    expect(screen.getByText('Know what your work is really worth.')).toBeInTheDocument();
    expect(screen.queryByTestId('home-results-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('financial-breakdown')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /quick estimate/i })).toHaveAttribute(
      'href',
      '/quick?new=1',
    );
    expect(screen.getByRole('link', { name: /detailed plan/i })).toHaveAttribute('href', '/plan');
    expect(screen.getByRole('link', { name: /current employed job/i })).toHaveAttribute(
      'href',
      '/quick?example=employedJob',
    );
  });

  it('shows the results dashboard with chart when the goal is assessable', () => {
    const scenario = createDefaultScenario();
    scenario.name = 'Private hire plan';
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };
    renderHome(makeMemoryStorage({ scenario }));

    expect(screen.getByTestId('home-results-dashboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private hire plan' })).toBeInTheDocument();
    expect(screen.getByTestId('status-banner')).toBeInTheDocument();
    expect(screen.getByTestId('financial-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('goal-comparison-chart')).toBeInTheDocument();
    expect(screen.getByText('Annual goal')).toBeInTheDocument();
    expect(screen.getByText('Estimated take-home')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit detailed plan/i })).toHaveAttribute(
      'href',
      '/plan',
    );
    expect(screen.getByRole('link', { name: /^quick estimate$/i })).toHaveAttribute(
      'href',
      '/quick',
    );
    expect(screen.queryByText('Know what your work is really worth.')).not.toBeInTheDocument();
  });

  it('shows required cards without a fake achieved banner when income is missing', () => {
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    renderHome(makeMemoryStorage({ scenario }));

    expect(screen.getByTestId('home-results-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Required annual revenue/i)).toBeInTheDocument();
    expect(screen.queryByTestId('status-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('goal-comparison-chart')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Enter a goal amount and enough income/i),
    ).toBeInTheDocument();
  });

  it('shows the Scotland unsupported notice on the dashboard', () => {
    const scenario = createDefaultScenario();
    scenario.goal.amount = 30_000;
    scenario.income.grossRevenue = 50_000;
    scenario.tax.region = 'scotland';
    renderHome(makeMemoryStorage({ scenario }));

    expect(screen.getByTestId('home-results-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Scottish Income Tax isn't supported yet/i)).toBeInTheDocument();
  });

  it('clears the active plan with Start over and returns to the marketing Home', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };
    renderHome(makeMemoryStorage({ scenario }));

    expect(screen.getByTestId('home-results-dashboard')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start over/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByTestId('home-results-dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GigGauge' })).toBeInTheDocument();
    expect(screen.getByText('Know what your work is really worth.')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('keeps the dashboard when Start over is cancelled', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const scenario = createDefaultScenario();
    scenario.goal = { type: 'takeHome', period: 'annual', amount: 30_000 };
    scenario.income = { grossRevenue: 55_000 };
    renderHome(makeMemoryStorage({ scenario }));

    await user.click(screen.getByRole('button', { name: /start over/i }));
    expect(screen.getByTestId('home-results-dashboard')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
