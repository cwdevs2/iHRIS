// Phase 7 — Asset Management types

export interface AssetCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
}

export type AssetStatus = 'available' | 'assigned' | 'under_maintenance' | 'lost' | 'retired';
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  category_id: string | null;
  category?: { id: string; name: string };
  status: AssetStatus;
  condition: AssetCondition;
  location: string | null;
  purchased_at: string | null;
  purchase_cost: number | null;
  vendor: string | null;
  warranty_expires_at: string | null;
  notes: string | null;
  active_assignment: {
    id: string;
    employee_id: string;
    employee_name: string;
    assigned_on: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface AssetListResponse {
  assets: Asset[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface AssetFilters {
  status?: AssetStatus;
  category_id?: string;
  search?: string;
  per_page?: number;
}
