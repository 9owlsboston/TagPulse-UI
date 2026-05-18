import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LastUpdate, formatRelative } from '@/components/LastUpdate';

describe('formatRelative', () => {
  it('returns "just now" for sub-5s gaps', () => {
    const now = 1_700_000_000_000;
    expect(formatRelative(now, now)).toBe('just now');
    expect(formatRelative(now, now - 2_000)).toBe('just now');
  });

  it('returns seconds / minutes / hours / days as the gap grows', () => {
    const now = 1_700_000_000_000;
    expect(formatRelative(now, now - 30_000)).toBe('30s ago');
    expect(formatRelative(now, now - 2 * 60_000)).toBe('2m ago');
    expect(formatRelative(now, now - 3 * 3_600_000)).toBe('3h ago');
    expect(formatRelative(now, now - 4 * 86_400_000)).toBe('4d ago');
  });
});

describe('LastUpdate', () => {
  it('shows the relative label and full timestamp tooltip', () => {
    const ts = new Date(Date.now() - 2 * 60_000); // 2 minutes ago
    render(<LastUpdate timestamp={ts} />);
    expect(screen.getByText(/Updated 2m ago/)).toBeInTheDocument();
  });

  it('shows fallback copy when no timestamp is given', () => {
    render(<LastUpdate />);
    expect(screen.getByText('Not yet loaded')).toBeInTheDocument();
  });

  it('invokes onRefresh when the button is clicked', () => {
    const onRefresh = vi.fn();
    render(<LastUpdate timestamp={Date.now()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId('last-update-refresh'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('hides the refresh button when no handler is passed', () => {
    render(<LastUpdate timestamp={Date.now()} />);
    expect(screen.queryByTestId('last-update-refresh')).not.toBeInTheDocument();
  });
});
