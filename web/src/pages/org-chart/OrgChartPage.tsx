import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, ChevronDown, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useOrgChart, type OrgChartDepartmentNode } from '@/hooks/useOrgChart';
import { easeOutStrong } from '@/lib/motion';
import { cn } from '@/lib/cn';

// ─── Department node card ─────────────────────────────────────────────────────

function DeptCard({ node, depth }: { node: OrgChartDepartmentNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={cn(
          'relative flex flex-col items-center gap-2 rounded-xl border bg-surface-0 px-4 py-3 shadow-[var(--shadow-1)]',
          'min-w-[180px] max-w-[220px] cursor-default',
          depth === 0
            ? 'border-brand-200 bg-brand-50'
            : 'border-surface-200',
        )}
      >
        <div className={cn('grid h-9 w-9 place-items-center rounded-full text-sm font-bold', depth === 0 ? 'bg-brand-200 text-brand-800' : 'bg-surface-100 text-surface-600')}>
          <Building2 className="h-4 w-4" />
        </div>
        <div className="text-center">
          <p className={cn('text-xs font-semibold leading-tight', depth === 0 ? 'text-brand-900' : 'text-surface-900')}>
            {node.name}
          </p>
          <p className="text-[10px] text-surface-400 mt-0.5">{node.code}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-surface-500">
          <Users className="h-3 w-3" />
          {node.employee_count} {node.employee_count === 1 ? 'employee' : 'employees'}
        </div>
        {node.head ? (
          <div className="flex items-center gap-1.5 rounded-full bg-surface-100 px-2 py-0.5">
            {node.head.avatar_url ? (
              <img src={node.head.avatar_url} className="h-4 w-4 rounded-full object-cover" alt="" />
            ) : (
              <div className="grid h-4 w-4 place-items-center rounded-full bg-brand-200 text-[8px] font-bold text-brand-700">
                {node.head.full_name[0]}
              </div>
            )}
            <p className="text-[10px] text-surface-600 font-medium truncate max-w-[100px]">{node.head.full_name}</p>
          </div>
        ) : null}

        {/* Expand toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              'absolute -bottom-3 left-1/2 -translate-x-1/2',
              'grid h-6 w-6 place-items-center rounded-full border border-surface-200 bg-surface-0 shadow-sm text-surface-500',
              'hover:border-brand-200 hover:text-brand-600 cursor-pointer transition-colors',
            )}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : null}
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: easeOutStrong }}
            className="overflow-visible"
          >
            {/* Vertical connector */}
            <div className="flex justify-center">
              <div className="w-px bg-surface-200" style={{ height: 28 }} />
            </div>

            {/* Horizontal bar + children */}
            <div className="relative flex items-start gap-6">
              {/* Horizontal connector line */}
              {node.children.length > 1 ? (
                <div
                  className="absolute top-0 left-0 right-0 h-px bg-surface-200"
                  style={{ top: 0, left: '10%', right: '10%' }}
                />
              ) : null}
              {node.children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Vertical drop from horizontal bar */}
                  <div className="w-px bg-surface-200" style={{ height: 12 }} />
                  <DeptCard node={child} depth={depth + 1} />
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

export function OrgChartPage() {
  const { data, isLoading } = useOrgChart();
  const [scale, setScale]   = useState(1);
  const viewRef             = useRef<HTMLDivElement>(null);

  const zoom = useCallback((delta: number) => {
    setScale((prev) => Math.min(2, Math.max(0.4, +(prev + delta).toFixed(2))));
  }, []);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Org Chart</h1>
          <p className="mt-0.5 text-sm text-surface-500">Interactive department hierarchy</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" leftIcon={<ZoomOut className="h-3.5 w-3.5" />} onClick={() => zoom(-0.1)}>
            Zoom out
          </Button>
          <span className="text-xs text-surface-500 tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="secondary" leftIcon={<ZoomIn className="h-3.5 w-3.5" />} onClick={() => zoom(0.1)}>
            Zoom in
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setScale(1)}>
            Reset
          </Button>
        </div>
      </motion.div>

      {/* Chart canvas */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="overflow-auto p-6" style={{ minHeight: 400, maxHeight: '70vh' }} ref={viewRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3 text-surface-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-200 border-t-brand-600" />
                  <p className="text-sm">Loading org chart…</p>
                </div>
              </div>
            ) : !data?.departments?.length ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-100 text-surface-400">
                  <Building2 className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-surface-900">No departments configured</p>
                <p className="text-xs text-surface-500">Add departments in the Organization page to see the chart.</p>
              </div>
            ) : (
              <div
                className="flex origin-top flex-col items-center gap-0 transition-transform duration-200"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
              >
                {data.departments.map((dept) => (
                  <div key={dept.id} className="mb-8">
                    <DeptCard node={dept} depth={0} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Legend */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 text-xs text-surface-500">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-brand-50 border border-brand-200" />
          Root department
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-surface-0 border border-surface-200" />
          Sub-department
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          Active employees
        </div>
      </motion.div>
    </motion.div>
  );
}
