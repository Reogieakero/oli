// Mirrors the CSS custom properties in app/globals.css.
// If you change a brand/status color there, update this file too.
// See BRANDING.md "Chart Colors" section.
export const chartColors = {
  primary: '#40A5BE',
  accent: '#3FC7DD',
  light: '#B6DFE6',
  dark: '#1F5C6E',
  success: '#2E9E5B',  // present
  warning: '#D6A419',  // late
  danger: '#D6493D',   // absent
  neutral: '#6B7684',  // pending / no data
  border: 'rgba(15, 32, 39, 0.12)',
  mutedText: 'rgba(15, 32, 39, 0.56)',
} as const;

export type ChartColorKey = keyof typeof chartColors;