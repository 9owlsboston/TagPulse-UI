import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Button from 'antd/es/button';
import { ListPageShell } from '@/components/ListPageShell';

describe('ListPageShell', () => {
  it('renders the bare minimum: title + children', () => {
    render(
      <ListPageShell title="Products">
        <div data-testid="body">table-goes-here</div>
      </ListPageShell>,
    );
    expect(screen.getByRole('heading', { name: 'Products', level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('honours titleLevel override', () => {
    render(
      <ListPageShell title="Tags" titleLevel={3}>
        <div />
      </ListPageShell>,
    );
    expect(screen.getByRole('heading', { name: 'Tags', level: 3 })).toBeInTheDocument();
  });

  it('renders count badge when count is provided (including zero)', () => {
    const { rerender } = render(
      <ListPageShell title="Assets" count={42} countTestId="asset-count">
        <div />
      </ListPageShell>,
    );
    const badge = screen.getByTestId('asset-count');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('42');

    rerender(
      <ListPageShell title="Assets" count={0} countTestId="asset-count">
        <div />
      </ListPageShell>,
    );
    expect(screen.getByTestId('asset-count').textContent).toContain('0');
  });

  it('omits the badge entirely when count is undefined', () => {
    render(
      <ListPageShell title="Assets" countTestId="asset-count">
        <div />
      </ListPageShell>,
    );
    expect(screen.queryByTestId('asset-count')).not.toBeInTheDocument();
  });

  it('renders the primaryAction in the header', () => {
    render(
      <ListPageShell
        title="Assets"
        primaryAction={<Button data-testid="add-btn">Register Asset</Button>}
      >
        <div />
      </ListPageShell>,
    );
    expect(screen.getByTestId('add-btn')).toBeInTheDocument();
  });

  it('renders the toolbar above children', () => {
    render(
      <ListPageShell title="Assets" toolbar={<div data-testid="toolbar">filters</div>}>
        <div data-testid="body">table</div>
      </ListPageShell>,
    );
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('renders the aside beside children when provided', () => {
    render(
      <ListPageShell title="Assets" aside={<div data-testid="aside">panel</div>}>
        <div data-testid="body">table</div>
      </ListPageShell>,
    );
    expect(screen.getByTestId('aside')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('omits the aside when not provided', () => {
    render(
      <ListPageShell title="Assets">
        <div data-testid="body">table</div>
      </ListPageShell>,
    );
    expect(screen.queryByTestId('aside')).not.toBeInTheDocument();
  });

  it('renders string description as secondary text', () => {
    render(
      <ListPageShell title="Tags" description="Tag registry (ADR 028).">
        <div />
      </ListPageShell>,
    );
    expect(screen.getByText(/Tag registry/)).toBeInTheDocument();
  });

  it('renders ReactNode description as-is', () => {
    render(
      <ListPageShell title="Tags" description={<span data-testid="custom-desc">custom</span>}>
        <div />
      </ListPageShell>,
    );
    expect(screen.getByTestId('custom-desc')).toBeInTheDocument();
  });

  it('applies wrapper testId', () => {
    render(
      <ListPageShell title="Assets" testId="asset-list-page">
        <div />
      </ListPageShell>,
    );
    expect(screen.getByTestId('asset-list-page')).toBeInTheDocument();
  });
});
