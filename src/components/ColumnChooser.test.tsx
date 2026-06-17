/**
 * Sprint 62 — reusable ColumnChooser toolbar control (Tier 1).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColumnChooser, type ColumnChooserItem } from '@/components/ColumnChooser';

const cols: ColumnChooserItem[] = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
  { key: 'c', label: 'Gamma' },
];

describe('ColumnChooser', () => {
  it('renders nothing when there are no addressable columns', () => {
    const { container } = render(
      <ColumnChooser columns={[]} hidden={new Set()} onToggle={() => {}} onShowAll={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('opens the popover and lists a checkbox per column', () => {
    render(<ColumnChooser columns={cols} hidden={new Set()} onToggle={() => {}} onShowAll={() => {}} />);
    fireEvent.click(screen.getByTestId('column-chooser-trigger'));
    expect(screen.getByTestId('column-toggle-a')).toBeInTheDocument();
    expect(screen.getByTestId('column-toggle-b')).toBeInTheDocument();
    expect(screen.getByTestId('column-toggle-c')).toBeInTheDocument();
  });

  it('reflects the hidden set as unchecked boxes', () => {
    render(
      <ColumnChooser columns={cols} hidden={new Set(['b'])} onToggle={() => {}} onShowAll={() => {}} />,
    );
    fireEvent.click(screen.getByTestId('column-chooser-trigger'));
    expect(screen.getByTestId('column-toggle-a')).toBeChecked();
    expect(screen.getByTestId('column-toggle-b')).not.toBeChecked();
  });

  it('fires onToggle(key, false) when a visible column is unchecked', () => {
    const onToggle = vi.fn();
    render(<ColumnChooser columns={cols} hidden={new Set()} onToggle={onToggle} onShowAll={() => {}} />);
    fireEvent.click(screen.getByTestId('column-chooser-trigger'));
    fireEvent.click(screen.getByTestId('column-toggle-a'));
    expect(onToggle).toHaveBeenCalledWith('a', false);
  });

  it('fires onToggle(key, true) when a hidden column is re-checked', () => {
    const onToggle = vi.fn();
    render(
      <ColumnChooser columns={cols} hidden={new Set(['a'])} onToggle={onToggle} onShowAll={() => {}} />,
    );
    fireEvent.click(screen.getByTestId('column-chooser-trigger'));
    fireEvent.click(screen.getByTestId('column-toggle-a'));
    expect(onToggle).toHaveBeenCalledWith('a', true);
  });

  it('shows a shown/total hint on the trigger while columns are hidden', () => {
    render(
      <ColumnChooser columns={cols} hidden={new Set(['a'])} onToggle={() => {}} onShowAll={() => {}} />,
    );
    expect(screen.getByTestId('column-chooser-trigger').textContent).toContain('2/3');
  });

  it('"Show all" is disabled when nothing is hidden', () => {
    render(<ColumnChooser columns={cols} hidden={new Set()} onToggle={() => {}} onShowAll={() => {}} />);
    fireEvent.click(screen.getByTestId('column-chooser-trigger'));
    expect(screen.getByTestId('column-chooser-show-all')).toBeDisabled();
  });

  it('"Show all" fires onShowAll when something is hidden', () => {
    const onShowAll = vi.fn();
    render(
      <ColumnChooser columns={cols} hidden={new Set(['b'])} onToggle={() => {}} onShowAll={onShowAll} />,
    );
    fireEvent.click(screen.getByTestId('column-chooser-trigger'));
    fireEvent.click(screen.getByTestId('column-chooser-show-all'));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });
});
