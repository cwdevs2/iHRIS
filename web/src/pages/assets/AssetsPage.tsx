import { useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Plus, Search, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAssets } from '@/hooks/useAssets';
import { useAuthStore } from '@/stores/auth';
import type { AssetStatus } from '@/types';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import { CreateAssetDialog } from './CreateAssetDialog';
import { AssignAssetDialog } from './AssignAssetDialog';

const STATUS_VARIANTS: Record<AssetStatus, Parameters<typeof Badge>[0]['variant']> = {
  available: 'success',
  assigned: 'brand',
  under_maintenance: 'warning',
  lost: 'danger',
  retired: 'default',
};

export function AssetsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AssetStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data, isLoading } = useAssets({
    search: search.trim() || undefined,
    status: status || undefined,
  });

  const assets = data?.assets ?? [];

  const tiles = useStatusTiles(assets);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-surface-500">Phase 7 · Asset Management</p>
          <h1 className="text-3xl font-semibold tracking-tight text-surface-900">Assets</h1>
          <p className="text-sm text-surface-500">Track company-owned equipment and current holders.</p>
        </div>
        {hasPermission('assets.inventory.manage') && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Register asset
          </Button>
        )}
      </div>

      {/* Status tiles */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setStatus(status === tile.key ? '' : tile.key)}
            className={cn(
              'rounded-xl border p-4 text-left transition-shadow duration-200 ease-out-strong cursor-pointer hover:shadow-[var(--shadow-1)]',
              status === tile.key
                ? 'border-brand-300 bg-brand-50/40'
                : 'border-surface-200 bg-surface-0',
            )}
          >
            <p className="text-xs uppercase tracking-wide text-surface-500">{tile.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-surface-900">{tile.count}</p>
          </button>
        ))}
      </section>

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Search by tag, name, or serial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {status && (
          <Button variant="ghost" size="sm" onClick={() => setStatus('')}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Asset table */}
      <Card>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-200 bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">Loading…</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  <Boxes className="mx-auto h-8 w-8 text-surface-300" />
                  <p className="mt-2">No assets match your filters.</p>
                </td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-surface-700">{asset.asset_tag}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-surface-900">{asset.name}</span>
                        <span className="text-xs text-surface-500">
                          {[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}
                          {asset.serial_number ? ` · ${asset.serial_number}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[asset.status]}>{asset.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {asset.active_assignment ? (
                        <span className="text-surface-700">{asset.active_assignment.employee_name}</span>
                      ) : (
                        <span className="text-surface-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-700">{asset.condition}</td>
                    <td className="px-4 py-3 text-right">
                      {asset.status === 'available' && hasPermission('assets.assignments.manage') && (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                          onClick={() => setAssignTarget({ id: asset.id, name: asset.name })}
                        >
                          Assign
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

      {createOpen && <CreateAssetDialog onClose={() => setCreateOpen(false)} />}
      {assignTarget && (
        <AssignAssetDialog
          assetId={assignTarget.id}
          assetName={assignTarget.name}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </motion.div>
  );
}

function useStatusTiles(assets: { status: AssetStatus }[]) {
  const counts = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return [
    { key: 'available' as AssetStatus, label: 'Available', count: counts.available ?? 0 },
    { key: 'assigned' as AssetStatus, label: 'Assigned', count: counts.assigned ?? 0 },
    { key: 'under_maintenance' as AssetStatus, label: 'Maintenance', count: counts.under_maintenance ?? 0 },
    { key: 'lost' as AssetStatus, label: 'Lost', count: counts.lost ?? 0 },
    { key: 'retired' as AssetStatus, label: 'Retired', count: counts.retired ?? 0 },
  ];
}
