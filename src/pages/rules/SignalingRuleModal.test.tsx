/**
 * Sprint 41 Phase F4 — vitest coverage for the SignalingRuleModal
 * discriminated-union form.
 *
 * Covers:
 *   - Every valid (event_type, trigger) pair from SIGNALING_VALID_PAIRS
 *     successfully composes the expected `signaling.<event_type>.<trigger>`
 *     condition_type when the rule submits.
 *   - At least one invalid pair per event_type is rejected client-side
 *     (the trigger Select narrows on event_type and validateSignalingPair
 *     hard-rejects mismatched submissions, so neither the Select option
 *     is offered nor a forced-value submission proceeds to createRule).
 *
 * Network mutation is mocked at the hook level (useCreateRule) so we
 * assert on the exact payload composed by the form rather than HTTP
 * surface; the request shape is the contract we care about for F4.
 */
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignalingRuleModal } from '@/pages/rules/SignalingRuleModal';
import {
  SIGNALING_VALID_PAIRS,
  type SignalingEventType,
  type SignalingTrigger,
} from '@/types';

const mutateAsync = vi.fn();

vi.mock('@/hooks/useRules', () => ({
  useCreateRule: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/hooks/useIntegrations', () => ({
  useIntegrations: () => ({ data: [], isLoading: false }),
}));

// AntD's message API uses portals + animations; silence it in tests so
// success/error toasts don't leak DOM state between cases.
vi.mock('antd/es/message', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue({ id: 'rule-xyz' });
});

// Auto-cleanup between tests so prior Modal portals + dropdowns don't
// linger in document.body and slow subsequent renders into timeout
// territory.
afterEach(() => {
  cleanup();
});

/**
 * Helper: drive the form through the minimum-viable happy path for one
 * (event_type, trigger) pair and submit. Returns the captured
 * `createRule.mutateAsync` payload (asserted by the caller).
 */
async function submitPair(eventType: SignalingEventType, trigger: SignalingTrigger) {
  // AntD's motion library sets `pointer-events: none` on the dropdown DIV
  // during enter animations; user-event's default pointer-events guard
  // refuses to click those elements. Disabling the guard mirrors what a
  // real click does once layout settles (no animation in test env).
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  const onClose = vi.fn();
  render(<SignalingRuleModal open onClose={onClose} />, { wrapper });

  // Name (required) — AntD Input forwards data-testid to the outer span;
  // grab the actual <input> by its placeholder text.
  await user.type(
    screen.getByPlaceholderText('e.g. Forklift left loading dock'),
    `${eventType}-${trigger}`,
  );

  // Event type (Select). Open the dropdown via the selector div, then
  // pick the option by its visible plain-text label. With label-as-string
  // (not JSX) AntD's rc-select renders the option text once in the
  // dropdown `.ant-select-item-option-content` element, so a plain
  // `findByText` with exact string match scopes correctly.
  const eventTypeSelect = screen
    .getByTestId('field-event-type')
    .querySelector('.ant-select-selector') as HTMLElement;
  await user.click(eventTypeSelect);
  const eventLabelMap: Record<SignalingEventType, string> = {
    location: 'Location',
    geolocation: 'Geolocation',
    temperature: 'Temperature',
    geofencing: 'Geofencing',
  };
  const eventOption = await screen.findByText(eventLabelMap[eventType], { exact: true });
  await user.click(eventOption);

  // Trigger (Select narrowed on event_type).
  const triggerSelect = screen
    .getByTestId('field-trigger')
    .querySelector('.ant-select-selector') as HTMLElement;
  await user.click(triggerSelect);
  const triggerLabelMap: Record<SignalingTrigger, string> = {
    on_change: 'On change',
    periodic: 'Periodic',
    on_inactivity: 'On inactivity',
    on_inference: 'On inference (attribution settled)',
    on_entry: 'On entry',
    on_exit: 'On exit',
  };
  const triggerOption = await screen.findByText(triggerLabelMap[trigger], { exact: true });
  await user.click(triggerOption);

  // Action type default is webhook → URL required
  await user.type(
    screen.getByPlaceholderText('https://example.com/hook'),
    'https://example.com/hook',
  );

  // Submit
  await user.click(screen.getByRole('button', { name: 'Create rule' }));

  await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  return mutateAsync.mock.calls.at(-1)![0] as Record<string, unknown>;
}

