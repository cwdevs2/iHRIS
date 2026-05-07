import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { JSendEnvelope, JSendError, JSendFail } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';
const TOKEN_STORAGE_KEY = 'ihris.auth.token';

export class ApiError extends Error {
  public readonly status: number;
  public readonly fields?: Record<string, string[]>;
  public readonly raw?: JSendEnvelope<unknown>;

  constructor(message: string, status: number, fields?: Record<string, string[]>, raw?: JSendEnvelope<unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.raw = raw;
  }
}

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_STORAGE_KEY),
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // Token-based auth (Bearer) — no cookie session, no CSRF token required.
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<JSendEnvelope<unknown>>) => {
    if (!error.response) {
      throw new ApiError('Network error. Please check your connection.', 0);
    }

    const { status, data } = error.response;

    if (status === 401) {
      tokenStorage.clear();
    }

    if (data && typeof data === 'object' && 'status' in data) {
      if (data.status === 'fail') {
        const failData = (data as JSendFail).data as Record<string, unknown>;
        const message = typeof failData?.message === 'string'
          ? failData.message
          : 'Validation failed.';
        const fields = Object.fromEntries(
          Object.entries(failData ?? {})
            .filter(([k, v]) => k !== 'message' && Array.isArray(v))
            .map(([k, v]) => [k, v as string[]]),
        );
        throw new ApiError(message, status, fields, data);
      }
      if (data.status === 'error') {
        throw new ApiError((data as JSendError).message ?? 'Server error.', status, undefined, data);
      }
    }

    throw new ApiError(error.message ?? 'Request failed.', status);
  },
);

/**
 * Unwraps a JSend success envelope. Throws ApiError if the response is fail/error.
 */
export async function unwrap<T>(promise: Promise<{ data: JSendEnvelope<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.status === 'success') {
    return data.data;
  }
  if (data.status === 'fail') {
    const failData = (data as JSendFail).data as Record<string, unknown>;
    const message = typeof failData?.message === 'string' ? failData.message : 'Request failed.';
    throw new ApiError(message, 422, undefined, data);
  }
  throw new ApiError(data.message, 500, undefined, data);
}
