/**
 * Sprint 63 — server-backed cross-device column visibility (Tier 2).
 *
 * Drives the hook through a tiny harness and asserts each action issues the
 * right `PATCH` / `DELETE` write. `useColumnGroup` (the resolved floor+user
 * hidden set) and the two mutation hooks are mocked so the test stays a unit.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useColumnVisibility } from '@/lib/useColumnVisibility';

const mockColumnGroup = vi.fn();
const patchMutate = vi.fn();
const resetMutate = vi.fn();
let patchPending = false;
let resetPending = false;

vi.mock('@/lib/uiConfig', () => ({
  useColumnGroup: (page: string) => mockColumnGroup(page),
}));

vi.mock('@/hooks/useUiConfig', () => ({
  usePatchMyUiConfig: () => ({ mutate: patchMutate, isPending: patchPending }),
  useResetMyColumns: () => ({ mutate: resetMutate, isPending: resetPending }),
}));

function Harness({ page }: { page: string }) {
  const cv = useColumnVisibility(page);
  return (
    <div>
      <span data-testid="hidden">{[...cv.hidden].sort().join(',')}</span>
      <span data-testid="has-hidden">{String(cv.hasHidden)}</span>
      <span data-testid="saving">{String(cv.isSaving)}</span>
      <button onClick={() => cv.setColumnVisible('tid', false)}>hide-tid</button>
      <button onClick={() => cv.setColumnVisible('epc', true)}>show-epc</button>
      <button onClick={() => cv.showAll()}>show-all</button>
      <button onClick={() => cv.resetToTeamDefault()}>reset</button>
    </div>
  );
}

describe('useColumnVisibility', () => {
  beforeEach(() => {
    patchMutate.mockClear();
    resetMutate.mockClear();
    patchPending = false;
    resetPending = false;
    mockColumnGroup.mockReturnValue({ hidden: ['epc'], order: [], advanced: [] });
  });

  it('exposes the resolved hidden set', () => {
    render(<Harness page="assets" />);
    expect(screen.getByTestId('hidden').textContent).toBe('epc');
    expect(screen.getByTestId('has-hidden').textContent).toBe('true');
  });

  it('hiding a column PATCHes the full intended hidden list (current ∪ key)', () => {
    render(<Harness page="assets" />);
    fireEvent.click(screen.getByText('hide-tid'));
    expect(patchMutate).toHaveBeenCalledWith({ columns: { assets: { hidden: ['epc', 'tid'] } } });
  });

  it('showing a column PATCHes the hidden list without that key', () => {
    render(<Harness page="assets" />);
    fireEvent.click(screen.getByText('show-epc'));
    expect(patchMutate).toHaveBeenCalledWith({ columns: { assets: { hidden: [] } } });
  });

  it('"Show all" PATCHes hidden = [] (overrides the floor)', () => {
    render(<Harness page="tag_reads" />);
    fireEvent.click(screen.getByText('show-all'));
    expect(patchMutate).toHaveBeenCalledWith({ columns: { tag_reads: { hidden: [] } } });
  });

  it('"Show all" is a no-op when nothing is hidden', () => {
    mockColumnGroup.mockReturnValue({ hidden: [], order: [], advanced: [] });
    render(<Harness page="assets" />);
    fireEvent.click(screen.getByText('show-all'));
    expect(patchMutate).not.toHaveBeenCalled();
  });

  it('"Reset to team default" DELETEs the page leaf', () => {
    render(<Harness page="assets" />);
    fireEvent.click(screen.getByText('reset'));
    expect(resetMutate).toHaveBeenCalledWith('assets');
  });

  it('reports isSaving while either write is in flight', () => {
    patchPending = true;
    render(<Harness page="assets" />);
    expect(screen.getByTestId('saving').textContent).toBe('true');
  });
});
