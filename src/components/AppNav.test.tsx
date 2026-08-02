// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppNav } from './AppNav';

afterEach(cleanup);

describe('AppNav', () => {
  it('shows seven primary items including Compare and Tracker, but not About', () => {
    render(
      <MemoryRouter>
        <AppNav />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link', { name: 'Home' })[0]).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link', { name: 'Quick' })[0]).toHaveAttribute('href', '/quick');
    expect(screen.getAllByRole('link', { name: 'Plan' })[0]).toHaveAttribute('href', '/plan');
    expect(screen.getAllByRole('link', { name: 'Time off' })[0]).toHaveAttribute(
      'href',
      '/time-off',
    );
    expect(screen.getAllByRole('link', { name: 'Scenarios' })[0]).toHaveAttribute(
      'href',
      '/scenarios',
    );
    expect(screen.getAllByRole('link', { name: 'Compare' })[0]).toHaveAttribute(
      'href',
      '/compare',
    );
    expect(screen.getAllByRole('link', { name: 'Tracker' })[0]).toHaveAttribute(
      'href',
      '/tracker',
    );
    expect(screen.queryByRole('link', { name: /^about$/i })).not.toBeInTheDocument();
  });
});
