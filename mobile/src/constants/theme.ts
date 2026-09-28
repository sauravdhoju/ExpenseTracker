export interface ThemeColors {
  primary: string;
  primaryDeep: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textLight: string;
  border: string;
  white: string;
  income: string;
  expense: string;
  warning: string;
  shadow: string;
}

/** Logo palette. Theme tokens below are derived from these; use the tokens in UI code. */
export const brand = {
  red: '#E11937',
  redDeep: '#AC0C27',
  redDark: '#74081B',
  redLight: '#E36B7F',
  blue: '#1157DE',
  blueBright: '#2790EE',
  blueLight: '#74BBED',
  blueDeep: '#1450C8',
  /** Softer sky blues derived from blueBright, used as the app's working primary. */
  sky: '#2790EE',
  skyDeep: '#1E7FDB',
  skySoft: '#5AAEF2',
};

export const lightColors: ThemeColors = {
  primary: brand.sky,
  primaryDeep: brand.skyDeep,
  background: '#F4F6FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0E1B36',
  textLight: '#667391',
  border: '#E2E7F2',
  white: '#FFFFFF',
  income: '#16A34A',
  expense: brand.red,
  warning: '#D97706',
  shadow: '#0E1B36',
};

export const darkColors: ThemeColors = {
  primary: brand.skySoft,
  primaryDeep: brand.blueLight,
  background: '#0B1220',
  surface: '#141D2E',
  card: '#141D2E',
  text: '#EEF2FA',
  textLight: '#8A97B0',
  border: '#243049',
  white: '#FFFFFF',
  income: '#4ADE80',
  expense: brand.redLight,
  warning: '#FBBF24',
  shadow: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
