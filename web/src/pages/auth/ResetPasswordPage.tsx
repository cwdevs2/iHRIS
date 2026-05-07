import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/api/auth';
import { ApiError } from '@/lib/api';
import { easeOutStrong } from '@/lib/motion';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['password_confirmation'],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  });

  // Redirect invalid links early
  if (!token || !email) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOutStrong }}
        className="flex flex-col gap-6"
      >
        <div className="flex items-start gap-3 rounded-lg border border-red-300/40 bg-red-50 px-4 py-3.5">
          <div className="text-sm">
            <p className="font-medium text-surface-900">Invalid or expired link</p>
            <p className="mt-0.5 text-surface-600">
              This reset link is missing required parameters. Please request a new one.
            </p>
          </div>
        </div>
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          Request a new reset link
        </Link>
      </motion.div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await authApi.resetPassword({
        token,
        email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      setDone(true);
      toast.success('Password updated. You can now sign in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields?.password) {
          setError('password', { message: err.fields.password[0] });
        } else {
          toast.error(err.message || 'Reset failed. The link may have expired.');
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOutStrong }}
      className="flex flex-col gap-8"
    >
      <Link
        to="/login"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-surface-500 hover:text-surface-900 transition-colors duration-150"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-surface-900">
          Choose a new password
        </h2>
        <p className="text-sm text-surface-500">
          Setting a new password for <span className="font-medium text-surface-700">{email}</span>.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: easeOutStrong }}
            className="flex items-start gap-3 rounded-lg border border-cta-500/25 bg-cta-500/5 px-4 py-3.5"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cta-600" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-surface-900">Password updated</p>
              <p className="mt-0.5 text-surface-600">Redirecting you to the sign-in page…</p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
            noValidate
          >
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-surface-400 hover:text-surface-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm new password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your new password"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="text-surface-400 hover:text-surface-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.password_confirmation?.message}
              {...register('password_confirmation')}
            />

            <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
              Update password
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
