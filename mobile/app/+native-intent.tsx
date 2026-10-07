// The Google OAuth redirect is consumed by expo-auth-session; keep expo-router
// from navigating to a non-existent /oauth2redirect screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes('oauth2redirect')) {
    return '/';
  }
  return path;
}
