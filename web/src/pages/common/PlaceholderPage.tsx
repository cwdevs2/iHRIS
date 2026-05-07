import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { easeOutStrong } from '@/lib/motion';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  phase?: string;
}

export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-surface-900">{title}</h1>
        {description ? <p className="text-sm text-surface-500">{description}</p> : null}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
            <Construction className="h-5 w-5" />
          </div>
          <p className="text-base font-semibold text-surface-900">
            Coming up in {phase ?? 'a future phase'}
          </p>
          <p className="max-w-md text-sm text-surface-500">
            This module is part of the HRIS roadmap. The foundation is in place — UI,
            API, RBAC, and audit trail — and the module will plug in when its phase
            ships.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
