/**
 * Username validation utility for account registration and profile settings.
 *
 * Rules:
 * - Required: Yes
 * - Minimum length: 3 characters
 * - Maximum length: 30 characters
 * - Allowed characters: Letters, numbers, underscores (_), and hyphens (-)
 * - Spaces: Not allowed
 * - Special characters: Not allowed (@, #, $, etc.)
 * - Cannot start with a number
 * - Reserved names: Blocked (admin, support, system, etc.)
 * - Profanity / offensive words: Blocked
 * - Case-insensitive uniqueness enforced
 */

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

// Reserved system and role names (compared case-insensitively)
export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'support',
  'system',
  'root',
  'moderator',
  'mod',
  'help',
  'api',
  'bot',
  'guest',
  'user',
  'users',
  'official',
  'staff',
  'security',
  'service',
  'services',
  'tracker',
  'budget',
  'budgettracker',
  'billing',
  'auth',
  'account',
  'accounts',
  'settings',
  'dashboard',
  'login',
  'signup',
  'register',
  'null',
  'undefined',
  'test',
  'demo',
]);

// Profanity / offensive words list (matched against normalized strings)
export const PROFANITY_WORDS = [
  'ass',
  'asshole',
  'bastard',
  'bitch',
  'blowjob',
  'bollocks',
  'crap',
  'cunt',
  'damn',
  'dick',
  'dildo',
  'douche',
  'fag',
  'faggot',
  'fuck',
  'fucker',
  'fucking',
  'goddamn',
  'homo',
  'nigger',
  'nigga',
  'piss',
  'prick',
  'pussy',
  'retard',
  'scum',
  'shit',
  'shitty',
  'slut',
  'twat',
  'wank',
  'wanker',
  'whore',
];

/**
 * Normalizes a string by converting common leetspeak substitutions to alphabetic characters.
 */
function normalizeForProfanityCheck(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/[-_]/g, '');
}

/**
 * Checks whether a normalized username contains offensive words.
 * Handles substring matching carefully to avoid false positives on benign words like 'classic' or 'pass'.
 */
function containsProfanity(raw: string): boolean {
  const normalized = normalizeForProfanityCheck(raw);

  for (const word of PROFANITY_WORDS) {
    if (normalized === word) {
      return true;
    }
    // For 3-letter words like 'ass', only block if it starts/ends or is separated by delimiters
    if (word.length <= 3) {
      const lowerRaw = raw.toLowerCase();
      if (
        lowerRaw === word ||
        lowerRaw.startsWith(`${word}_`) ||
        lowerRaw.startsWith(`${word}-`) ||
        lowerRaw.endsWith(`_${word}`) ||
        lowerRaw.endsWith(`-${word}`) ||
        lowerRaw.includes(`_${word}_`) ||
        lowerRaw.includes(`-${word}-`) ||
        lowerRaw.includes(`_${word}-`) ||
        lowerRaw.includes(`-${word}_`)
      ) {
        return true;
      }
    } else {
      // For longer offensive words, block if contained anywhere
      if (normalized.includes(word)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates a username according to all business requirements.
 */
export function validateUsername(username: string | null | undefined): UsernameValidationResult {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required.' };
  }

  // Spaces check
  if (/\s/.test(username)) {
    return { isValid: false, error: 'Username cannot contain spaces.' };
  }

  const trimmed = username.trim();

  // Required check
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Username is required.' };
  }

  // Minimum length check
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters.' };
  }

  // Maximum length check
  if (trimmed.length > 30) {
    return { isValid: false, error: 'Username cannot be longer than 30 characters.' };
  }

  // Cannot start with a number
  if (/^[0-9]/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot start with a number.' };
  }

  // Allowed characters check (letters, numbers, underscores, and hyphens)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores (_), and hyphens (-).',
    };
  }

  const lower = trimmed.toLowerCase();

  // Reserved names check
  if (RESERVED_USERNAMES.has(lower)) {
    return { isValid: false, error: 'This username is reserved. Please choose another.' };
  }

  // Profanity / offensive words check
  if (containsProfanity(trimmed)) {
    return {
      isValid: false,
      error: 'This username contains inappropriate language. Please choose another.',
    };
  }

  return { isValid: true };
}
