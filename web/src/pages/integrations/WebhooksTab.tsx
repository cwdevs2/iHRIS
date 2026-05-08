import { useState } from 'react';
import { Plus, Trash2, Webhook } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useCreateWebhook, useDeleteWebhook, useWebhooks } from '@/hooks/useIntegrations';
import { useAuthStore } from '@/stores/auth';

export function WebhooksTab() {
  const { data, isLoading } = useWebhooks();
  const create = useCreateWebhook();
  const remove = useDeleteWebhook();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-surface-900">Webhook Subscriptions</h2>
        {hasPermission('integrations.webhooks.manage') && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Subscribe
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-200 bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Target URL</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500">Loading…</td></tr>
              ) : (data?.subscriptions.length ?? 0) === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                  <Webhook className="mx-auto h-8 w-8 text-surface-300" />
                  <p className="mt-2">No webhook subscriptions yet.</p>
                </td></tr>
              ) : (
                data?.subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-surface-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-surface-900">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-700">{s.target_url}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.events.map((e) => <Badge key={e} variant="info">{e}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'success' : 'default'}>{s.is_active ? 'active' : 'paused'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission('integrations.webhooks.manage') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => {
                            if (confirm(`Delete subscription "${s.name}"?`)) remove.mutate(s.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {createOpen && (
        <CreateWebhookDialog
          supportedEvents={data?.supported_events ?? []}
          onClose={() => setCreateOpen(false)}
          onCreated={(secret) => {
            setCreatedSecret(secret);
            setCreateOpen(false);
          }}
          isPending={create.isPending}
          mutate={(payload) => create.mutateAsync(payload)}
        />
      )}

      {createdSecret && (
        <Dialog open onClose={() => setCreatedSecret(null)} title="Save your signing secret" maxWidth="lg">
          <div className="flex flex-col gap-3 px-6 py-5">
            <p className="text-sm text-surface-700">
              Configure this signing secret on your receiver. Verify each request with HMAC-SHA256 of the body.
            </p>
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 font-mono text-xs break-all">
              {createdSecret}
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
              <Button onClick={() => setCreatedSecret(null)}>Done</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function CreateWebhookDialog({
  supportedEvents,
  onClose,
  onCreated,
  mutate,
  isPending,
}: {
  supportedEvents: string[];
  onClose: () => void;
  onCreated: (secret: string) => void;
  mutate: (payload: { name: string; target_url: string; events: string[] }) => Promise<{ signing_secret: string }>;
  isPending: boolean;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);

  const toggle = (e: string) => setEvents(events.includes(e) ? events.filter((x) => x !== e) : [...events, e]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (events.length === 0) return;
    const result = await mutate({ name: name.trim(), target_url: url.trim(), events });
    onCreated(result.signing_secret);
  };

  return (
    <Dialog open onClose={onClose} title="Subscribe to events" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-6 py-5">
        <Input label="Name *" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Target URL *" required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-system.example.com/hooks/ihris" />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-surface-700">Events to subscribe ({events.length} selected)</span>
          <div className="flex flex-wrap gap-2">
            {supportedEvents.map((evt) => (
              <button
                key={evt}
                type="button"
                onClick={() => toggle(evt)}
                className={
                  'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ' +
                  (events.includes(evt)
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-surface-200 bg-surface-0 text-surface-600 hover:border-surface-300')
                }
              >
                {evt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isPending} disabled={events.length === 0}>Create subscription</Button>
        </div>
      </form>
    </Dialog>
  );
}
