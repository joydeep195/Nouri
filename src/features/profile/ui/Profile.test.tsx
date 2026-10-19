import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { profile as makeProfile } from '../../../../tests/fixtures';
import type { Profile as ProfileData } from '../model/profile';
import Profile from './Profile';

function Harness({ onReset = vi.fn(), spy }: { onReset?: () => void; spy: (p: ProfileData) => void }) {
  const [p, setP] = useState(makeProfile({ name: 'Asha' }));
  spy(p);
  return <Profile profile={p} setProfile={setP} onBack={vi.fn()} onReset={onReset} />;
}

describe('<Profile />', () => {
  it('toggles goals and sensitivities', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await userEvent.click(screen.getByRole('switch', { name: /Dairy \/ lactose/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Losing weight/ }));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ lactose: true, weightLoss: false }));
  });

  it('adds and removes personal triggers with validation', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} />);
    const input = screen.getByLabelText('Add a trigger food');

    await user.type(input, '<script>{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(/letters and numbers/);

    await user.clear(input);
    await user.type(input, 'Sweet Corn{Enter}');
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ triggers: ['sweet corn'] }));

    await user.click(screen.getByRole('button', { name: 'Remove sweet corn' }));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ triggers: [] }));
  });

  it('asks before resetting the app', async () => {
    const onReset = vi.fn();
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal('confirm', confirm);
    render(<Harness spy={vi.fn()} onReset={onReset} />);
    const button = screen.getByRole('button', { name: 'Reset app' });
    await userEvent.click(button);
    expect(onReset).not.toHaveBeenCalled();
    await userEvent.click(button);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
