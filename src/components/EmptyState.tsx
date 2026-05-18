/**
 * EmptyState — Sprint 33 §6.
 *
 * Thin wrapper around AntD `<Empty>` that gives every "no data yet"
 * surface in TagPulse a consistent look: optional illustration, a
 * larger title, secondary description, and a single CTA slot for the
 * next action (e.g. "Create your first device").
 *
 * Use anywhere a list/table renders zero rows.
 */
import Empty from 'antd/es/empty';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Bold headline. Optional — falls back to AntD's default copy. */
  title?: ReactNode;
  /** Secondary muted line under the title. */
  description?: ReactNode;
  /** Replace the default Empty image. Pass `false` to hide it. */
  illustration?: ReactNode | false;
  /** Primary action button (or any node) shown below the text. */
  action?: ReactNode;
}

export function EmptyState({ title, description, illustration, action }: EmptyStateProps) {
  const image =
    illustration === false
      ? null
      : (illustration ?? Empty.PRESENTED_IMAGE_SIMPLE);

  return (
    <div
      data-testid="empty-state"
      style={{ padding: '32px 16px', textAlign: 'center' }}
    >
      <Empty
        image={image as React.ReactNode}
        description={
          <div>
            {title && (
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{title}</div>
            )}
            {description && (
              <div style={{ color: 'rgba(0,0,0,0.45)' }}>{description}</div>
            )}
          </div>
        }
      >
        {action}
      </Empty>
    </div>
  );
}
