import { DatePicker, Select, Space } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

const PRESETS: { label: string; value: string }[] = [
  { label: 'Last hour', value: '1h' },
  { label: 'Last 6 hours', value: '6h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Custom', value: 'custom' },
];

interface TimeRangePickerProps {
  onChange: (start: string, end: string) => void;
}

function presetToRange(value: string): [Dayjs, Dayjs] {
  const now = dayjs();
  switch (value) {
    case '1h': return [now.subtract(1, 'hour'), now];
    case '6h': return [now.subtract(6, 'hour'), now];
    case '24h': return [now.subtract(24, 'hour'), now];
    case '7d': return [now.subtract(7, 'day'), now];
    default: return [now.subtract(24, 'hour'), now];
  }
}

export function TimeRangePicker({ onChange }: TimeRangePickerProps) {
  const handlePresetChange = (value: string) => {
    if (value === 'custom') return;
    const [start, end] = presetToRange(value);
    onChange(start.toISOString(), end.toISOString());
  };

  const handleRangeChange = (_: unknown, dates: [string, string]) => {
    if (dates[0] && dates[1]) {
      onChange(dates[0], dates[1]);
    }
  };

  return (
    <Space>
      <Select
        defaultValue="24h"
        options={PRESETS}
        onChange={handlePresetChange}
        style={{ width: 140 }}
      />
      <RangePicker showTime onChange={handleRangeChange} />
    </Space>
  );
}
