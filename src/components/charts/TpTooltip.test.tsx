/**
 * Unit tests for <TpTooltip>.
 *
 * Tested in isolation (not via <LineChart>) because the recharts mock
 * pattern used in every other chart test replaces `Tooltip` with a
 * pass-through `<g />`, so a `<Tooltip content={<TpTooltip />} />`
 * never reaches our component through that path. These tests cover
 * the rendering contract directly — what Recharts will pass in at
 * runtime.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TpTooltip } from '@/components/charts/TpTooltip';

describe('TpTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(
      <TpTooltip active={false} payload={[{ name: 'A', value: 1 }]} label="2026-05-01T00:00:00Z" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when payload is empty', () => {
    const { container } = render(<TpTooltip active payload={[]} label="x" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders header via labelFormatter and one row per payload item', () => {
    render(
      <TpTooltip
        active
        label="2026-05-01T14:30:00Z"
        labelFormatter={(l) => `formatted:${String(l).slice(0, 10)}`}
        payload={[
          { name: 'Reads', value: 1234, color: '#ff0000' },
          { name: 'Errors', value: 7, color: '#00ff00' },
        ]}
      />,
    );
    expect(screen.getByTestId('tp-tooltip')).toHaveAttribute('role', 'tooltip');
    expect(screen.getByTestId('tp-tooltip-label')).toHaveTextContent('formatted:2026-05-01');
    const rows = screen.getAllByTestId('tp-tooltip-row');
    expect(rows).toHaveLength(2);
    // values get toLocaleString grouping
    expect(rows[0]).toHaveTextContent('Reads');
    expect(rows[0]).toHaveTextContent(/1,234|1.234/);
    expect(rows[1]).toHaveTextContent('Errors');
    expect(rows[1]).toHaveTextContent('7');
  });

  it('applies token-driven panel styles', () => {
    render(
      <TpTooltip
        active
        label="x"
        payload={[{ name: 'A', value: 1, color: '#abcdef' }]}
      />,
    );
    const panel = screen.getByTestId('tp-tooltip');
    // assert the tokens land on the inline style (jsdom keeps the raw
    // `var(--…)` text rather than resolving)
    expect(panel.style.background).toContain('--color-surface-raised');
    expect(panel.style.border).toContain('--color-border');
    expect(panel.style.color).toContain('--color-text');
  });

  it('renders em-dash for null values', () => {
    render(
      <TpTooltip
        active
        label="x"
        payload={[{ name: 'A', value: null }]}
      />,
    );
    expect(screen.getByTestId('tp-tooltip-row')).toHaveTextContent('—');
  });

  it('falls back to dataKey when name is missing', () => {
    render(
      <TpTooltip
        active
        label="x"
        payload={[{ dataKey: 'tagReads', value: 5 }]}
      />,
    );
    expect(screen.getByTestId('tp-tooltip-row')).toHaveTextContent('tagReads');
  });
});
