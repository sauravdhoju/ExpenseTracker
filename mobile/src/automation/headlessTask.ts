import { drainAutomationQueue } from './automationService';

/** Must match AutomationTaskService.TASK_NAME in modules/etracko-automation. */
export const AUTOMATION_TASK_NAME = 'ETrackoAutomation';

/**
 * Entry point Android invokes (via HeadlessJsTaskService) when an SMS or notification was queued.
 * Parses, saves and notifies, then returns so the service can stop — nothing keeps running afterwards.
 */
export async function runAutomationTask(): Promise<void> {
  const changed = await drainAutomationQueue();
  if (changed === 0) return;
  // If the UI happens to be alive in this JS runtime, refresh it so the new transaction shows up.
  const { useAppStore } = await import('../store/useAppStore');
  if (useAppStore.getState().isReady) await useAppStore.getState().refreshAll();
}
