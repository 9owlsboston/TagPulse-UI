/**
 * User preferences (Sprint 60–61, ADR-032 §7 step 2 — `PUT /ui-config/me`).
 *
 * The *write* surface for the configurable-UI engine: a user persists their own
 * presentation overrides to the server, so the choice follows them across
 * devices and sessions — and "Reset to team default" clears every override
 * (`PUT /ui-config/me` with `{}`), falling back to the tenant/role/system
 * default.
 *
 * Two panels today, both writing through the same `useUpdateMyUiConfig` path:
 *   - **Dashboard cards** (Sprint 60) — which `cards.dashboard` tiles to hide.
 *   - **Menu** (Sprint 61) — which left-sider sections to hide (`nav.hidden`)
 *     plus, for the *movable* items, where they should live (`nav.placement`).
 */
import { useMemo, useState } from 'react';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Checkbox from 'antd/es/checkbox';
import Segmented from 'antd/es/segmented';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { useCardGroup, useNavConfig } from '@/lib/uiConfig';
import { usePatchMyUiConfig, useUpdateMyUiConfig } from '@/hooks/useUiConfig';
import { NAV_MENU_SECTIONS, NAV_MOVABLE_ENTRIES, movableDefaultParent } from '@/lib/nav';
import { DASHBOARD_CARDS } from '@/pages/Dashboard';

const { Title, Paragraph } = Typography;

export function Preferences() {
  const resolvedCards = useCardGroup('dashboard');
  const resolvedNav = useNavConfig();
  // Save composes via the merge-style PATCH (ADR-032 v1.3) so persisting the
  // cards/nav panels no longer clobbers the user's per-table `columns` override
  // (and vice-versa). Reset still uses the wholesale PUT `{}` — the explicit
  // "clear my whole layer" verb.
  const patchMine = usePatchMyUiConfig();
  const resetMine = useUpdateMyUiConfig();

  // Seed local edit state from the resolved doc so the controls reflect the
  // user's current effective view.
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(() => new Set(resolvedCards.hidden));
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(
    () => new Set(resolvedNav.hidden),
  );
  // Placement: itemKey → chosen parent. Seed from the resolved override; an
  // unset item falls back to its registry default in the picker.
  const [placement, setPlacement] = useState<Record<string, string>>(
    () => ({ ...resolvedNav.placement }),
  );

  const visibleCardCount = useMemo(
    () => DASHBOARD_CARDS.filter((c) => !hiddenCards.has(c.id)).length,
    [hiddenCards],
  );
  const visibleSectionCount = useMemo(
    () => NAV_MENU_SECTIONS.filter((s) => !hiddenSections.has(s.key)).length,
    [hiddenSections],
  );

  const toggleCard = (id: string, checked: boolean) => {
    setHiddenCards((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (key: string, checked: boolean) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setItemParent = (itemKey: string, parent: string) => {
    setPlacement((prev) => {
      const next = { ...prev };
      // Only store a placement when it differs from the default — keeps the
      // override sparse (a default-placed item inherits, not overrides).
      if (parent === movableDefaultParent(itemKey)) delete next[itemKey];
      else next[itemKey] = parent;
      return next;
    });
  };

  const onSave = async () => {
    try {
      await patchMine.mutateAsync({
        cards: { dashboard: { hidden: [...hiddenCards] } },
        nav: { hidden: [...hiddenSections], placement },
      });
      message.success('Preferences saved');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save preferences');
    }
  };

  const onReset = async () => {
    try {
      await resetMine.mutateAsync({});
      setHiddenCards(new Set());
      setHiddenSections(new Set());
      setPlacement({});
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
        title="Menu"
        style={{ marginBottom: 16 }}
        extra={
          <Typography.Text type="secondary" data-testid="prefs-section-count">
            {visibleSectionCount} of {NAV_MENU_SECTIONS.length} sections shown
          </Typography.Text>
        }
      >
        <Paragraph type="secondary">Uncheck a section to hide it from your left menu.</Paragraph>
        <Space direction="vertical">
          {NAV_MENU_SECTIONS.map((s) => (
            <Checkbox
              key={s.key}
              checked={!hiddenSections.has(s.key)}
              onChange={(e) => toggleSection(s.key, e.target.checked)}
              data-testid={`prefs-section-${s.key}`}
            >
              {s.label}
            </Checkbox>
          ))}
        </Space>

        {NAV_MOVABLE_ENTRIES.length > 0 && (
          <>
            <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 8 }}>
              Choose where these items live:
            </Paragraph>
            <Space direction="vertical" size="middle">
              {NAV_MOVABLE_ENTRIES.map((m) => {
                const current =
                  placement[m.key] ?? movableDefaultParent(m.key) ?? m.candidates[0]?.value;
                return (
                  <Space key={m.key} align="center" wrap>
                    <Typography.Text>{m.label}</Typography.Text>
                    <Segmented
                      options={m.candidates.map((c) => ({ label: c.label, value: c.value }))}
                      value={current}
                      onChange={(value) => setItemParent(m.key, String(value))}
                      data-testid={`prefs-placement-${m.key}`}
                    />
                  </Space>
                );
              })}
            </Space>
          </>
        )}
      </Card>

      <Card
        title="Dashboard cards"
        extra={
          <Typography.Text type="secondary" data-testid="prefs-visible-count">
            {visibleCardCount} of {DASHBOARD_CARDS.length} shown
          </Typography.Text>
        }
      >
        <Paragraph type="secondary">Uncheck a card to hide it from your dashboard.</Paragraph>
        <Space direction="vertical">
          {DASHBOARD_CARDS.map((c) => (
            <Checkbox
              key={c.id}
              checked={!hiddenCards.has(c.id)}
              onChange={(e) => toggleCard(c.id, e.target.checked)}
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
          loading={patchMine.isPending}
          onClick={onSave}
          data-testid="prefs-save"
        >
          Save preferences
        </Button>
        <Button loading={resetMine.isPending} onClick={onReset} data-testid="prefs-reset">
          Reset to team default
        </Button>
      </Space>
    </div>
  );
}
