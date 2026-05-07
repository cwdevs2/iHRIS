import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentApi } from '@/api/hr';
import type { DocumentFilters } from '@/types';

export const documentKeys = {
  all: (employeeId: string) => ['documents', employeeId] as const,
  list: (employeeId: string, filters?: DocumentFilters) =>
    [...documentKeys.all(employeeId), filters] as const,
};

export function useDocuments(employeeId: string, filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.list(employeeId, filters),
    queryFn: () => documentApi.list(employeeId, filters),
    enabled: Boolean(employeeId),
  });
}

export function useUploadDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => documentApi.upload(employeeId, formData),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all(employeeId) });
      toast.success('Document uploaded.');
    },
    onError: () => toast.error('Upload failed. Please try again.'),
  });
}

export function useDeleteDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.all(employeeId) });
      toast.success('Document deleted.');
    },
    onError: () => toast.error('Delete failed.'),
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: (id: string) => documentApi.download(id),
    onSuccess: ({ url, file_name }) => {
      // Open the signed URL in a new tab to trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.click();
    },
    onError: () => toast.error('Download failed.'),
  });
}
