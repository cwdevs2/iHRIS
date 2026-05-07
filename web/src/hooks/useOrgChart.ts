import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import type { JSendEnvelope } from '@/types';

export interface OrgChartDepartmentNode {
  id: string;
  code: string;
  name: string;
  employee_count: number;
  head: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  children: OrgChartDepartmentNode[];
}

export interface OrgChartTopManager {
  id: string;
  employee_number: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
  department: string | null;
}

export interface OrgChartData {
  departments: OrgChartDepartmentNode[];
  top_managers: OrgChartTopManager[];
}

export function useOrgChart() {
  return useQuery({
    queryKey: ['org-chart'],
    queryFn: () => unwrap(api.get<JSendEnvelope<OrgChartData>>('/org-chart')),
    staleTime: 2 * 60 * 1000,
  });
}
