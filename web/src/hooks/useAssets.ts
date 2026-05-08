import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  assetsApi,
  type AssignAssetInput,
  type CreateAssetInput,
  type LogMaintenanceInput,
  type ReturnAssetInput,
  type UpdateAssetInput,
} from '@/api/assets';
import type { AssetFilters } from '@/types';

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetFilters) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  categories: () => [...assetKeys.all, 'categories'] as const,
};

export function useAssets(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => assetsApi.list(filters),
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? ''),
    queryFn: () => assetsApi.get(id!),
    enabled: !!id,
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: assetKeys.categories(),
    queryFn: () => assetsApi.categories(),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetInput) => assetsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
      toast.success('Asset created.');
    },
    onError: () => toast.error('Failed to create asset.'),
  });
}

export function useUpdateAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAssetInput) => assetsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
      qc.invalidateQueries({ queryKey: assetKeys.detail(id) });
      toast.success('Asset updated.');
    },
    onError: () => toast.error('Failed to update asset.'),
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignAssetInput }) => assetsApi.assign(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
      qc.invalidateQueries({ queryKey: assetKeys.detail(id) });
      toast.success('Asset assigned.');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to assign asset.'),
  });
}

export function useReturnAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data?: ReturnAssetInput }) =>
      assetsApi.returnAsset(assignmentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.all });
      toast.success('Asset returned.');
    },
    onError: () => toast.error('Failed to return asset.'),
  });
}

export function useRetireAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => assetsApi.retire(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
      qc.invalidateQueries({ queryKey: assetKeys.detail(id) });
      toast.success('Asset retired.');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to retire asset.'),
  });
}

export function useLogMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LogMaintenanceInput }) =>
      assetsApi.logMaintenance(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: assetKeys.detail(id) });
      toast.success('Maintenance logged.');
    },
    onError: () => toast.error('Failed to log maintenance.'),
  });
}
