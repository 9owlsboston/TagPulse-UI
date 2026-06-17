/**
 * Sprint 62 — device-local column visibility hook (Tier 1).
 *
 * Exercised through a tiny harness (the codebase tests hooks via render, not
 * `renderHook`). Covers the localStorage round-trip, rehydration, per-page
 * scoping, and the "Show all" / re-show paths that clear the stored key.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLocalColumnVisibility } from '@/lib/useLocalColumnVisibility';

function Harness({ page }: { page: string }) {
  const v = useLocalColumnVisibility(page);
  return (
    <div>
      <span data-testid="hidden">{[...v.hidden].sort().join(',')}</span>
      <span data-testid="hasHidden">{String(v.hasHidden)}</span>
      <button onClick={() => v.setColumnVisible('a', false)}>hide-a</button>
      <button onClick={() => v.setColumnVisible('a', true)}>show-a</button>
      <button onClick={() => v.setColumnVisible('b', false)}>hide-b</button>
      <button onClick={() => v.showAll()}>show-all</button>
    </div>
  );
}

const keyFor = (page: string) => `tagpulse.columns.${page}.hidden`;

beforeEach(() => localStorage.clear());

describe('useLocalColumnVisibility', () => {
  it('starts empty with no stored state', () => {
    render(<Harness page="p1" />);
    expect(screen.getByTestId('hidden').textContent).toBe('');
    expect(screen.getByTestId('hasHidden').textContent).toBe('false');
  });

  it('hides a column and persists it to localStorage', () => {
    render(<Harness page="p1" />);
    fireEvent.click(screen.getByText('hide-a'));
    expect(screen.getByTestId('hidden').textContent).toBe('a');
    expect(screen.getByTestId('hasHidden').textContent).toBe('true');
    expect(JSON.parse(localStorage.getItem(keyFor('p1'))!)).toEqual(['a']);
  });

  it('rehydrates the hidden set from localStorage on mount', () => {
    localStorage.setItem(keyFor('p1'), JSON.stringify(['b']));
    render(<Harness page="p1" />);
    expect(screen.getByTestId('hidden').textContent).toBe('b');
  });

  it('"Show all" clears the set and removes the stored key', () => {
    localStorage.setItem(keyFor('p1'), JSON.stringify(['a', 'b']));
    render(<Harness page="p1" />);
    fireEvent.click(screen.getByText('show-all'));
    expect(screen.getByTestId('hidden').textContent).toBe('');
    expect(localStorage.getItem(keyFor('p1'))).toBeNull();
  });

  it('re-showing the last hidden column removes the stored key', () => {
    render(<Harness page="p1" />);
    fireEvent.click(screen.getByText('hide-a'));
    fireEvent.click(screen.getByText('show-a'));
    expect(screen.getByTestId('hidden').textContent).toBe('');
    expect(localStorage.getItem(keyFor('p1'))).toBeNull();
  });

  it('is scoped per page key', () => {
    localStorage.setItem(keyFor('p1'), JSON.stringify(['a']));
    render(<Harness page="p2" />);
    expect(screen.getByTestId('hidden').textContent).toBe('');
  });

  it('ignores a corrupt stored value', () => {
    localStorage.setItem(keyFor('p1'), '{not json');
    render(<Harness page="p1" />);
    expect(screen.getByTestId('hidden').textContent).toBe('');
  });
});
