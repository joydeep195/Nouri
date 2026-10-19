import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@/features/product/model/types';
import { PRODUCTS, profile } from '../../../../tests/fixtures';
import Result from './Result';

const product = (key: string): Product => ({ source: 'barcode', name: key, ...PRODUCTS[key] });

function renderResult(p: Product, over = {}) {
  const handlers = { onBack: vi.fn(), onScanAgain: vi.fn(), onEdit: vi.fn(), onLabel: vi.fn() };
  render(<Result product={p} profile={profile(over)} {...handlers} />);
  return handlers;
}

describe('<Result />', () => {
  it('shows the verdict, score and three pillars', () => {
    renderResult(product('coke'));
    expect(screen.getByText('Best avoided')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Score \d+ out of 100/ })).toBeInTheDocument();
    for (const label of ['Overall health', 'Gut comfort', 'Weight goals']) {
      expect(screen.getByLabelText(new RegExp(`^${label}: \\d+ out of 100$`))).toBeInTheDocument();
    }
  });

  it('lists the most serious issues first and can show the rest', async () => {
    renderResult(product('nutella'));
    const headsUp = screen.getByRole('heading', { name: /Heads up/ }).closest('section');
    if (!headsUp) throw new Error('no Heads up section');
    expect(within(headsUp).getAllByRole('heading', { level: 3 })).toHaveLength(4);
    await userEvent.click(within(headsUp).getByRole('button', { name: /Show \d+ more/ }));
    expect(within(headsUp).getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(4);
  });

  it('marks personal triggers and says why', () => {
    renderResult(product('yogurt'), { lactose: true });
    expect(screen.getByText(/which you've said bothers you/)).toBeInTheDocument();
    expect(screen.getByText('Your trigger')).toBeInTheDocument();
  });

  it('highlights matched ingredients as text, never as HTML', () => {
    const hostile = '<img src=x onerror="alert(1)">, sugar, carrageenan';
    const { container } = render(
      <Result
        product={{ source: 'typed', name: 'Test', ingredientsText: hostile }}
        profile={profile()}
        onBack={vi.fn()}
        onScanAgain={vi.fn()}
        onEdit={vi.fn()}
        onLabel={vi.fn()}
      />,
    );
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
    expect(container.querySelector('mark.bad')?.textContent).toMatch(/sugar|carrageenan/);
  });

  it('offers to read the label when there is nothing to score', async () => {
    const h = renderResult({ source: 'barcode', name: 'Mystery', code: '5449000000996' });
    await userEvent.click(screen.getByRole('button', { name: /Read the label/ }));
    expect(h.onLabel).toHaveBeenCalled();
  });

  it('links to the product page for barcode scans', () => {
    renderResult({ ...product('coke'), code: '5449000000996' });
    const link = screen.getByRole('link', { name: 'Open Food Facts' });
    expect(link).toHaveAttribute('href', 'https://world.openfoodfacts.org/product/5449000000996');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
