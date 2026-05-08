import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateAsset } from '@/hooks/useAssets';

interface Props {
  onClose: () => void;
}

export function CreateAssetDialog({ onClose }: Props) {
  const create = useCreateAsset();
  const [form, setForm] = useState({
    asset_tag: '',
    name: '',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    purchase_cost: '',
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      asset_tag: form.asset_tag.trim(),
      name: form.name.trim(),
      brand: form.brand || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      location: form.location || null,
      purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : null,
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="Register Asset" maxWidth="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Asset tag *" required value={form.asset_tag} onChange={update('asset_tag')} placeholder="AST-0001" />
          <Input label="Name *" required value={form.name} onChange={update('name')} placeholder="MacBook Pro 14" />
          <Input label="Brand" value={form.brand} onChange={update('brand')} placeholder="Apple" />
          <Input label="Model" value={form.model} onChange={update('model')} placeholder="M3 Pro" />
          <Input label="Serial number" value={form.serial_number} onChange={update('serial_number')} />
          <Input label="Location" value={form.location} onChange={update('location')} placeholder="HQ Manila" />
          <Input
            label="Purchase cost (PHP)"
            type="number"
            step="0.01"
            value={form.purchase_cost}
            onChange={update('purchase_cost')}
            placeholder="0.00"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Register asset</Button>
        </div>
      </form>
    </Dialog>
  );
}
