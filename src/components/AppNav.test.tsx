// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppNav } from './AppNav';

afterEach(cleanup);

describe('AppNav', () => {
  it('shows only Home, Quick and Plan', () => {
    render(
      <MemoryRouter>
        <AppNav />
      </MemoryRouter>,
    );
    const homeLinks = screen.getAllByRole('link', { name: 'Home' });
    const quickLinks = screen.getAllByRole('link', { name: 'Quick' });
    const planLinks = screen.getAllByRole('link', { name: 'Plan' });
    expect(homeLinks.length).toBeGreaterThan(0);
    expect(homeLinks[0]).toHaveAttribute('href', '/');
    expect(quickLinks[0]).toHaveAttribute('href', '/quick');
    expect(planLinks[0]).toHaveAttribute('href', '/plan');
    expect(screen.queryByRole('link', { name: /compare/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /tracker/i })).not.toBeInTheDocument();
  });
});
