// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { PlanSection } from './PlanSection';

afterEach(cleanup);

describe('PlanSection', () => {
  it('places a single header info control and reveals help on activate', async () => {
    const user = userEvent.setup();
    render(
      <PlanSection id="income" title="Income" defaultOpen help={<p>Optional long help copy.</p>}>
        <p>Section body</p>
      </PlanSection>,
    );

    expect(screen.queryByText('Optional long help copy.')).not.toBeInTheDocument();
    const info = screen.getByRole('button', { name: 'About Income' });
    await user.click(info);
    expect(screen.getByText('Optional long help copy.')).toBeInTheDocument();
    expect(screen.getByText('Section body')).toBeInTheDocument();
  });

  it('does not render an info control when help is omitted', () => {
    render(
      <PlanSection id="goal" title="Goal" defaultOpen>
        <p>Body</p>
      </PlanSection>,
    );
    expect(screen.queryByRole('button', { name: /About/i })).not.toBeInTheDocument();
  });
});
