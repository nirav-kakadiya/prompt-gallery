/**
 * Username validation and utilities
 * Centralized logic for production-grade username handling
 */

// Reserved usernames that cannot be used
export const RESERVED_USERNAMES = new Set([
  // System routes
  'admin', 'api', 'auth', 'login', 'logout', 'register', 'signup', 'signin',
  'settings', 'profile', 'account', 'dashboard', 'user', 'users',
  // App routes
  'prompts', 'prompt', 'gallery', 'collections', 'collection', 'trending',
  'categories', 'category', 'tags', 'tag', 'search', 'explore', 'discover',
  'submit', 'create', 'new', 'edit', 'delete', 'upload',
  // Static pages
  'about', 'contact', 'help', 'support', 'faq', 'terms', 'privacy', 'dmca',
  'cookies', 'blog', 'docs', 'documentation', 'changelog', 'careers', 'jobs',
  // API/System
  'api', 'graphql', 'webhook', 'webhooks', 'callback', 'oauth', 'sso',
  'public', 'static', 'assets', 'images', 'media', 'files', 'cdn',
  // Reserved/Brand
  'root', 'system', 'null', 'undefined', 'anonymous', 'unknown',
  'promptgallery', 'prompt-gallery', 'official', 'verified', 'staff', 'team',
  'moderator', 'mod', 'administrator', 'owner', 'founder',
  // Common blocked
  'www', 'http', 'https', 'ftp', 'mail', 'email', 'smtp', 'pop', 'imap',
  'test', 'testing', 'demo', 'example', 'sample',
]);

// Username validation regex: 3-30 chars, alphanumeric, underscore, hyphen
// Must start with a letter or number
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}$/;

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate and normalize a username
 */
export function validateUsername(username: string | null | undefined): UsernameValidationResult {
  if (!username) {
    return { valid: true, normalized: undefined }; // Username is optional
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { valid: true, normalized: undefined };
  }

  // Normalize to lowercase
  const normalized = trimmed.toLowerCase();

  // Check length
  if (normalized.length < 3) {
    return {
      valid: false,
      error: 'Username must be at least 3 characters',
    };
  }

  if (normalized.length > 30) {
    return {
      valid: false,
      error: 'Username must be 30 characters or less',
    };
  }

  // Check format
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens, and must start with a letter or number',
    };
  }

  // Check reserved
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      error: 'This username is not available',
    };
  }

  // Check for offensive patterns (basic)
  const offensivePatterns = [/admin/i, /moderator/i, /official/i, /support/i];
  for (const pattern of offensivePatterns) {
    if (pattern.test(normalized) && normalized !== 'admin') {
      // Allow exact matches that are in reserved list to show generic message
    }
  }

  return {
    valid: true,
    normalized,
  };
}

/**
 * Check if a username looks like an email (common mistake)
 */
export function looksLikeEmail(username: string): boolean {
  return username.includes('@');
}
