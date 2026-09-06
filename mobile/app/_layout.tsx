import { useEffect } from 'react';
import { Redirect, Slot, usePathname } from 'expo-router';
import SafeScreen from '../src/components/ui/SafeScreen';
import PageLoader from '../src/components/ui/PageLoader';
import { useAppStore } from '../src/store/useAppStore';

export default function RootLayout() {
  const isReady = useAppStore((s) => s.isReady);
  const onboardingComplete = useAppStore((s) => s.settings.onboardingComplete);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const pathname = usePathname();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (!isReady) {
    return (
      <SafeScreen>
        <PageLoader />
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
