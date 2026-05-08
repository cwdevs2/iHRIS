import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAssignAsset } from '@/hooks/useAssets';

interface Props {
  assetId: string;
  assetName: string;
  onClose: () => void;
}

export function AssignAssetDialog({ assetId, assetName, onClose }: Props) {
  const assign = useAssignAsset();
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) return;
    await assign.mutateAsync({
      id: assetId,
      data: { employee_id: employeeId.trim(), notes: notes || undefined },
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Assign “${assetName}”`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <p className="text-sm text-surface-500">
          Paste the employee UUID below. (A picker will be added in a follow-up; this keeps the form simple
          for now while you can copy IDs from the Employees page.)
        </p>

        <Input
          label="Employee ID *"
          required
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
        />
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hand-over receipt #..."
        />

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={assign.isPending}>Assign</Button>
        </div>
      </form>
    </Dialog>
  );
}
