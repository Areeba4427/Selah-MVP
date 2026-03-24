// src/theme/index.js

export const Colors = {
  // App backgrounds
  bg: '#08090f',
  surface: '#0e1018',
  surfaceLight: '#131420',
  border: 'rgba(255,255,255,0.08)',

  // Faith palette
  faithPrimary: '#c9a96e',
  faithSoft: '#e8d5b0',
  faithGlow: 'rgba(201,169,110,0.18)',

  // Secular palette
  secularPrimary: '#7ec8c8',
  secularSoft: '#b8e8e8',
  secularGlow: 'rgba(126,200,200,0.18)',

  // ── Icy gradient palette (Alert / Breathe / Done screens) ──────────────────
  // Gradient runs: bottom (dark) → top (light/icy)
  icyGradient: ['#dce8f5', '#a8bfd8', '#3a5a80', '#111a2c', '#080c16'],
  icyGradientLocations: [0, 0.22, 0.52, 0.82, 1],

  // Dark initial gradient (Screen 1 — stress trigger)
  darkGradient: ['#0d0e14', '#090c12', '#06080e'],
  darkGradientLocations: [0, 0.5, 1],

  // Individual stops (for manual use if needed)
  icyTop: '#dce8f5',    // pale icy white-blue
  icyMid: '#a8bfd8',    // cool slate blue
  icyDeep: '#3a5a80',   // deeper ocean blue
  icyBase: '#080c16',   // near-black

  // Text on icy backgrounds
  icyText: '#2a3d58',         // dark cool text for icy bg
  icyTextSoft: '#4a6580',     // softer dark text
  icyTextOnDark: '#c8daea',   // light text for dark sections

  // Utility
  text: '#e8e4dc',
  textDim: 'rgba(232,228,220,0.45)',
  textDimmer: 'rgba(232,228,220,0.25)',
  hrRed: '#e05050',
  hrRedBg: 'rgba(224,80,80,0.12)',
  success: '#7ec87e',
  warning: '#e0c050',
  danger: '#e07070',

  white: '#ffffff',
  black: '#000000',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Typography = {
  displayLg: {fontSize: 48, fontWeight: '300', letterSpacing: 2},
  displayMd: {fontSize: 32, fontWeight: '300', letterSpacing: 1},
  displaySm: {fontSize: 22, fontWeight: '300', letterSpacing: 0.5},
  bodyLg: {fontSize: 16, fontWeight: '400', lineHeight: 24},
  bodyMd: {fontSize: 14, fontWeight: '400', lineHeight: 21},
  bodySm: {fontSize: 12, fontWeight: '400', lineHeight: 18},
  labelMd: {fontSize: 11, fontWeight: '500', letterSpacing: 1.4},
  labelSm: {fontSize: 9, fontWeight: '500', letterSpacing: 1.2},
  labelXs: {fontSize: 8, fontWeight: '500', letterSpacing: 1.0},
};
