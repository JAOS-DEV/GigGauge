// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { About } from './About';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { Home } from './Home';
import { ScenarioProvider } from '../state/scenarioContext';
import { type KeyValueStorage } from '../state/persistence';

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

afterEach(cleanup);

describe('About page', () => {
  it('covers how estimates work and key limitations', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /about giggauge/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How estimates work' })).toBeInTheDocument();
    expect(screen.getByText(/scottish income tax/i)).toBeInTheDocument();
    expect(screen.getByText(/student loan repayments/i)).toBeInTheDocument();
    expect(screen.getByText(/salary sacrifice/i)).toBeInTheDocument();
  });

  it('is linked from the disclaimer footer and Home', () => {
    render(
      <MemoryRouter>
        <DisclaimerFooter />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /about estimates and limitations/i }),
    ).toHaveAttribute('href', '/about');

    cleanup();
    render(
      <ScenarioProvider storage={makeMemoryStorage()}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </ScenarioProvider>,
    );
    expect(
      screen.getByRole('link', { name: /about estimates and limitations/i }),
    ).toHaveAttribute('href', '/about');
  });
});
