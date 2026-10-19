import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import IngredientsForm from './IngredientsForm';

const setup = (props: Partial<Parameters<typeof IngredientsForm>[0]> = {}) => {
  const onSubmit = vi.fn();
  render(<IngredientsForm title="Type ingredients" source="typed" onSubmit={onSubmit} onBack={vi.fn()} {...props} />);
  return { onSubmit, user: userEvent.setup() };
};

describe('<IngredientsForm />', () => {
  it('needs some ingredients or nutrition before it can be checked', async () => {
    const { user } = setup();
    const submit = screen.getByRole('button', { name: /Check this food/ });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Ingredients'), 'Oats, salt');
    expect(submit).toBeEnabled();
  });

  it('builds a product from what was typed', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/Food name/), 'Porridge');
    await user.type(screen.getByLabelText('Ingredients'), 'Rolled oats, milk');
    await user.type(screen.getByLabelText('Calories (kcal)'), '370');
    await user.type(screen.getByLabelText('Sugar (g)'), '1,5');
    await user.click(screen.getByRole('button', { name: /Check this food/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'typed',
        name: 'Porridge',
        ingredientsText: 'Rolled oats, milk',
        nutrition: expect.objectContaining({ kcal: 370, sugars: 1.5, fat: null }) as unknown,
      }),
    );
  });

  it('rejects impossible nutrition values', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Ingredients'), 'Oats');
    await user.type(screen.getByLabelText('Sugar (g)'), '250');
    expect(screen.getByText('0 to 100')).toBeInTheDocument();
    expect(screen.getByLabelText('Sugar (g)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: /Check this food/ })).toBeDisabled();
  });

  it('keeps the barcode but drops database ingredient data when editing a scan', async () => {
    const { onSubmit, user } = setup({
      base: {
        source: 'barcode',
        code: '5449000000996',
        name: 'Cola',
        additives: ['en:e150d'],
        allergens: ['milk'],
        nova: 4,
      },
      initial: { name: 'Cola', ingredients: 'Water, sugar' },
    });
    await user.click(screen.getByRole('button', { name: /Check this food/ }));
    const p = onSubmit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(p).toMatchObject({ source: 'barcode', code: '5449000000996', ingredientsText: 'Water, sugar' });
    expect(p).not.toHaveProperty('additives');
    expect(p).not.toHaveProperty('allergens');
    expect(p).not.toHaveProperty('nova');
  });
});
