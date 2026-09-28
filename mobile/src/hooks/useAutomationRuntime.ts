import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { addAutomationResponseListener, AUTOMATION_ACTIONS } from '../services/notificationService';
import { showToast } from '../components/ui/Toast';

/**
 * Foreground half of transaction automation: reacts to taps on "Expense detected" notifications
 * (View / Change Category / Undo) and processes anything queued while the app was in the background.
 * Mount once, inside the unlocked app (so a notification action can't bypass the app lock).
 */
export function useAutomationRuntime() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = addAutomationResponseListener(async (actionId, data) => {
      const store = useAppStore.getState();
      if (data.kind === 'review') {
        router.push('/automation/review');
        return;
      }
      if (actionId === AUTOMATION_ACTIONS.undo) {
        const undone = await store.undoDetection(data.detectionId);
        showToast(undone ? 'Detected transaction removed' : 'Already removed');
        return;
      }
      const exists = data.transactionId && store.transactions.some((t) => t.id === data.transactionId);
      if (exists) {
        router.push({ pathname: '/transaction/[id]', params: { id: data.transactionId! } });
      } else {
        router.push('/transactions');
      }
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') useAppStore.getState().processAutomationQueue().catch(() => {});
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [router]);
}
