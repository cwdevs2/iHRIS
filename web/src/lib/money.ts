/** Format a peso amount with thousands separators. Uses Intl for locale safety. */
export function formatPeso(amount: number | string | null | undefined, options: { showSymbol?: boolean } = {}): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return options.showSymbol === false ? formatted : `₱ ${formatted}`;
}

/** Compact amount (e.g. ₱1.2M) — useful for dashboard cards. */
export function formatPesoCompact(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-PH', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'currency',
    currency: 'PHP',
    currencyDisplay: 'symbol',
  }).format(safe);
}
