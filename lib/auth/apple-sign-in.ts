import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface AppleSignInResult {
  readonly identityToken: string;
  readonly nonce: string;
  readonly fullName: {
    readonly givenName: string | null;
    readonly familyName: string | null;
  } | null;
}

/**
 * Returns true if Apple Sign In is available (iOS 13+ only).
 */
export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Performs native Apple Sign In flow.
 * Generates a SHA-256 nonce for Supabase OIDC verification.
 * Returns the identity token + nonce for signInWithIdToken.
 */
export async function performAppleSignIn(): Promise<AppleSignInResult> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In failed: no identity token received');
  }

  return {
    identityToken: credential.identityToken,
    nonce: rawNonce, // Supabase needs the raw nonce, not the hash
    fullName: credential.fullName
      ? {
          givenName: credential.fullName.givenName ?? null,
          familyName: credential.fullName.familyName ?? null,
        }
      : null,
  };
}
