import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  LoginPayload,
  LoginSuccessPayload,
  MeResponse,
} from '@/types/api';

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
  device_name?: string;
}

export const authApi = {
  login: (input: LoginInput): Promise<LoginPayload> =>
    unwrap(api.post<JSendEnvelope<LoginPayload>>('/auth/login', input)),

  logout: (): Promise<{ message: string }> =>
    unwrap(api.post<JSendEnvelope<{ message: string }>>('/auth/logout')),

  me: (): Promise<MeResponse> =>
    unwrap(api.get<JSendEnvelope<MeResponse>>('/auth/me')),

  forgotPassword: (email: string): Promise<{ message: string }> =>
    unwrap(api.post<JSendEnvelope<{ message: string }>>('/auth/forgot-password', { email })),

  resetPassword: (input: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> =>
    unwrap(api.post<JSendEnvelope<{ message: string }>>('/auth/reset-password', input)),

  mfaVerify: (input: { code: string; device_name?: string }, challengeToken: string): Promise<LoginSuccessPayload> =>
    unwrap(
      api.post<JSendEnvelope<LoginSuccessPayload>>('/auth/mfa/verify', input, {
        headers: { Authorization: `Bearer ${challengeToken}` },
      }),
    ),
};
