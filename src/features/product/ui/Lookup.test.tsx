import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import nutella from '../../../../tests/fixtures/off-nutella.json';
import Lookup from './Lookup';
import QrLink from './QrLink';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function renderLookup(code: string) {
  const props = { onFound: vi.fn(), onBack: vi.fn(), onLabel: vi.fn(), onType: vi.fn(), onRescan: vi.fn() };
  render(<Lookup code={code} {...props} />);
  return props;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<Lookup />', () => {
  it('hands a found product on', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(nutella)));
    const props = renderLookup('3017620422003');
    expect(screen.getByRole('status')).toHaveTextContent(/Looking it up/);
    await vi.waitFor(() => {
      expect(props.onFound).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nutella' }));
    });
  });

  it('explains when a product is not in the database', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ status: 0 })));
    const props = renderLookup('5449000000996');
    expect(await screen.findByText("We don't know this one yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Read the label/ }));
    expect(props.onLabel).toHaveBeenCalledWith({ code: '5449000000996', source: 'barcode' });
  });

  it('offers the label reader when the record has no ingredients', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ status: 1, product: { product_name: 'Bare record' } })));
    renderLookup('5449000000996');
    expect(await screen.findByRole('heading', { name: 'Bare record' })).toBeInTheDocument();
  });

  it('shows a retryable error when offline', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    renderLookup('5449000000996');
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(/internet connection/);
    fetchMock.mockResolvedValue(json(nutella));
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('never calls the network for a barcode with a bad check digit', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderLookup('5449000000997');
    expect(screen.getByText("That barcode doesn't look right")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('<QrLink />', () => {
  const noop = { onBack: vi.fn(), onLabel: vi.fn(), onRescan: vi.fn() };

  it('offers to open a secure link and shows where it goes', () => {
    render(<QrLink url="https://www.example.com/promo" {...noop} />);
    const link = screen.getByRole('link', { name: /Open example.com/ });
    expect(link).toHaveAttribute('href', 'https://www.example.com/promo');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('refuses to open insecure links', () => {
    render(<QrLink url="http://example.com" {...noop} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/not secure/)).toBeInTheDocument();
  });

  it('shows plain text codes', () => {
    render(<QrLink text="WIFI:S:home;;" {...noop} />);
    expect(screen.getByText("This code isn't a product")).toBeInTheDocument();
  });
});
