/**
 * Shared utility for achievement color classification
 * Uses consistent 4-band system across all dashboard pages
 */

export function getAchievementColorClass(percent: number | null | undefined): string {
  // Handle null/undefined
  if (percent === null || percent === undefined) {
    return '';
  }
  
  // Apply 4-band thresholds
  if (percent >= 75) return 'achievement-high';      // 75-100%: Green
  if (percent >= 50) return 'achievement-medium';    // 50-<75%: Yellow
  if (percent >= 25) return 'achievement-basic';     // 25-<50%: Mild Orange
  return 'achievement-low';                          // 0-<25%: Red
}

/**
 * Format percent value for display, handling null/undefined
 */
export function formatPercent(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) {
    return '-';
  }
  return `${percent}%`;
}

/**
 * Get achievement level label (updated terminology)
 */
export function getAchievementLabel(percent: number): string {
  if (percent >= 75) return 'Exceeding Goals';
  if (percent >= 50) return 'Meeting Goals';
  if (percent >= 25) return 'Making Progress';
  return 'Needs Improvement';
}

