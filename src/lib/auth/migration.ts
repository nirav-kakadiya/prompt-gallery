/**
 * Auth Migration Utilities
 *
 * Helpers for migrating user authentication from legacy systems to Supabase.
 * Used during the transition period when moving from SQLite/JWT to Supabase Auth.
 */

import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/supabase/admin";

export interface MigrationResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface UserMigrationData {
  email: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  legacyUserId?: string;
}

/**
 * Check if a user has already been migrated to Supabase
 */
export async function isUserMigrated(email: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { email },
    select: { migratedFromSqlite: true },
  });

  return profile?.migratedFromSqlite ?? false;
}

/**
 * Migrate a user from legacy auth to Supabase
 * Creates the Supabase auth user and links to existing profile
 */
export async function migrateUser(data: UserMigrationData): Promise<MigrationResult> {
  const { email, name, username, avatarUrl, legacyUserId } = data;

  try {
    // Check if already migrated
    if (await isUserMigrated(email)) {
      return { success: true, error: "User already migrated" };
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await adminAuth.createUser(
      email,
      undefined, // No password - user will need to reset
      {
        name,
        username,
        legacy_user_id: legacyUserId,
      }
    );

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create auth user" };
    }

    // Update or create profile linked to Supabase user
    await prisma.profile.upsert({
      where: { email },
      create: {
        id: authData.user.id,
        email,
        name,
        username,
        avatarUrl,
        legacyUserId,
        migratedFromSqlite: true,
      },
      update: {
        id: authData.user.id,
        migratedFromSqlite: true,
        legacyUserId,
      },
    });

    return { success: true, userId: authData.user.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Link an existing Supabase user to their legacy data
 * Used when a user signs up with Supabase but has legacy data
 */
export async function linkLegacyData(
  supabaseUserId: string,
  legacyEmail: string
): Promise<MigrationResult> {
  try {
    // Find legacy profile by email
    const legacyProfile = await prisma.profile.findFirst({
      where: {
        email: legacyEmail,
        migratedFromSqlite: false,
      },
    });

    if (!legacyProfile) {
      return { success: false, error: "No legacy profile found" };
    }

    // Update prompts to point to new user ID
    await prisma.prompt.updateMany({
      where: { authorId: legacyProfile.id },
      data: { authorId: supabaseUserId },
    });

    // Update collections
    await prisma.collection.updateMany({
      where: { ownerId: legacyProfile.id },
      data: { ownerId: supabaseUserId },
    });

    // Update likes
    await prisma.like.updateMany({
      where: { userId: legacyProfile.id },
      data: { userId: supabaseUserId },
    });

    // Mark legacy profile as migrated
    await prisma.profile.update({
      where: { id: legacyProfile.id },
      data: {
        migratedFromSqlite: true,
        legacyUserId: legacyProfile.id,
      },
    });

    return { success: true, userId: supabaseUserId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Generate a password reset link for a migrated user
 * Used to allow users to set their password after migration
 */
export async function sendMigrationResetEmail(email: string): Promise<MigrationResult> {
  try {
    const { error } = await adminAuth.generateResetLink(email);

    if (error) {
      return { success: false, error: error.message };
    }

    // In production, you would send this link via email
    console.log(`[Migration] Password reset link generated for ${email}`);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Batch migrate multiple users
 * Useful for running migrations via cron or admin script
 */
export async function batchMigrateUsers(
  users: UserMigrationData[],
  options: { onProgress?: (current: number, total: number) => void } = {}
): Promise<{ successful: number; failed: number; errors: string[] }> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const result = await migrateUser(user);

    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push(`${user.email}: ${result.error}`);
    }

    options.onProgress?.(i + 1, users.length);

    // Rate limiting - don't overwhelm Supabase
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Get migration statistics
 */
export async function getMigrationStats(): Promise<{
  totalProfiles: number;
  migratedProfiles: number;
  pendingMigration: number;
}> {
  const [totalProfiles, migratedProfiles] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { migratedFromSqlite: true } }),
  ]);

  return {
    totalProfiles,
    migratedProfiles,
    pendingMigration: totalProfiles - migratedProfiles,
  };
}
