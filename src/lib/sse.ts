import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';

export function useSSE(events: string[], queryKeys: string[][], onMessage?: () => void) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!tenantId || events.length === 0) return;

    const params = new URLSearchParams({ events: events.join(',') });
    const url = `/integrations/stream?${params.toString()}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onmessage = () => {
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      onMessage?.();
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [tenantId, events, queryKeys, queryClient, onMessage]);
}
