// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Plan } from './Plan';
import { ScenarioProvider } from '../state/scenarioContext';
import { createDefaultScenario } from '../state/defaultScenario';
import { getQuickExample } from '../state/examples';
import { prepareScenarioForDetailedPlan } from '../state/planHandoff';
import { quickFormToScenario } from '../state/quickEstimateMapping';
import { ACTIVE_SCENARIO_KEY, saveActiveState, type KeyValueStorage } from '../state/persistence';

function makeMemoryStorage(seed?: {
  scenario: ReturnType<typeof createDefaultScenario>;
}): KeyValueStorage & {
  data: Map<string, string>;
} {
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

function renderPlan(storage: KeyValueStorage) {
  return render(
    <ScenarioProvider storage={storage}>
      <MemoryRouter initialEntries={['/plan']}>
        <Routes>
          <Route path="/plan" element={<Plan />} />
        </Routes>
      </MemoryRouter>
    </ScenarioProvider>,
  );
}

afterEach(cleanup);

describe('Plan', () => {
  it('renders the core sections including Costs and hybrid arrangement option', () => {
    renderPlan(makeMemoryStorage());
    expect(screen.getByRole('heading', { name: 'Detailed plan' })).toBeInTheDocument();
    expect(screen.getByText('Goal')).toBeInTheDocument();
    expect(screen.getByText('Work pattern')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Costs')).toBeInTheDocument();
    expect(screen.getByText('Tax')).toBeInTheDocument();
    expect(screen.getByText('Pension and retirement')).toBeInTheDocument();
    expect(screen.getByText('Leave')).toBeInTheDocument();
    expect(screen.getByText('Savings goals')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /hybrid/i })).toBeInTheDocument();
  });

  it('shows private-hire example costs as editable rows and allows delete', async () => {
    const user = userEvent.setup();
    const example = getQuickExample('privateHire');
    const prepared = prepareScenarioForDetailedPlan(
      quickFormToScenario(example.formValues, example.baseScenario),
      { ...example.formValues },
    );
    const storage = makeMemoryStorage({ scenario: prepared.scenario });
    renderPlan(storage);

    expect(await screen.findByText(/Vehicle rental/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Example — replace with your actual cost/).length).toBeGreaterThan(
      0,
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete cost/i });
    const before = deleteButtons.length;
    await user.click(deleteButtons[0]!);
    expect(screen.getAllByRole('button', { name: /delete cost/i }).length).toBe(before - 1);
  });

  it('adds a cost row and annualises working-weeks-only vs full-year independently', async () => {
    const user = userEvent.setup();
    const scenario = createDefaultScenario();
    scenario.work.workingWeeksPerYear = 39;
    scenario.goal.amount = 40_000;
    scenario.income.grossRevenue = 80_000;
    const storage = makeMemoryStorage({ scenario });
    renderPlan(storage);

    await user.click(screen.getByRole('button', { name: /add cost/i }));
    const nameInputs = screen.getAllByLabelText('Name');
    const amountInputs = screen.getAllByLabelText('Amount (£)');
    await user.type(nameInputs[0]!, 'Vehicle rental');
    await user.clear(amountInputs[0]!);
    await user.type(amountInputs[0]!, '280');
    await user.selectOptions(screen.getAllByLabelText('Frequency')[0]!, 'weekly');
    await user.click(screen.getByLabelText('Only paid during working weeks'));

    expect(screen.getAllByText(/£10,920\.00/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /add cost/i }));
    const names = screen.getAllByLabelText('Name');
    const amounts = screen.getAllByLabelText('Amount (£)');
    await user.type(names[1]!, 'Insurance');
    await user.clear(amounts[1]!);
    await user.type(amounts[1]!, '500');
    await user.selectOptions(screen.getAllByLabelText('Frequency')[1]!, 'annual');

    expect(screen.getAllByText(/£500\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/£10,920\.00/).length).toBeGreaterThan(0);
  });

  it('shows the financial breakdown region', () => {
    const scenario = createDefaultScenario();
    scenario.goal.amount = 30_000;
    scenario.income.grossRevenue = 50_000;
    renderPlan(makeMemoryStorage({ scenario }));
    expect(screen.getByTestId('financial-breakdown')).toBeInTheDocument();
    expect(screen.getByText('Financial breakdown')).toBeInTheDocument();
    expect(screen.getByText('= Personal take-home after retirement saving')).toBeInTheDocument();
  });

  it('shows the Scotland unsupported notice', async () => {
    const user = userEvent.setup();
    const scenario = createDefaultScenario();
    scenario.goal.amount = 30_000;
    scenario.income.grossRevenue = 50_000;
    renderPlan(makeMemoryStorage({ scenario }));

    await user.selectOptions(screen.getByLabelText('Where do you pay Income Tax?'), 'scotland');
    expect(await screen.findByText("Scottish Income Tax isn't supported yet")).toBeInTheDocument();
  });

  it('persists a deleted cost across remount', async () => {
    const user = userEvent.setup();
    const example = getQuickExample('privateHire');
    const prepared = prepareScenarioForDetailedPlan(
      quickFormToScenario(example.formValues, example.baseScenario),
      { ...example.formValues },
    );
    const storage = makeMemoryStorage({ scenario: prepared.scenario });
    const first = renderPlan(storage);

    const before = screen.getAllByRole('button', { name: /delete cost/i }).length;
    await user.click(screen.getAllByRole('button', { name: /delete cost/i })[0]!);

    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(
      JSON.parse(storage.data.get(ACTIVE_SCENARIO_KEY) ?? '{}').scenario.expenses,
    ).toHaveLength(before - 1);

    first.unmount();
    renderPlan(storage);
    expect(screen.getAllByRole('button', { name: /delete cost/i }).length).toBe(before - 1);
  });
});
