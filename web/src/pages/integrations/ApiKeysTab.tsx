import { useState } from 'react';
import { Copy, Plus, KeyRound, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/hooks/useIntegrations';
import { useAuthStore } from '@/stores/auth';

const AVAILABLE_SCOPES = [
  'attendance:read',
  'attendance:write',
  'employees:read',
  'leave:read',
  'payroll:read',
  'webhooks:receive',
];

export function ApiKeysTab() {
  const { data, isLoading } = useApiKeys();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-surface-900">API Keys</h2>
        {hasPermission('integrations.keys.manage') && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Create key
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-200 bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Token (masked)</th>
                <th className="px-4 py-3">Scopes</th>
                <th className="px-4 py-3">Rate limit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last used</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-500">Loading…</td></tr>
              ) : (data?.keys.length ?? 0) === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-500">
                  <KeyRound className="mx-auto h-8 w-8 text-surface-300" />
                  <p className="mt-2">No API keys yet.</p>
                </td></tr>
              ) : (
                data?.keys.map((k) => (
                  <tr key={k.id} className="border-b border-surface-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-surface-900">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-700">{k.masked}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.length === 0 ? (
                          <span className="text-xs text-surface-400">none</span>
                        ) : (
                          k.scopes.map((s) => <Badge key={s} variant="info">{s}</Badge>)
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{k.rate_limit_per_minute}/min</td>
                    <td className="px-4 py-3">
                      <Badge variant={k.is_active ? 'success' : 'default'}>{k.is_active ? 'active' : 'revoked'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}</td>
                    <td className="px-4 py-3 text-right">
                      {k.is_active && hasPermission('integrations.keys.manage') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => {
                            if (confirm(`Revoke key "${k.name}"? This cannot be undone.`)) {
                              revoke.mutate(k.id);
                            }
                          }}
                        >
                          Revoke
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
        <CreateKeyDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(token) => {
            setCreatedToken(token);
            setCreateOpen(false);
          }}
          isPending={create.isPending}
          mutate={(payload) => create.mutateAsync(payload)}
        />
      )}

      {createdToken && (
        <Dialog open onClose={() => setCreatedToken(null)} title="Save your new key" maxWidth="lg">
          <div className="flex flex-col gap-3 px-6 py-5">
            <p className="text-sm text-surface-700">
              Copy this token now — for security, it won't be shown again. iHRIS only stores its hash.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 p-3 font-mono text-xs">
              <span className="flex-1 break-all">{createdToken}</span>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => {
                  navigator.clipboard.writeText(createdToken);
                  toast.success('Copied to clipboard.');
                }}
              >
                Copy
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
              <Button onClick={() => setCreatedToken(null)}>Done</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function CreateKeyDialog({
  onClose,
  onCreated,
  mutate,
  isPending,
}: {
  onClose: () => void;
  onCreated: (token: string) => void;
  mutate: (payload: { name: string; scopes?: string[]; rate_limit_per_minute?: number }) => Promise<{ plain_token: string }>;
  isPending: boolean;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [rate, setRate] = useState(60);

  const toggle = (s: string) => setScopes(scopes.includes(s) ? scopes.filter((x) => x !== s) : [...scopes, s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await mutate({ name: name.trim(), scopes, rate_limit_per_minute: rate });
    onCreated(result.plain_token);
  };

  return (
    <Dialog open onClose={onClose} title="Create API Key" maxWidth="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <Input label="Name *" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ZKTeco device #1" />
        <Input label="Rate limit (per minute)" type="number" min={10} max={1000} value={rate} onChange={(e) => setRate(Number(e.target.value))} />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-surface-700">Scopes</span>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={
                  'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ' +
                  (scopes.includes(s)
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-surface-200 bg-surface-0 text-surface-600 hover:border-surface-300')
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isPending}>Create key</Button>
        </div>
      </form>
    </Dialog>
  );
}
