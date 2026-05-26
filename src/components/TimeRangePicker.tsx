/**
 * <TimeRangePicker> — unified time-range control for telemetry surfaces.
 *
 * Sprint 57 Phase C.1 rework (see docs/sprint-57-telemetry-charting.md
 * § A.2 + § A.1.1):
 *   - presets: `15m, 1h, 24h, 7d, 30d, custom` (replaces old `1h, 6h, 24h, 7d, custom`)
 *   - displays active timezone offset next to the picker (e.g. `(UTC-05:00)`)
 *   - prev/next stepper arrows shift the active window by its own width;
 *     forward arrow disabled when stepping would cross `now`
 *   - callback signature unchanged — `(start: string, end: string) => void` ISO —
 *     so the 4 existing callers (DataExplorer, TelemetryDashboard,
 *     DeviceTelemetryTab, SubjectTelemetryTab) compile without edits.
 */
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import Button from 'antd/es/button';
import DatePicker from 'antd/es/date-picker';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Tooltip from 'antd/es/tooltip';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_PRESET,
  getTzLabel,
  PRESETS,
  presetToRange,
  type TimeRangePreset,
} from './TimeRangePicker.constants';

const { RangePicker } = DatePicker;

interface TimeRangePickerProps {
  onChange: (start: string, end: string) => void;
}

export function TimeRangePicker({ onChange }: TimeRangePickerProps) {
  const [preset, setPreset] = useState<TimeRangePreset>(DEFAULT_PRESET);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => presetToRange(DEFAULT_PRESET));

  // Emit the default range on mount so consumers start with the same window
  // the picker displays. Without this, callers reading state on first render
  // see `start`/`end` only after the user touches the picker.
  useEffect(() => {
    onChange(range[0].toISOString(), range[1].toISOString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback((next: [Dayjs, Dayjs]) => {
    setRange(next);
    onChange(next[0].toISOString(), next[1].toISOString());
  }, [onChange]);

  const handlePresetChange = useCallback((value: TimeRangePreset) => {
    setPreset(value);
    if (value === 'custom') return;
    emit(presetToRange(value));
  }, [emit]);

  const handleRangeChange = useCallback((
    dates: [Dayjs | null, Dayjs | null] | null,
  ) => {
    if (!dates || !dates[0] || !dates[1]) return;
    setPreset('custom');
    emit([dates[0], dates[1]]);
  }, [emit]);

  const widthMs = useMemo(
    () => range[1].valueOf() - range[0].valueOf(),
    [range],
  );

  const handlePrev = useCallback(() => {
    emit([
      range[0].subtract(widthMs, 'millisecond'),
      range[1].subtract(widthMs, 'millisecond'),
    ]);
  }, [emit, range, widthMs]);

  const nextWouldCrossNow = useMemo(
    () => range[1].add(widthMs, 'millisecond').valueOf() > dayjs().valueOf(),
    [range, widthMs],
  );

  const handleNext = useCallback(() => {
    if (nextWouldCrossNow) return;
    emit([
      range[0].add(widthMs, 'millisecond'),
      range[1].add(widthMs, 'millisecond'),
    ]);
  }, [emit, range, widthMs, nextWouldCrossNow]);

  return (
    <Space size="small" align="center">
      <Tooltip title="Previous window">
        <Button
          aria-label="Previous time window"
          icon={<LeftOutlined />}
          onClick={handlePrev}
        />
      </Tooltip>
      <Select
        value={preset}
        options={PRESETS}
        onChange={handlePresetChange}
        style={{ width: 160 }}
        data-testid="time-range-preset"
      />
      <Tooltip title={nextWouldCrossNow ? 'Already at present time' : 'Next window'}>
        {/* Wrap disabled button in <span> so the Tooltip still anchors. */}
        {nextWouldCrossNow ? (
          <span>
            <Button aria-label="Next time window" icon={<RightOutlined />} disabled />
          </span>
        ) : (
          <Button
            aria-label="Next time window"
            icon={<RightOutlined />}
            onClick={handleNext}
          />
        )}
      </Tooltip>
      <RangePicker
        showTime
        value={range}
        onChange={handleRangeChange}
        allowClear={false}
      />
      <span
        data-testid="time-range-tz"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {getTzLabel()}
      </span>
    </Space>
  );
}
