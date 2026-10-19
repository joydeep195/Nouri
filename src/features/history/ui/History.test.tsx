import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PRODUCTS, profile } from '../../../../tests/fixtures';
import type { HistoryEntry } from '../model/history';
import History from './History';

const entry = (key: string, at: number): HistoryEntry => ({
  id: key,
  at,
  product: { source: 'barcode', ...PRODUCTS[key], name: key },
});

describe('<History />', () => {
  const now = Date.now();
  const history = [entry('water', now), entry('coke', now - 60_000), entry('dietCoke', now - 3 * 86400_000)];

  function setup() {
    const props = { onOpen: vi.fn(), onDelete: vi.fn(), onClear: vi.fn() };
    render(<History history={history} profile={profile()} {...props} />);
    return props;
  }

  it('groups scans by day', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('filters by verdict', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Avoid' }));
    expect(screen.getByRole('button', { name: 'Avoid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('coke')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Good picks' }));
    expect(screen.getByText('water')).toBeInTheDocument();
  });

  it('opens, removes and clears entries', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const props = setup();
    await userEvent.click(screen.getByText('water'));
    expect(props.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'water' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove coke' }));
    expect(props.onDelete).toHaveBeenCalledWith('coke');
    await userEvent.click(screen.getByRole('button', { name: /Clear history/ }));
    expect(props.onClear).toHaveBeenCalled();
  });

  it('has a friendly empty state', () => {
    render(<History history={[]} profile={profile()} onOpen={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
  });
});
