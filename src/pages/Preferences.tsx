/**
 * User preferences (Sprint 60, ADR-032 §7 step 2 — `PUT /ui-config/me`).
 *
 * The first *write* surface for the configurable-UI engine: a user persists
 * their own presentation overrides (here, which dashboard cards to hide) to the
 * server, so the choice follows them across devices and sessions — and "Reset
 * to team default" clears the override (`PUT /ui-config/me` with `{}`), falling
 * back to the tenant/role/system default.
 *
 * Scope note: this page intentionally starts with the dashboard-card visibility
 * pref because it has a concrete, visible effect (the Dashboard consumes
 * `cards.dashboard`). Other user-controllable leaves (column hides, default
 * sort, nav) plug into the same `useUpdateMyUiConfig` write path as they earn a
 * surface.
 */
import { useMemo, useState } from 'react';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Checkbox from 'antd/es/checkbox';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { useCardGroup } from '@/lib/uiConfig';
import { useUpdateMyUiConfig } from '@/hooks/useUiConfig';
import { DASHBOARD_CARDS } from '@/pages/Dashboard';

const { Title, Paragraph } = Typography;

export function Preferences() {
  const resolved = useCardGroup('dashboard');
  const updateMine = useUpdateMyUiConfig();

  // Seed the local edit state from the resolved doc so the checkboxes reflect
  // the user's current effective view.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(resolved.hidden));

  const visibleCount = useMemo(
    () => DASHBOARD_CARDS.filter((c) => !hidden.has(c.id)).length,
    [hidden],
  );

  const toggle = (id: string, checked: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSave = async () => {
    try {
      await updateMine.mutateAsync({ cards: { dashboard: { hidden: [...hidden] } } });
      message.success('Preferences saved');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save preferences');
    }
  };

  const onReset = async () => {
    try {
      await updateMine.mutateAsync({});
      setHidden(new Set());
      message.success('Reset to team default');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to reset preferences');
    }
  };

  return (
    <div>
      <Title level={2}>Preferences</Title>
      <Paragraph type="secondary">
        Your personal presentation choices. They follow your account across devices and sit on
        top of your team and tenant defaults. "Reset to team default" clears your overrides.
      </Paragraph>

      <Card
        title="Dashboard cards"
        extra={
          <Typography.Text type="secondary" data-testid="prefs-visible-count">
            {visibleCount} of {DASHBOARD_CARDS.length} shown
          </Typography.Text>
        }
      >
        <Paragraph type="secondary">
          Uncheck a card to hide it from your dashboard.
        </Paragraph>
        <Space direction="vertical">
          {DASHBOARD_CARDS.map((c) => (
            <Checkbox
              key={c.id}
              checked={!hidden.has(c.id)}
              onChange={(e) => toggle(c.id, e.target.checked)}
              data-testid={`prefs-card-${c.id}`}
            >
              {c.title}
            </Checkbox>
          ))}
        </Space>
      </Card>

      <Space style={{ marginTop: 16 }}>
        <Button
          type="primary"
          loading={updateMine.isPending}
          onClick={onSave}
          data-testid="prefs-save"
        >
          Save preferences
        </Button>
        <Button
          loading={updateMine.isPending}
          onClick={onReset}
          data-testid="prefs-reset"
        >
          Reset to team default
        </Button>
      </Space>
    </div>
  );
}
