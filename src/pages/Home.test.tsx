// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';

// Vitest globals are disabled, so Testing Library's automatic cleanup does not run.
afterEach(cleanup);

describe('Home', () => {
  it('shows the brand and both entry points', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'GigGauge' })).toBeInTheDocument();
    expect(screen.getByText('Know what your work is really worth.')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /quick estimate/i })).toHaveAttribute(
      'href',
      '/quick?new=1',
    );
    expect(screen.getByRole('link', { name: /detailed plan/i })).toHaveAttribute('href', '/plan');

    expect(screen.getByRole('link', { name: /current employed job/i })).toHaveAttribute(
      'href',
      '/quick?example=employedJob',
    );
    expect(screen.getByRole('link', { name: /private-hire driving plan/i })).toHaveAttribute(
      'href',
      '/quick?example=privateHire',
    );
  });
});
