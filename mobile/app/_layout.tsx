import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeScreen from '../src/components/ui/SafeScreen';
import PageLoader from '../src/components/ui/PageLoader';
import AppLockScreen from '../src/components/AppLockScreen';
import { useAppStore } from '../src/store/useAppStore';
import { syncExpenseReminder } from '../src/services/notificationService';

function RootLayoutContent() {
  const isReady = useAppStore((s) => s.isReady);
  const onboardingComplete = useAppStore((s) => s.settings.onboardingComplete);
  const notificationsEnabled = useAppStore((s) => s.settings.notificationsEnabled);
  const expenseReminderEnabled = useAppStore((s) => s.settings.expenseReminderEnabled);
  const expenseReminderTime = useAppStore((s) => s.settings.expenseReminderTime);
  const expenseReminderFrequency = useAppStore((s) => s.settings.expenseReminderFrequency);
  const appLockEnabled = useAppStore((s) => s.settings.appLockEnabled);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const pathname = usePathname();

  // `unlocked` only ever flips true via AppLockScreen's onUnlock callback, and
  // back to false via the AppState subscription below — never inside a bare
  // effect body — so the app is locked-by-default on every fresh launch
  // (isReady flips true from the store, `unlocked` starts false) without
  // needing a dedicated "lock on launch" effect.
  const [unlocked, setUnlocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const isLocked = isReady && appLockEnabled && !unlocked;

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isReady) return;
    syncExpenseReminder({
      notificationsEnabled,
      expenseReminderEnabled,
      expenseReminderTime,
      expenseReminderFrequency,
    });
  }, [isReady, notificationsEnabled, expenseReminderEnabled, expenseReminderTime, expenseReminderFrequency]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current === 'active' && next.match(/inactive|background/) && appLockEnabled) {
        setUnlocked(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [appLockEnabled]);

  if (!isReady) {
    return (
      <SafeScreen>
        <PageLoader />
      </SafeScreen>
    );
  }

  if (isLocked) {
    return (
      <SafeScreen>
        <AppLockScreen onUnlock={() => setUnlocked(true)} />
      </SafeScreen>
    );
  }

  if (!onboardingComplete && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <SafeScreen>
      <Slot />
    </SafeScreen>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutContent />
    </SafeAreaProvider>
  );
}