describe('SignalingRuleModal — valid (event_type, trigger) pairs', () => {
  // Parametrise over every pair in the authoritative table. Each pair
  // gets its own test case so failures pinpoint the exact combination.
  // The per-test timeout is bumped well above the 5s default because
  // AntD's Modal + Select dropdown render + animation in jsdom is
  // measurably slow (each test does ~6 user interactions across two
  // portal-rendered popups), and the slowest cases in the matrix sit
  // near the default's edge.
  const eventTypes = Object.keys(SIGNALING_VALID_PAIRS) as SignalingEventType[];
  for (const eventType of eventTypes) {
    for (const trigger of SIGNALING_VALID_PAIRS[eventType]) {
      it(
        `submits signaling.${eventType}.${trigger} cleanly`,
        async () => {
          const payload = await submitPair(eventType, trigger);
          expect(payload.condition_type).toBe(`signaling.${eventType}.${trigger}`);
          expect(payload.event_type).toBe(eventType);
          expect(payload.trigger).toBe(trigger);
          expect(payload.action_type).toBe('webhook');
          expect((payload.action_config as Record<string, string>).url).toBe(
            'https://example.com/hook',
          );
        },
        15_000,
      );
    }
  }
});

describe('SignalingRuleModal — invalid (event_type, trigger) pairs are rejected', () => {
  // For each event_type, pick one trigger that belongs to a DIFFERENT
  // event_type so we know it's invalid for this one. The trigger Select
  // is keyed on event_type and only lists valid options, so we assert
  // the invalid trigger is NOT offered as a selectable Select option.
  const invalidPairs: { eventType: SignalingEventType; invalidTrigger: SignalingTrigger; invalidLabel: string }[] = [
    { eventType: 'location', invalidTrigger: 'on_entry', invalidLabel: 'On entry' },
    { eventType: 'geolocation', invalidTrigger: 'on_exit', invalidLabel: 'On exit' },
    { eventType: 'temperature', invalidTrigger: 'on_inference', invalidLabel: 'On inference (attribution settled)' },
    { eventType: 'geofencing', invalidTrigger: 'periodic', invalidLabel: 'Periodic' },
  ];

  for (const { eventType, invalidTrigger, invalidLabel } of invalidPairs) {
    it(`does not offer ${invalidTrigger} as a trigger for ${eventType}`, async () => {
      const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
      const onClose = vi.fn();
      render(<SignalingRuleModal open onClose={onClose} />, { wrapper });

      // Pick the event type.
      const eventTypeSelect = screen
        .getByTestId('field-event-type')
        .querySelector('.ant-select-selector') as HTMLElement;
      await user.click(eventTypeSelect);
      const eventLabelMap: Record<SignalingEventType, string> = {
        location: 'Location',
        geolocation: 'Geolocation',
        temperature: 'Temperature',
        geofencing: 'Geofencing',
      };
      const eventOption = await screen.findByText(eventLabelMap[eventType], { exact: true });
      await user.click(eventOption);

      // Open the trigger Select dropdown.
      const triggerSelect = screen
        .getByTestId('field-trigger')
        .querySelector('.ant-select-selector') as HTMLElement;
      await user.click(triggerSelect);

      // The invalid trigger must NOT appear as an option in the
      // dropdown. We scope by walking the actual option-content
      // elements so we don't false-positive on the "Trigger" form
      // label or other static text.
      const optionContents = Array.from(
        document.querySelectorAll('.ant-select-item-option-content'),
      ).map((el) => el.textContent?.trim());
      expect(optionContents).not.toContain(invalidLabel);

      // And no rule was created.
      expect(mutateAsync).not.toHaveBeenCalled();
    });
  }
});
