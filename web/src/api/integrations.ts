import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  ApiKey,
  CreatedApiKeyResponse,
  WebhookListResponse,
  WebhookSubscription,
  CreatedWebhookResponse,
  WebhookDelivery,
  IntegrationLogResponse,
} from '@/types';

export const integrationsApi = {
  // API Keys
  listKeys: (): Promise<{ keys: ApiKey[] }> =>
    unwrap(api.get<JSendEnvelope<{ keys: ApiKey[] }>>('/integrations/keys')),

  createKey: (data: { name: string; scopes?: string[]; rate_limit_per_minute?: number }): Promise<CreatedApiKeyResponse> =>
    unwrap(api.post<JSendEnvelope<CreatedApiKeyResponse>>('/integrations/keys', data)),

  revokeKey: (id: string): Promise<{ key: ApiKey }> =>
    unwrap(api.delete<JSendEnvelope<{ key: ApiKey }>>(`/integrations/keys/${id}`)),

  // Webhooks
  listWebhooks: (): Promise<WebhookListResponse> =>
    unwrap(api.get<JSendEnvelope<WebhookListResponse>>('/integrations/webhooks')),

  getWebhook: (id: string): Promise<{ subscription: WebhookSubscription; deliveries: WebhookDelivery[] }> =>
    unwrap(api.get<JSendEnvelope<{ subscription: WebhookSubscription; deliveries: WebhookDelivery[] }>>(`/integrations/webhooks/${id}`)),

  createWebhook: (data: { name: string; target_url: string; events: string[] }): Promise<CreatedWebhookResponse> =>
    unwrap(api.post<JSendEnvelope<CreatedWebhookResponse>>('/integrations/webhooks', data)),

  deleteWebhook: (id: string): Promise<{ deleted: boolean }> =>
    unwrap(api.delete<JSendEnvelope<{ deleted: boolean }>>(`/integrations/webhooks/${id}`)),

  // Logs
  logs: (filters: { integration?: string; direction?: string; date_from?: string; date_to?: string; per_page?: number } = {}): Promise<IntegrationLogResponse> =>
    unwrap(api.get<JSendEnvelope<IntegrationLogResponse>>('/integrations/logs', { params: filters })),
};
