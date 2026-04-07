import { supabase } from '@/services/supabase';
import type { Session } from '@supabase/supabase-js';

export type AuthProvider = 'apple' | 'google';

interface SignInWithProviderResult {
  readonly session: Session | null;
  readonly error: string | null;
}

/**
 * Signs in with a native identity token via Supabase signInWithIdToken.
 * This avoids web-based OAuth redirects — Apple rejects apps that use
 * browser-based Apple Sign In when a native option exists.
 */
export async function signInWithProvider(
  provider: AuthProvider,
  token: string,
  nonce: string
): Promise<SignInWithProviderResult> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token,
    nonce,
  });

  if (error) {
    return { session: null, error: error.message };
  }

  return { session: data.session, error: null };
}
