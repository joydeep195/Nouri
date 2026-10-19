import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('<App /> end to end in jsdom', () => {
  it('onboards, scores typed ingredients, and remembers the scan', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    // Onboarding
    await user.click(screen.getByRole('button', { name: /Get started/ }));
    await user.type(screen.getByLabelText('Your first name'), 'Asha');
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Dairy \/ lactose/ }));
    expect(screen.getByRole('button', { name: /Dairy \/ lactose/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('heading', { name: /all set, Asha/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start scanning/ }));

    // Home → type ingredients → result
    expect(screen.getByText(/Good (morning|afternoon|evening)|Hello/)).toHaveTextContent('Asha');
    await user.click(screen.getByRole('button', { name: /Type it in/ }));
    await user.type(screen.getByLabelText(/Food name/), 'Milk biscuits');
    await user.type(screen.getByLabelText('Ingredients'), 'Refined wheat flour (maida), sugar, milk solids, palm oil');
    await user.click(screen.getByRole('button', { name: /Check this food/ }));
    expect(screen.getByText('Best avoided')).toBeInTheDocument();
    expect(screen.getByText('Your trigger')).toBeInTheDocument();

    // Saved to history and still there after a "reload"
    unmount();
    render(<App />);
    expect(screen.getByText('Milk biscuits')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove Milk biscuits/ })).toBeInTheDocument();
  });

  it('recovers from corrupted storage instead of crashing', () => {
    localStorage.setItem('nouri.profile', '{"v":2,"data":');
    localStorage.setItem('nouri.history', JSON.stringify({ v: 2, data: [{ id: 1 }] }));
    render(<App />);
    expect(screen.getByRole('button', { name: /Get started/ })).toBeInTheDocument();
  });

  it('validates barcode numbers before looking them up', async () => {
    localStorage.setItem('nouri.profile', JSON.stringify({ v: 2, data: { onboarded: true } }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Enter a barcode number/ }));
    await user.type(screen.getByLabelText('Barcode number'), '5449000000997');
    expect(screen.getByRole('alert')).toHaveTextContent(/doesn't look right/);
    expect(screen.getByRole('button', { name: /Look it up/ })).toBeDisabled();
  });
});
