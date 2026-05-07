import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { easeOutStrong } from '@/lib/motion';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutStrong },
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const fromPath = ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname) ?? '/';

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync({
        email: values.email,
        password: values.password,
        remember: values.remember,
        device_name: navigator.userAgent.slice(0, 200),
      });
      if ('mfa_required' in result && result.mfa_required) {
        // MFA flow scaffold — for now route to a placeholder.
        navigate('/mfa', { state: { challengeToken: result.challenge_token } });
        return;
      }
      navigate(fromPath, { replace: true });
    } catch {
      // Surfaced via login.error below.
    }
  });

  const apiError = login.error instanceof ApiError ? login.error : null;
  const fieldErrors = apiError?.fields ?? {};

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <span className="h-1.5 w-1.5 rounded-full bg-cta-500" />
          Welcome back
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-surface-900">
          Sign in to your workspace
        </h2>
        <p className="text-sm text-surface-500">
          Enter your credentials to continue. All access is audit-logged.
        </p>
      </motion.div>

      <motion.form variants={itemVariants} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {apiError && !Object.keys(fieldErrors).length ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: easeOutStrong }}
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3.5 py-3 text-sm text-[var(--color-danger)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{apiError.message}</span>
          </motion.div>
        ) : null}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message ?? fieldErrors.email?.[0]}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="flex h-full w-full items-center justify-center text-surface-400 hover:text-surface-700 cursor-pointer transition-colors duration-150"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={errors.password?.message ?? fieldErrors.password?.[0]}
          {...register('password')}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 text-surface-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-600 cursor-pointer"
              {...register('remember')}
            />
            Remember this device
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-brand-700 hover:text-brand-800 transition-colors duration-150"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={login.isPending}>
          Sign in
        </Button>

        <p className="text-center text-xs text-surface-400">
          By signing in you agree to your organization's HR policy and accept that
          activity is logged for compliance.
        </p>
      </motion.form>
    </motion.div>
  );
}
