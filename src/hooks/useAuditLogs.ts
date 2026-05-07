import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '@/api/client';

export interface UseAuditLogsParams {
  resource_type?: string;
  actions?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Sprint 16 — admin audit-log query.
 *
 * The "Device security events" preset filters server-side via
 * ``actions=device.token_rotated,device.cert_attached,device.approved,device.rejected``
 * (per docs/design/identity-device-provisioning.md §7).
 */
export function useAuditLogs(params: UseAuditLogsParams = {}) {
  const { actions, ...rest } = params;
  const query = {
    ...rest,
    actions: actions && actions.length > 0 ? actions.join(',') : undefined,
  };
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => auditLogsApi.list(query),
  });
}

export const DEVICE_SECURITY_ACTIONS = [
  'device.token_rotated',
  'device.cert_attached',
  'device.approved',
  'device.rejected',
];
