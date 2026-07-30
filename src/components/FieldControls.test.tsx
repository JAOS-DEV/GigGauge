// @vitest-environment jsdom
import { useState, type ReactElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { DraftNumberField } from './FieldControls';

function DraftHarness({
  initial = 46,
  min = 1,
  max = 52,
}: {
  initial?: number;
  min?: number;
  max?: number;
}): ReactElement {
  const [value, setValue] = useState(initial);
  return (
    <DraftNumberField
      id="workingWeeks"
      label="Working weeks per year"
      value={value}
      min={min}
      max={max}
      onCommit={setValue}
    />
  );
}

afterEach(cleanup);

describe('DraftNumberField', () => {
  it('allows clearing the last digit while editing', async () => {
    const user = userEvent.setup();
    render(<DraftHarness initial={46} />);

    const input = screen.getByLabelText('Working weeks per year');
    expect(input).toHaveValue('46');

    await user.clear(input);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('commits a replacement value after clearing', async () => {
    const user = userEvent.setup();
    render(<DraftHarness initial={46} />);

    const input = screen.getByLabelText('Working weeks per year');
    await user.clear(input);
    await user.type(input, '40');
    expect(input).toHaveValue('40');

    await user.tab();
    expect(input).toHaveValue('40');
  });

  it('restores the last committed value on blur when empty', async () => {
    const user = userEvent.setup();
    render(<DraftHarness initial={46} />);

    const input = screen.getByLabelText('Working weeks per year');
    await user.clear(input);
    await user.tab();
    expect(input).toHaveValue('46');
  });
});
