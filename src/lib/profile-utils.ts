/**
 * Profile utilities for auto-generating avatars and usernames
 */

import { prisma } from './prisma';
import { validateUsername, RESERVED_USERNAMES } from './username-utils';

// DiceBear avatar styles - using modern, friendly styles
const AVATAR_STYLES = [
  'avataaars',      // Cartoon avatars
  'bottts',         // Robot avatars
  'fun-emoji',      // Fun emoji faces
  'lorelei',        // Illustrated portraits
  'notionists',     // Notion-style avatars
  'open-peeps',     // Hand-drawn illustrations
  'personas',       // Diverse personas
  'pixel-art',      // Retro pixel art
  'thumbs',         // Thumbs up characters
] as const;

// Default style for new users
const DEFAULT_AVATAR_STYLE = 'avataaars';

/**
 * Generate a DiceBear avatar URL
 * @param seed - Unique seed (user ID, email, or any string)
 * @param style - Avatar style (defaults to avataaars)
 * @param size - Image size in pixels (default 200)
 */
export function generateAvatarUrl(
  seed: string,
  style: string = DEFAULT_AVATAR_STYLE,
  size: number = 200
): string {
  // Encode seed to be URL-safe
  const encodedSeed = encodeURIComponent(seed);

  // DiceBear API v7
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedSeed}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Generate avatar URL with random style
 */
export function generateRandomAvatarUrl(seed: string, size: number = 200): string {
  const randomStyle = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  return generateAvatarUrl(seed, randomStyle, size);
}

/**
 * Get available avatar styles for user selection
 */
export function getAvatarStyles(): typeof AVATAR_STYLES {
  return AVATAR_STYLES;
}

/**
 * Adjectives for username generation
 */
const ADJECTIVES = [
  'happy', 'clever', 'bright', 'swift', 'calm', 'bold', 'wise', 'kind',
  'brave', 'cool', 'epic', 'great', 'keen', 'neat', 'quick', 'smart',
  'super', 'vivid', 'witty', 'zesty', 'agile', 'crisp', 'fresh', 'noble',
  'prime', 'rapid', 'sharp', 'sleek', 'snappy', 'stellar', 'vibrant', 'dynamic'
];

/**
 * Nouns for username generation
 */
const NOUNS = [
  'artist', 'coder', 'creator', 'designer', 'dreamer', 'explorer', 'finder',
  'genius', 'hero', 'hunter', 'knight', 'maker', 'master', 'ninja', 'pilot',
  'player', 'ranger', 'rider', 'sage', 'scout', 'seeker', 'spark', 'spirit',
  'star', 'tiger', 'titan', 'voyager', 'warrior', 'wizard', 'phoenix', 'falcon'
];

/**
 * Generate a random username
 * Format: adjective_noun_number (e.g., clever_artist_42)
 */
function generateRandomUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}_${noun}_${number}`;
}

/**
 * Generate username from email
 * Takes the part before @ and sanitizes it
 */
function generateUsernameFromEmail(email: string): string {
  const localPart = email.split('@')[0];

  // Remove invalid characters, keep only alphanumeric, underscore, hyphen
  let username = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')  // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

  // Ensure minimum length
  if (username.length < 3) {
    username = username + '_user';
  }

  // Truncate if too long (leave room for suffix)
  if (username.length > 20) {
    username = username.substring(0, 20);
  }

  return username;
}

/**
 * Generate username from name
 */
function generateUsernameFromName(name: string): string {
  // Remove invalid characters, keep only alphanumeric, underscore, hyphen
  let username = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (username.length < 3) {
    username = username + '_user';
  }

  if (username.length > 20) {
    username = username.substring(0, 20);
  }

  return username;
}

/**
 * Check if a username is available (not taken and not reserved)
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  // Check validation first
  const validation = validateUsername(username);
  if (!validation.valid) {
    return false;
  }

  const normalized = validation.normalized!;

  // Check if reserved
  if (RESERVED_USERNAMES.has(normalized)) {
    return false;
  }

  // Check database (case-insensitive)
  const existing = await prisma.profile.findFirst({
    where: {
      username: { equals: normalized, mode: 'insensitive' }
    },
    select: { id: true }
  });

  return !existing;
}

/**
 * Generate a unique username that's guaranteed to be available
 * Tries different strategies in order:
 * 1. From name (if provided)
 * 2. From email
 * 3. Random generation
 *
 * Adds numeric suffix if needed to ensure uniqueness
 */
export async function generateUniqueUsername(options: {
  email?: string;
  name?: string;
  userId?: string;
}): Promise<string> {
  const { email, name, userId } = options;

  // Generate base username candidates
  const candidates: string[] = [];

  // Priority 1: From name
  if (name && name.trim().length >= 2) {
    candidates.push(generateUsernameFromName(name));
  }

  // Priority 2: From email
  if (email) {
    candidates.push(generateUsernameFromEmail(email));
  }

  // Priority 3: Random
  candidates.push(generateRandomUsername());

  // Try each candidate
  for (const baseUsername of candidates) {
    // Validate the base username format
    const validation = validateUsername(baseUsername);
    if (!validation.valid) continue;

    const normalized = validation.normalized!;

    // Skip if reserved
    if (RESERVED_USERNAMES.has(normalized)) continue;

    // Check if available as-is
    const isAvailable = await isUsernameAvailable(normalized);
    if (isAvailable) {
      return normalized;
    }

    // Try with numeric suffixes
    for (let i = 1; i <= 100; i++) {
      const suffix = i < 10 ? `0${i}` : `${i}`;
      const withSuffix = `${normalized.substring(0, 25)}_${suffix}`;

      const suffixValidation = validateUsername(withSuffix);
      if (!suffixValidation.valid) continue;

      const suffixAvailable = await isUsernameAvailable(withSuffix);
      if (suffixAvailable) {
        return withSuffix;
      }
    }
  }

  // Fallback: Use userId or timestamp-based random
  const fallbackSeed = userId || Date.now().toString(36);
  const fallbackUsername = `user_${fallbackSeed.substring(0, 8)}`;

  // Check availability
  const fallbackAvailable = await isUsernameAvailable(fallbackUsername);
  if (fallbackAvailable) {
    return fallbackUsername;
  }

  // Ultimate fallback with timestamp
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Create or update profile with auto-generated defaults
 */
export async function ensureProfileWithDefaults(options: {
  userId: string;
  email?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}): Promise<{
  id: string;
  username: string | null;
  avatarUrl: string | null;
  name: string | null;
  isNew: boolean;
}> {
  const { userId, email, name, username, avatarUrl } = options;

  // Check if profile already exists
  const existingProfile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatarUrl: true, name: true }
  });

  if (existingProfile) {
    // Profile exists - check if we need to fill in missing fields
    const updates: Record<string, string> = {};

    if (!existingProfile.username) {
      updates.username = username || await generateUniqueUsername({ email, name, userId });
    }

    if (!existingProfile.avatarUrl) {
      updates.avatarUrl = avatarUrl || generateAvatarUrl(userId);
    }

    if (Object.keys(updates).length > 0) {
      const updated = await prisma.profile.update({
        where: { id: userId },
        data: updates,
        select: { id: true, username: true, avatarUrl: true, name: true }
      });
      return { ...updated, isNew: false };
    }

    return { ...existingProfile, isNew: false };
  }

  // Create new profile with auto-generated defaults
  const autoUsername = username || await generateUniqueUsername({ email, name, userId });
  const autoAvatar = avatarUrl || generateAvatarUrl(userId);

  const newProfile = await prisma.profile.create({
    data: {
      id: userId,
      email: email || null,
      name: name || null,
      username: autoUsername,
      avatarUrl: autoAvatar,
    },
    select: { id: true, username: true, avatarUrl: true, name: true }
  });

  return { ...newProfile, isNew: true };
}
