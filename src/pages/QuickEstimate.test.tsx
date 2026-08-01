// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { QuickEstimate } from './QuickEstimate';
import { ScenarioProvider } from '../state/scenarioContext';
import { ACTIVE_SCENARIO_KEY, type KeyValueStorage } from '../state/persistence';
import { SAVED_SCENARIOS_KEY } from '../state/savedScenarios';

function makeMemoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function LocationProbe(): ReactElement {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderQuick(route = '/quick', storage: KeyValueStorage | null = null) {
  return render(
    <ScenarioProvider storage={storage}>
      <MemoryRouter initialEntries={[route]}>
        <LocationProbe />
        <Routes>
          <Route path="/quick" element={<QuickEstimate />} />
        </Routes>
      </MemoryRouter>
    </ScenarioProvider>,
  );
}

// Vitest globals are disabled, so Testing Library's automatic cleanup does not run.
afterEach(cleanup);

describe('QuickEstimate', () => {
  it('renders every quick-form field and no hybrid option', () => {
    renderQuick();

    expect(screen.getByLabelText('Work arrangement')).toBeInTheDocument();
    expect(screen.getByLabelText('Target amount (£)')).toBeInTheDocument();
    expect(screen.getByLabelText('Target period')).toBeInTheDocument();
    expect(screen.getByLabelText('Working weeks per year')).toBeInTheDocument();
    expect(screen.getByLabelText('Working days per week')).toBeInTheDocument();
    expect(screen.getByLabelText('Working hours per week')).toBeInTheDocument();
    expect(screen.getByLabelText('Main work cost (£)')).toBeInTheDocument();
    expect(screen.getByLabelText('Expected revenue (£)')).toBeInTheDocument();
    expect(screen.getByLabelText('Where do you pay Income Tax?')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /hybrid/i })).not.toBeInTheDocument();
  });

  it('shows live results once the form is valid, and keeps them when it turns invalid', async () => {
    const user = userEvent.setup();
    renderQuick();

    expect(
      screen.getByText('Enter a target and your work pattern to see what you need to earn.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Target amount (£)'), '40000');
    expect(await screen.findByText('Required annual revenue')).toBeInTheDocument();

    // Invalidate the pattern: results must not update, an error must show.
    const weeks = screen.getByLabelText('Working weeks per year');
    await user.clear(weeks);
    await user.type(weeks, '53');
    await user.tab(); // validation messages appear once the field is touched
    expect(await screen.findByText('Working weeks must be between 1 and 52')).toBeInTheDocument();
    expect(screen.getByText('Required annual revenue')).toBeInTheDocument();
  });

  it('switches to gross salary for employed workers', async () => {
    const user = userEvent.setup();
    renderQuick();

    await user.selectOptions(screen.getByLabelText('Work arrangement'), 'employed');
    await user.type(screen.getByLabelText('Actual take-home pay (£)'), '30000');
    await user.type(screen.getByLabelText('Target amount (£)'), '30000');

    expect(await screen.findByText('Required annual gross salary')).toBeInTheDocument();
    expect(screen.queryByText('Include example costs')).not.toBeInTheDocument();
  });

  it('shows the Scotland notice instead of numbers', async () => {
    const user = userEvent.setup();
    renderQuick();

    await user.type(screen.getByLabelText('Target amount (£)'), '40000');
    await user.selectOptions(screen.getByLabelText('Where do you pay Income Tax?'), 'scotland');

    expect(await screen.findByText("Scottish Income Tax isn't supported yet")).toBeInTheDocument();
    expect(screen.queryByText('Required annual revenue')).not.toBeInTheDocument();
  });

  it('prefills the private-hire example with a live example-costs disclosure', async () => {
    renderQuick('/quick?example=privateHire');

    expect(screen.getByLabelText('Target amount (£)')).toHaveValue('40000');
    expect(screen.getByLabelText('Working weeks per year')).toHaveValue('39');
    expect(screen.getByLabelText('Main work cost (£)')).toHaveValue('280');
    expect(
      screen.getByText(/Example: Private-hire driving plan — replace with your own figures/),
    ).toBeInTheDocument();

    // £940 neutral + £40×39 + £10×39 = £2,890 of example annual costs.
    const disclosure = await screen.findByTestId('example-costs-disclosure');
    expect(disclosure).toHaveTextContent('£2,890.00');
    expect(await screen.findByText('Required annual revenue')).toBeInTheDocument();
  });

  it('removes the disclosure when example costs are excluded', async () => {
    const user = userEvent.setup();
    renderQuick('/quick?example=privateHire');

    expect(await screen.findByTestId('example-costs-disclosure')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Include example costs'));
    expect(screen.queryByTestId('example-costs-disclosure')).not.toBeInTheDocument();
  });

  it('shows the status banner for the employed example', async () => {
    renderQuick('/quick?example=employedJob');

    expect(await screen.findByText('Required annual gross salary')).toBeInTheDocument();
    const banner = await screen.findByTestId('status-banner');
    expect(banner).toHaveTextContent('Target narrowly achieved');
  });

  it('strips one-shot new/example params so a reload restores the draft', async () => {
    renderQuick('/quick?example=privateHire');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/quick$/));

    cleanup();
    renderQuick('/quick?new=1');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/quick$/));
  });

  it('persists edits made to an example and restores them after a remount', async () => {
    const user = userEvent.setup();
    const storage = makeMemoryStorage();
    const first = renderQuick('/quick?example=privateHire', storage);

    const target = screen.getByLabelText('Target amount (£)');
    await user.clear(target);
    await user.type(target, '45000');
    await waitFor(
      () => {
        const stored = JSON.parse(storage.data.get(ACTIVE_SCENARIO_KEY) ?? '{}');
        expect(stored.quickForm?.targetAmount).toBe('45000');
      },
      { timeout: 3000 },
    );

    first.unmount();
    renderQuick('/quick', storage);
    expect(screen.getByLabelText('Target amount (£)')).toHaveValue('45000');
    expect(screen.getByLabelText('Working weeks per year')).toHaveValue('39');
  });

  it('persists incomplete and Scotland drafts too', async () => {
    const user = userEvent.setup();
    const storage = makeMemoryStorage();
    const first = renderQuick('/quick', storage);

    // No target entered yet — the form does not validate, but typed values
    // must still be saved.
    await user.selectOptions(screen.getByLabelText('Where do you pay Income Tax?'), 'scotland');
    const weeks = screen.getByLabelText('Working weeks per year');
    await user.clear(weeks);
    await user.type(weeks, '30');

    await waitFor(
      () => {
        const stored = JSON.parse(storage.data.get(ACTIVE_SCENARIO_KEY) ?? '{}');
        expect(stored.quickForm?.region).toBe('scotland');
        expect(stored.quickForm?.workingWeeks).toBe('30');
      },
      { timeout: 3000 },
    );

    first.unmount();
    renderQuick('/quick', storage);
    expect(screen.getByLabelText('Where do you pay Income Tax?')).toHaveValue('scotland');
    expect(screen.getByLabelText('Working weeks per year')).toHaveValue('30');
  });

  it('offers a Review detailed assumptions handoff to Plan', () => {
    renderQuick();
    expect(
      screen.getByRole('button', { name: /review detailed assumptions/i }),
    ).toBeInTheDocument();
  });

  it('saves the active plan to the library from Quick estimate', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Quick snapshot');
    const storage = makeMemoryStorage();
    renderQuick('/quick', storage);

    await user.click(screen.getByRole('button', { name: /save current plan/i }));
    expect(promptSpy).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Quick snapshot');
    expect(storage.data.get(SAVED_SCENARIOS_KEY)).toBeTruthy();
    promptSpy.mockRestore();
  });

  it('persists the draft and restores every entered value after a remount', async () => {
    const user = userEvent.setup();
    const storage = makeMemoryStorage();
    const first = renderQuick('/quick', storage);

    await user.type(screen.getByLabelText('Target amount (£)'), '40000');
    await user.type(screen.getByLabelText('Expected revenue (£)'), '900');
    await user.selectOptions(screen.getByLabelText('Income period'), 'weekly');

    await waitFor(() => expect(storage.data.has(ACTIVE_SCENARIO_KEY)).toBe(true), {
      timeout: 3000,
    });
    await waitFor(
      () => {
        const stored = JSON.parse(storage.data.get(ACTIVE_SCENARIO_KEY) ?? '{}');
        expect(stored.quickForm?.targetAmount).toBe('40000');
        expect(stored.quickForm?.expectedIncomePeriod).toBe('weekly');
      },
      { timeout: 3000 },
    );

    first.unmount();
    renderQuick('/quick', storage);

    expect(screen.getByLabelText('Target amount (£)')).toHaveValue('40000');
    expect(screen.getByLabelText('Expected revenue (£)')).toHaveValue('900');
    expect(screen.getByLabelText('Income period')).toHaveValue('weekly');
    expect(await screen.findByText('Required annual revenue')).toBeInTheDocument();
  });
});
