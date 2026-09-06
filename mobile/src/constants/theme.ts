export interface ThemeColors {
  primary: string;
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
  primary: '#2E7D32',
  background: '#F4F7F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1B2420',
  textLight: '#6B7A72',
  border: '#E3EAE5',
  white: '#FFFFFF',
  income: '#2E9E5B',
  expense: '#D64545',
  warning: '#E0A62B',
  shadow: '#000000',
};

export const darkColors: ThemeColors = {
  primary: '#4CAF50',
  background: '#0F1512',
  surface: '#1A211D',
  card: '#1A211D',
  text: '#EDF2EF',
  textLight: '#8FA098',
  border: '#293530',
  white: '#FFFFFF',
  income: '#4CD07A',
  expense: '#F0685F',
  warning: '#F2BB4D',
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
