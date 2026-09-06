import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  GOOGLE_OAUTH_CLIENT_ID_ANDROID,
  GOOGLE_OAUTH_CLIENT_ID_IOS,
  GOOGLE_DRIVE_SCOPES,
} from '../constants/googleAuthConfig';
import * as googleAuthService from '../services/googleAuthService';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function getGoogleClientId(): string {
  return Platform.OS === 'ios' ? GOOGLE_OAUTH_CLIENT_ID_IOS : GOOGLE_OAUTH_CLIENT_ID_ANDROID;
}

export function useGoogleDriveAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const clientId = getGoogleClientId();

  const signIn = useCallback(async (): Promise<boolean> => {
    if (!clientId) {
      throw new Error('Google OAuth client ID is not configured yet.');
    }

    setIsSigningIn(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'mobile', path: 'google-auth' });
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: GOOGLE_DRIVE_SCOPES,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: { access_type: 'offline', prompt: 'consent' },
      });

      await request.makeAuthUrlAsync(discovery);
      const result = await request.promptAsync(discovery);

      if (result.type !== 'success' || !result.params.code) {
        return false;
      }

      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
        },
        discovery
      );

      await googleAuthService.saveTokens({
        refreshToken: tokenResponse.refreshToken,
        accessToken: tokenResponse.accessToken,
        expiresInSec: tokenResponse.expiresIn ?? 3600,
      });

      return true;
    } finally {
      setIsSigningIn(false);
    }
  }, [clientId]);

  return { signIn, isSigningIn, isConfigured: !!clientId };
}
