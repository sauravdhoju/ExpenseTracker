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

export const lightColors: ThemeColors = {
  primary: '#0EA5E9',
  primaryDeep: '#0369A1',
  background: '#F1F7FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F2A3D',
  textLight: '#6A8299',
  border: '#DCEAF3',
  white: '#FFFFFF',
  income: '#16A34A',
  expense: '#E1462F',
  warning: '#D97706',
  shadow: '#0B2436',
};

export const darkColors: ThemeColors = {
  primary: '#38BDF8',
  primaryDeep: '#0EA5E9',
  background: '#0A1622',
  surface: '#122334',
  card: '#122334',
  text: '#E8F2FA',
  textLight: '#7E96AC',
  border: '#1E3548',
  white: '#FFFFFF',
  income: '#4ADE80',
  expense: '#F87171',
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
