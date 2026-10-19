import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { logger } from '@/shared/lib/logger';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('render failed');
}

describe('<ErrorBoundary />', () => {
  it('shows a recovery screen and logs the error instead of a blank page', () => {
    logger.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: /Reload Nouri/ })).toBeInTheDocument();
    expect(screen.queryByText(/render failed/)).toBeNull();
    expect(logger.entries().some((e) => e.detail === 'Error: render failed')).toBe(true);
  });

  it('renders children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
