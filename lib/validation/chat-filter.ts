/**
 * Basic keyword filter for clan and war chat.
 * Blocks messages containing slurs, threats, or severe profanity.
 * This is a first-pass blocklist — production should use a moderation API.
 */

const BLOCKED_PATTERNS: readonly RegExp[] = [
  /\b(kill\s+(your)?self|kys)\b/i,
  /\b(n[i1]gg[ae3]r?s?)\b/i,
  /\b(f[a@]gg?[o0]t)\b/i,
  /\b(retard(ed)?)\b/i,
  /\b(r[a@]pe[ds]?)\b/i,
  /\b(go\s+die)\b/i,
];

export interface FilterResult {
  readonly allowed: boolean;
  readonly reason: string | null;
}

export function filterChatMessage(message: string): FilterResult {
  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { allowed: false, reason: 'empty_message' };
  }

  if (trimmed.length > 500) {
    return { allowed: false, reason: 'message_too_long' };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: 'blocked_content' };
    }
  }

  return { allowed: true, reason: null };
}
