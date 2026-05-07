import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForgotPassword } from '@/hooks/useAuth';
import { easeOutStrong } from '@/lib/motion';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const sent = forgot.isSuccess;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgot.mutateAsync(values.email);
    } catch {
      /* surfaced via forgot.error if needed */
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
          Reset your password
        </h2>
        <p className="text-sm text-surface-500">
          Enter the email associated with your account and we'll send a reset link.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: easeOutStrong }}
            className="flex items-start gap-3 rounded-lg border border-cta-500/25 bg-cta-500/5 px-4 py-3.5"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cta-600" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-surface-900">Check your inbox</p>
              <p className="mt-0.5 text-surface-600">
                If an account exists for that email, a reset link is on its way.
              </p>
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
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" size="lg" fullWidth loading={forgot.isPending}>
              Send reset link
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
