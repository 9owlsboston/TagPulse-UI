import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';
import {
  TimeRangePicker,
} from './TimeRangePicker';
import {
  PRESETS,
  DEFAULT_PRESET,
  getTzLabel,
} from './TimeRangePicker.constants';

describe('TimeRangePicker', () => {
  beforeEach(() => {
    // Freeze time so prev/next math is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports the new Sprint 57 preset list (drops 6h, adds 15m + 30d)', () => {
    const values = PRESETS.map((p) => p.value);
    expect(values).toEqual(['15m', '1h', '24h', '7d', '30d', 'custom']);
    expect(values).not.toContain('6h');
    expect(DEFAULT_PRESET).toBe('24h');
  });

  it('formats tz label as (UTC±HH:MM)', () => {
    expect(getTzLabel(dayjs('2026-06-01T12:00:00Z'))).toMatch(/^\(UTC[+-]\d{2}:\d{2}\)$/);
  });

  it('emits the default 24h window on mount', () => {
    const onChange = vi.fn();
    render(<TimeRangePicker onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);
    const call = onChange.mock.calls[0]!;
    const [start, end] = call;
    const widthMs = new Date(end).getTime() - new Date(start).getTime();
    expect(widthMs).toBe(24 * 60 * 60 * 1000);
  });

  it('disables the Next button when the current window reaches "now"', () => {
    render(<TimeRangePicker onChange={vi.fn()} />);
    // Default window ends at `now` → next would cross into the future → disabled.
    const next = screen.getByLabelText('Next time window');
    expect(next).toBeDisabled();
  });

  it('Prev shifts the window backward by its own width', () => {
    const onChange = vi.fn();
    render(<TimeRangePicker onChange={onChange} />);

    onChange.mockClear();
    fireEvent.click(screen.getByLabelText('Previous time window'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const call = onChange.mock.calls[0]!;
    const [start, end] = call;
    // Shifted back one full 24h width → now end == previous start time.
    expect(new Date(end).toISOString()).toBe('2026-05-31T12:00:00.000Z');
    expect(new Date(start).toISOString()).toBe('2026-05-30T12:00:00.000Z');
  });

  it('renders the tz badge', () => {
    render(<TimeRangePicker onChange={vi.fn()} />);
    const tz = screen.getByTestId('time-range-tz');
    expect(tz.textContent).toMatch(/^\(UTC[+-]\d{2}:\d{2}\)$/);
  });

  it('shows the default preset as selected', () => {
    render(<TimeRangePicker onChange={vi.fn()} />);
    const select = screen.getByTestId('time-range-preset');
    // AntD <Select> renders the selected option text inside the combobox.
    expect(within(select).getByText('Last 24 hours')).toBeInTheDocument();
  });
});
