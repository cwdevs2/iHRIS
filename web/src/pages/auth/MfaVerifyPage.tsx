import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { easeOutStrong } from '@/lib/motion';

type Mode = 'totp' | 'recovery';

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);

  const challengeToken = (location.state as { challengeToken?: string } | null)?.challengeToken ?? '';
  const fromPath = (location.state as { from?: string } | null)?.from ?? '/';

  const [mode, setMode] = useState<Mode>('totp');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if landed without a challenge token.
  useEffect(() => {
    if (!challengeToken) {
      navigate('/login', { replace: true });
    }
  }, [challengeToken, navigate]);

  const totpCode = digits.join('');
  const isComplete = mode === 'totp' ? totpCode.length === 6 : recoveryCode.trim().length >= 8;

  const handleDigitInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const code = mode === 'totp' ? totpCode : recoveryCode.trim();
      const result = await authApi.mfaVerify(
        { code, device_name: navigator.userAgent.slice(0, 200) },
        challengeToken,
      );
      setToken(result.token);
      setUser(result.user);
      toast.success('Signed in successfully.');
      navigate(fromPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fields?.code?.[0] ?? err.message ?? 'Verification failed.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      if (mode === 'totp') setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!challengeToken) return null;

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
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
          <ShieldCheck className="h-6 w-6 text-brand-600" />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-surface-900">
          Two-factor authentication
        </h2>
        <p className="text-sm text-surface-500">
          {mode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Enter one of your 8-character recovery codes.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <AnimatePresence mode="wait">
          {mode === 'totp' ? (
            <motion.div
              key="totp"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitInput(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    autoFocus={i === 0}
                    className={[
                      'h-14 w-full rounded-lg border bg-surface-0 text-center text-xl font-semibold',
                      'text-surface-900 placeholder:text-surface-300',
                      'focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600',
                      'transition-[border-color,box-shadow] duration-150',
                      error ? 'border-red-400' : 'border-surface-300',
                    ].join(' ')}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
            >
              <input
                type="text"
                value={recoveryCode}
                onChange={(e) => { setRecoveryCode(e.target.value); setError(null); }}
                autoFocus
                placeholder="XXXXX-XXXXX"
                className={[
                  'h-12 w-full rounded-lg border bg-surface-0 px-4 font-mono text-sm',
                  'text-surface-900 placeholder:text-surface-300',
                  'focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600',
                  'transition-[border-color,box-shadow] duration-150',
                  error ? 'border-red-400' : 'border-surface-300',
                ].join(' ')}
                aria-label="Recovery code"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-red-600"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </motion.div>
        ) : null}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={!isComplete}>
          Verify
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => { setMode(mode === 'totp' ? 'recovery' : 'totp'); setError(null); }}
          className="text-sm text-brand-600 hover:underline cursor-pointer"
        >
          {mode === 'totp' ? 'Use a recovery code instead' : 'Use authenticator app instead'}
        </button>
      </div>
    </motion.div>
  );
}
