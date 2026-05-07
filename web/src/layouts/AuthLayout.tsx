import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { ShieldCheck, Lock, Clock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { easeOutStrong } from '@/lib/motion';

const trustItems = [
  { icon: ShieldCheck, label: 'Encrypted at rest' },
  { icon: Lock, label: 'Audit-logged access' },
  { icon: Clock, label: 'PH-compliant payroll' },
];

export function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-surface-50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Form pane */}
        <div className="relative flex flex-col">
          <header className="px-6 py-6 sm:px-10">
            <Logo />
          </header>

          <main className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </main>

          <footer className="px-6 py-6 text-xs text-surface-400 sm:px-10">
            © {new Date().getFullYear()} iHRIS · Built for PH-compliant HR teams
          </footer>
        </div>

        {/* Trust pane (right) — hidden on mobile */}
        <aside className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-surface-900" />
          <div className="absolute inset-0 bg-dot-grid opacity-20" />

          {/* Soft orb accents */}
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-400/30 blur-3xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: easeOutStrong }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-40 -left-20 h-[26rem] w-[26rem] rounded-full bg-cyan-300/20 blur-3xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.1, ease: easeOutStrong }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
            <div className="max-w-md">
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOutStrong }}
                className="text-4xl font-semibold leading-tight tracking-tight"
              >
                The HR system your team can actually trust.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.06, ease: easeOutStrong }}
                className="mt-4 text-base leading-relaxed text-white/70"
              >
                Payroll, attendance, leaves, and compliance — auditable end-to-end,
                tuned for Philippine labor law and statutory contributions.
              </motion.p>
            </div>

            <ul className="grid gap-3">
              {trustItems.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.18 + i * 0.06, ease: easeOutStrong }}
                  className="flex items-center gap-3 text-sm text-white/85"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/5">
                    <item.icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </motion.li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
