import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Play,
  Square,
  MapPin,
  MonitorSmartphone,
  Home,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useEss';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { AttendanceLocationType } from '@/types';

dayjs.extend(duration);

/* ──────────────────────────────────────────────────────────────────
   Live clock component
   ────────────────────────────────────────────────────────────────── */
function LiveClock() {
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 select-none" aria-live="polite" aria-atomic>
      <p className="text-[3.5rem] font-semibold leading-none tracking-tight tabular-nums text-surface-900">
        {now.format('h:mm')}
        <span className="text-2xl text-surface-400 ml-1">{now.format('ss')}</span>
      </p>
      <p className="text-sm font-medium text-surface-500">{now.format('A · dddd, MMMM D, YYYY')}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Elapsed timer once clocked in
   ────────────────────────────────────────────────────────────────── */
function ElapsedTimer({ clockInAt }: { clockInAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = dayjs().diff(dayjs(clockInAt), 'second');
      const dur  = dayjs.duration(diff, 'seconds');
      setElapsed(
        diff >= 3600
          ? `${String(Math.floor(dur.asHours())).padStart(2, '0')}:${dur.format('mm:ss')}`
          : dur.format('mm:ss'),
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [clockInAt]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-xs font-medium uppercase tracking-wider text-surface-400">Time elapsed</p>
      <p className="text-2xl font-semibold tabular-nums text-brand-600">{elapsed}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Location type selector
   ────────────────────────────────────────────────────────────────── */
const LOCATION_TYPES: Array<{ value: AttendanceLocationType; label: string; icon: typeof Home }> = [
  { value: 'on_site', label: 'On-site',  icon: Briefcase },
  { value: 'remote',  label: 'Remote',   icon: Home },
  { value: 'field',   label: 'Field',    icon: MapPin },
];

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */
export function EssClockPage() {
  const { data, isLoading } = useTodayAttendance();
  const clockInMutation  = useClockIn();
  const clockOutMutation = useClockOut();
  const [locationType, setLocationType] = useState<AttendanceLocationType>('on_site');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const geoRequested = useRef(false);

  const log = data?.log ?? null;
  const isClockedIn  = !!log?.clock_in_at;
  const isClockedOut = !!log?.clock_out_at;
  const isDone       = isClockedIn && isClockedOut;

  // Request GPS coordinates when component mounts
  useEffect(() => {
    if (geoRequested.current) return;
    geoRequested.current = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('Location permission denied — coordinates will not be recorded.'),
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  function handleClockIn() {
    clockInMutation.mutate({
      lat: geoCoords?.lat,
      lng: geoCoords?.lng,
      location_type: locationType,
    });
  }

  function handleClockOut() {
    clockOutMutation.mutate({
      lat: geoCoords?.lat,
      lng: geoCoords?.lng,
    });
  }

  const isActing = clockInMutation.isPending || clockOutMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6 max-w-lg mx-auto"
    >
      {/* Back */}
      <Link
        to="/ess"
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-900 transition-colors duration-150 cursor-pointer w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        ESS Portal
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Clock In / Out</h1>
        <p className="mt-0.5 text-sm text-surface-500">Record your daily attendance.</p>
      </div>

      {/* Clock card */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <LiveClock />

          {/* Status */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
              </motion.div>
            ) : isDone ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 w-full">
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  Shift complete
                </Badge>
                <div className="grid w-full grid-cols-2 gap-4 rounded-xl bg-surface-50 p-4">
                  <div className="text-center">
                    <p className="text-xs text-surface-400">Clocked In</p>
                    <p className="text-lg font-semibold tabular-nums text-surface-900">{dayjs(log!.clock_in_at!).format('h:mm A')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-surface-400">Clocked Out</p>
                    <p className="text-lg font-semibold tabular-nums text-surface-900">{dayjs(log!.clock_out_at!).format('h:mm A')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-surface-400">Regular Hours</p>
                    <p className="text-lg font-semibold tabular-nums text-surface-900">{parseFloat(log!.regular_hours).toFixed(1)}h</p>
                  </div>
                  {parseFloat(log?.overtime_hours ?? '0') > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-surface-400">Overtime</p>
                      <p className="text-lg font-semibold tabular-nums text-amber-600">+{parseFloat(log!.overtime_hours).toFixed(1)}h</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-surface-400 text-center">See an issue? <Link to="/ess/correction" className="text-brand-600 hover:text-brand-700 cursor-pointer">File a correction request</Link>.</p>
              </motion.div>
            ) : isClockedIn ? (
              <motion.div key="clocked-in" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 w-full">
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  You are clocked in
                </Badge>
                <ElapsedTimer clockInAt={log!.clock_in_at!} />
                <div className="text-center">
                  <p className="text-xs text-surface-400">Clocked in at</p>
                  <p className="text-2xl font-semibold tabular-nums text-surface-900">{dayjs(log!.clock_in_at!).format('h:mm A')}</p>
                </div>
                <Button
                  variant="danger"
                  size="lg"
                  className="w-full rounded-xl h-14 text-base pressable"
                  loading={isActing}
                  onClick={handleClockOut}
                  leftIcon={<Square className="h-5 w-5" />}
                >
                  Clock Out
                </Button>
              </motion.div>
            ) : (
              <motion.div key="not-clocked-in" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 w-full">
                {/* Location type selector */}
                <div className="flex w-full gap-2">
                  {LOCATION_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLocationType(value)}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all duration-150 cursor-pointer',
                        locationType === value
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-surface-200 bg-surface-0 text-surface-500 hover:bg-surface-50',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* GPS status */}
                {geoError ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 w-full">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {geoError}
                  </div>
                ) : geoCoords ? (
                  <div className="flex items-center gap-1.5 text-xs text-cta-600 w-full">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    Location detected — coordinates will be recorded.
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-surface-400 w-full">
                    <MapPin className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                    Requesting location…
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full rounded-xl h-14 text-base pressable"
                  loading={isActing}
                  onClick={handleClockIn}
                  leftIcon={<Play className="h-5 w-5" />}
                >
                  Clock In
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Location indicator */}
      <div className="flex items-center gap-2 rounded-xl border border-surface-100 bg-surface-50 px-4 py-3">
        <MonitorSmartphone className="h-4 w-4 shrink-0 text-surface-400" aria-hidden />
        <p className="text-xs text-surface-500">
          Clocking in via <strong>Web</strong>. Timestamps are recorded in UTC and displayed in Philippine Standard Time.
        </p>
      </div>
    </motion.div>
  );
}
