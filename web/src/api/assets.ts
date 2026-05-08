import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  Asset,
  AssetCategory,
  AssetFilters,
  AssetListResponse,
} from '@/types';

export type CreateAssetInput = {
  asset_tag: string;
  category_id?: string | null;
  name: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  purchased_at?: string | null;
  purchase_cost?: number | null;
  vendor?: string | null;
  warranty_expires_at?: string | null;
  condition?: string;
  location?: string | null;
  notes?: string | null;
};

export type UpdateAssetInput = Partial<Omit<CreateAssetInput, 'asset_tag'>>;

export type AssignAssetInput = { employee_id: string; notes?: string };
export type ReturnAssetInput = { condition?: string; notes?: string };
export type LogMaintenanceInput = {
  type: string;
  performed_on: string;
  next_due_on?: string;
  cost?: number;
  vendor?: string;
  description?: string;
};

export const assetsApi = {
  list: (filters: AssetFilters = {}): Promise<AssetListResponse> =>
    unwrap(api.get<JSendEnvelope<AssetListResponse>>('/assets', { params: filters })),

  get: (id: string): Promise<{ asset: Asset }> =>
    unwrap(api.get<JSendEnvelope<{ asset: Asset }>>(`/assets/${id}`)),

  create: (data: CreateAssetInput): Promise<{ asset: Asset }> =>
    unwrap(api.post<JSendEnvelope<{ asset: Asset }>>('/assets', data)),

  update: (id: string, data: UpdateAssetInput): Promise<{ asset: Asset }> =>
    unwrap(api.patch<JSendEnvelope<{ asset: Asset }>>(`/assets/${id}`, data)),

  retire: (id: string, reason?: string): Promise<{ asset: Asset }> =>
    unwrap(api.post<JSendEnvelope<{ asset: Asset }>>(`/assets/${id}/retire`, { reason })),

  assign: (id: string, data: AssignAssetInput): Promise<{ assignment: unknown }> =>
    unwrap(api.post<JSendEnvelope<{ assignment: unknown }>>(`/assets/${id}/assign`, data)),

  returnAsset: (assignmentId: string, data: ReturnAssetInput = {}): Promise<{ assignment: unknown }> =>
    unwrap(api.post<JSendEnvelope<{ assignment: unknown }>>(`/assets/assignments/${assignmentId}/return`, data)),

  logMaintenance: (id: string, data: LogMaintenanceInput): Promise<{ log: unknown }> =>
    unwrap(api.post<JSendEnvelope<{ log: unknown }>>(`/assets/${id}/maintenance`, data)),

  categories: (): Promise<{ categories: AssetCategory[] }> =>
    unwrap(api.get<JSendEnvelope<{ categories: AssetCategory[] }>>('/assets/categories')),

  createCategory: (data: { name: string; icon?: string; description?: string }): Promise<{ category: AssetCategory }> =>
    unwrap(api.post<JSendEnvelope<{ category: AssetCategory }>>('/assets/categories', data)),
};
