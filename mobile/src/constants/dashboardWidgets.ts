import type { Ionicons } from '@expo/vector-icons';
import type { DashboardWidgetId } from '../types';

export interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** 'glance' items share one "At a glance" list; 'section' items get their own block. */
  kind: 'glance' | 'section';
}

// Catalogue order is also the order disabled widgets are listed in the customize sheet.
export const DASHBOARD_WIDGETS: DashboardWidgetMeta[] = [
  { id: 'todayActivity', title: "Today's entries", description: 'Everything you logged today', icon: 'git-commit-outline', kind: 'section' },
  { id: 'quickAdd', title: 'Quick add', description: 'One-tap shortcuts for frequent entries', icon: 'flash-outline', kind: 'section' },
  { id: 'week', title: 'This week', description: 'Spent since Monday, with a mini chart', icon: 'bar-chart-outline', kind: 'glance' },
  { id: 'budget', title: 'Monthly budget', description: 'What remains of your monthly budget', icon: 'pie-chart-outline', kind: 'glance' },
  { id: 'month', title: 'This month', description: 'Month-to-date spending vs last month', icon: 'calendar-outline', kind: 'glance' },
  { id: 'bills', title: 'Next bill', description: 'Your next upcoming payment', icon: 'receipt-outline', kind: 'glance' },
  { id: 'streak', title: 'Tracking streak', description: 'Days in a row you tracked your money', icon: 'flame-outline', kind: 'glance' },
  { id: 'owed', title: 'Owed to you', description: 'Money you lent that is still outstanding', icon: 'people-outline', kind: 'glance' },
  { id: 'balance', title: 'Total balance', description: 'Hidden until you tap to reveal it', icon: 'lock-closed-outline', kind: 'glance' },
  { id: 'goals', title: 'Goals', description: 'Progress on your savings goals', icon: 'flag-outline', kind: 'section' },
  { id: 'insights', title: 'Insights', description: 'Automatic observations about your spending', icon: 'bulb-outline', kind: 'section' },
];

export const DASHBOARD_WIDGET_MAP = new Map(DASHBOARD_WIDGETS.map((w) => [w.id, w]));
export const DASHBOARD_WIDGET_IDS = new Set(DASHBOARD_WIDGETS.map((w) => w.id));
