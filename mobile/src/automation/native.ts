/**
 * Thin wrapper around the local `EtrackoAutomation` native module (modules/etracko-automation).
 * The module only exists in Android dev/production builds; everywhere else (iOS, web, Expo Go)
 * every call degrades to a no-op so the rest of the app never has to care.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { AutomationEvent } from './types';

export interface SeenApp {
  packageName: string;
  appName: string;
}

export interface NativeAutomationConfig {
  enabled: boolean;
  sms: boolean;
  notifications: boolean;
  allowedPackages: string[];
}

interface EtrackoAutomationModule {
  getQueuedEvents(): AutomationEvent[];
  removeQueuedEvents(ids: string[]): void;
  clearQueue(): void;
  setConfig(enabled: boolean, sms: boolean, notifications: boolean, allowedPackages: string[]): void;
  isNotificationAccessGranted(): boolean;
  openNotificationAccessSettings(): void;
  getSeenApps(): SeenApp[];
  clearSeenApps(): void;
}

const NativeModule =
  Platform.OS === 'android' ? requireOptionalNativeModule<EtrackoAutomationModule>('EtrackoAutomation') : null;

export function isAutomationSupported(): boolean {
  return NativeModule !== null;
}

export function getQueuedEvents(): AutomationEvent[] {
  return NativeModule?.getQueuedEvents() ?? [];
}

export function removeQueuedEvents(ids: string[]): void {
  if (ids.length > 0) NativeModule?.removeQueuedEvents(ids);
}

export function clearQueue(): void {
  NativeModule?.clearQueue();
}

/** Mirrors the automation settings into native storage, so listeners can drop events without waking JS. */
export function setNativeConfig(config: NativeAutomationConfig): void {
  NativeModule?.setConfig(config.enabled, config.sms, config.notifications, config.allowedPackages);
}

export function isNotificationAccessGranted(): boolean {
  return NativeModule?.isNotificationAccessGranted() ?? false;
}

export function openNotificationAccessSettings(): void {
  NativeModule?.openNotificationAccessSettings();
}

/** Apps that posted a finance-looking notification on this device (package + label only, never content). */
export function getSeenApps(): SeenApp[] {
  return NativeModule?.getSeenApps() ?? [];
}

export function clearSeenApps(): void {
  NativeModule?.clearSeenApps();
}
