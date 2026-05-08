import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { integrationsApi } from '@/api/integrations';

export const integrationKeys = {
  all: ['integrations'] as const,
  keys: () => [...integrationKeys.all, 'keys'] as const,
  webhooks: () => [...integrationKeys.all, 'webhooks'] as const,
  webhook: (id: string) => [...integrationKeys.webhooks(), id] as const,
  logs: (filters: Record<string, unknown>) => [...integrationKeys.all, 'logs', filters] as const,
};

export function useApiKeys() {
  return useQuery({
    queryKey: integrationKeys.keys(),
    queryFn: () => integrationsApi.listKeys(),
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; scopes?: string[]; rate_limit_per_minute?: number }) =>
      integrationsApi.createKey(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.keys() });
      toast.success('API key created. Copy it now — it will not be shown again.');
    },
    onError: () => toast.error('Failed to create API key.'),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsApi.revokeKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.keys() });
      toast.success('API key revoked.');
    },
    onError: () => toast.error('Failed to revoke API key.'),
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: integrationKeys.webhooks(),
    queryFn: () => integrationsApi.listWebhooks(),
  });
}

export function useWebhook(id: string | undefined) {
  return useQuery({
    queryKey: integrationKeys.webhook(id ?? ''),
    queryFn: () => integrationsApi.getWebhook(id!),
    enabled: !!id,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; target_url: string; events: string[] }) =>
      integrationsApi.createWebhook(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.webhooks() });
      toast.success('Webhook subscription created.');
    },
    onError: () => toast.error('Failed to create webhook.'),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsApi.deleteWebhook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.webhooks() });
      toast.success('Webhook deleted.');
    },
    onError: () => toast.error('Failed to delete webhook.'),
  });
}

export function useIntegrationLogs(filters: { integration?: string; direction?: string; date_from?: string; date_to?: string } = {}) {
  return useQuery({
    queryKey: integrationKeys.logs(filters),
    queryFn: () => integrationsApi.logs(filters),
  });
}
