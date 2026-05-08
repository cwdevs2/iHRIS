// Phase 7 — API Integration types

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  masked: string;
  scopes: string[];
  rate_limit_per_minute: number;
  last_used_at: string | null;
  last_used_ip: string | null;
  revoked_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreatedApiKeyResponse {
  key: ApiKey;
  /** Plain bearer token — shown ONCE at creation time, never returned again. */
  plain_token: string;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  target_url: string;
  events: string[];
  is_active: boolean;
  max_retries: number;
  created_at: string;
}

export interface WebhookListResponse {
  subscriptions: WebhookSubscription[];
  supported_events: string[];
}

export interface CreatedWebhookResponse {
  subscription: WebhookSubscription;
  signing_secret: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  event_name: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  attempts: number;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

export interface IntegrationLog {
  id: string;
  integration: string;
  direction: 'inbound' | 'outbound';
  endpoint: string | null;
  status_code: number | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  api_key_id: string | null;
  source_ip: string | null;
  created_at: string;
}

export interface IntegrationLogResponse {
  logs: IntegrationLog[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}
