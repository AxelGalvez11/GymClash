import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

// Required for expo-auth-session to close the browser after auth
WebBrowser.maybeCompleteAuthSession();

export interface GoogleSignInResult {
  readonly idToken: string;
  readonly nonce: string;
}

const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';

/**
 * Performs Google Sign In using expo-auth-session.
 * Uses authorization code flow with PKCE + nonce for Supabase OIDC.
 */
export async function performGoogleSignIn(): Promise<GoogleSignInResult> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'gymclash',
    path: 'auth/callback',
  });

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID_WEB, // Web client ID works for all platforms with Supabase
    redirectUri,
    scopes: ['openid', 'email', 'profile'],
    responseType: AuthSession.ResponseType.IdToken,
    extraParams: {
      nonce: hashedNonce,
    },
    usePKCE: false, // Not needed for implicit flow with id_token
  });

  const googleDiscovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  await request.makeAuthUrlAsync(googleDiscovery);

  const result = await request.promptAsync(googleDiscovery);

  if (result.type !== 'success') {
    throw new Error(
      result.type === 'cancel'
        ? 'Google Sign In was cancelled'
        : `Google Sign In failed: ${result.type}`
    );
  }

  const idToken = result.params?.id_token;

  if (!idToken) {
    throw new Error('Google Sign In failed: no ID token received');
  }

  return {
    idToken,
    nonce: rawNonce,
  };
}
