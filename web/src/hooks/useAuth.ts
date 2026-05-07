import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi, type LoginInput } from '@/api/auth';
import { tokenStorage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/**
 * Hydrates the auth store on app boot. Returns whether bootstrap finished.
 */
export function useBootstrapAuth(): { isReady: boolean } {
  const { user, isHydrated, hydrate, reset } = useAuthStore();
  const hasToken = tokenStorage.get() !== null;

  const { isLoading, isSuccess, isError, data } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    enabled: hasToken && !user,
    retry: false,
  });

  useEffect(() => {
    if (!hasToken) {
      // No token — mark hydrated as guest.
      if (!isHydrated) reset();
      return;
    }
    if (isSuccess && data?.user) hydrate(data.user);
    if (isError) reset();
  }, [hasToken, isSuccess, isError, data, hydrate, reset, isHydrated]);

  return {
    isReady: isHydrated || !hasToken || (!isLoading && (isSuccess || isError)),
  };
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);

  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      if ('mfa_required' in data && data.mfa_required) {
        // Caller should handle MFA flow separately.
        return;
      }
      setToken(data.token);
      setUser(data.user);
    },
  });
}

export function useLogout() {
  const reset = useAuthStore((s) => s.reset);

  return useMutation({
    mutationFn: () => authApi.logout().catch(() => ({ message: 'logged out locally' })),
    onSettled: () => {
      reset();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: Parameters<typeof authApi.resetPassword>[0]) =>
      authApi.resetPassword(input),
  });
}
