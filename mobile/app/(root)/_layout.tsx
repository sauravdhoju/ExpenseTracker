import { Stack } from 'expo-router/stack';

export default function RootGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="more" />
      <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="accounts/index" />
      <Stack.Screen name="accounts/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="accounts/[id]" />
      <Stack.Screen name="categories/index" />
      <Stack.Screen name="goals/index" />
      <Stack.Screen name="goals/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="recurring/index" />
      <Stack.Screen name="recurring/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="bills/index" />
      <Stack.Screen name="bills/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings/currency" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/appearance" />
      <Stack.Screen name="settings/data" />
    </Stack>
  );
}
