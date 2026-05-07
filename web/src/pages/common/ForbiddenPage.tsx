import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { easeOutStrong } from '@/lib/motion';

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOutStrong }}
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center"
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-100 text-surface-500">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-surface-900">
        Access restricted
      </h1>
      <p className="text-sm text-surface-500">
        Your role doesn't have permission to view this page. Contact your HR
        administrator if you believe this is a mistake.
      </p>
      <Button variant="secondary" onClick={() => navigate('/')}>
        Return to dashboard
      </Button>
    </motion.div>
  );
}
