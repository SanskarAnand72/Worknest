/**
 * RevRecovery Client Portal - KPI Calculations & Verification Logic
 * Provides consistent, verified KPI metrics calculations across internal preview,
 * client portal sessions, and mobile interfaces.
 */

export interface KpiMetricResult {
  actual: number;
  target: number;
  percent: number;
  formattedPercent: string;
  barWidth: number; // visually capped at 100%
  statusLabel: 'Delivered' | 'Target achieved' | 'In progress';
  isDelivered: boolean;
}

/**
 * Computes completion percentage, formatted label, and verified status for a KPI target.
 *
 * Rules:
 * 1. Completion = (actual / target) * 100
 * 2. Visual progress bar is capped at 100%
 * 3. Percentage shows true completion value (e.g. 2500/250 = 1000%, 100/30 = 333.3%, 0/500 = 0%)
 * 4. Never label "Delivered" just because actual >= target
 * 5. Show "Target achieved" when actual >= target and "In progress" when actual < target
 * 6. Show "Delivered" ONLY when delivery is genuinely verified from stored records
 * 7. Safe handling of zero or missing targets without throwing NaN or Infinity
 * 8. Identical calculations in internal preview and on client portal devices
 */
export function computeKpiMetric(
  actual: number | undefined | null,
  target: number | undefined | null,
  isVerifiedFromStoredRecords: boolean = false
): KpiMetricResult {
  const safeActual = typeof actual === 'number' && Number.isFinite(actual) && actual > 0 ? actual : 0;
  const safeTarget = typeof target === 'number' && Number.isFinite(target) && target > 0 ? target : 0;

  let percent = 0;
  if (safeTarget > 0) {
    percent = (safeActual / safeTarget) * 100;
  }

  const rounded = Math.round(percent * 10) / 10;
  const formattedPercent = `${rounded}%`;
  const barWidth = Math.min(100, Math.max(0, percent));

  let statusLabel: 'Delivered' | 'Target achieved' | 'In progress' = 'In progress';
  if (safeTarget > 0 && isVerifiedFromStoredRecords) {
    statusLabel = 'Delivered';
  } else if (safeTarget > 0 && safeActual >= safeTarget) {
    statusLabel = 'Target achieved';
  } else {
    statusLabel = 'In progress';
  }

  return {
    actual: safeActual,
    target: safeTarget,
    percent,
    formattedPercent,
    barWidth,
    statusLabel,
    isDelivered: statusLabel === 'Delivered',
  };
}
