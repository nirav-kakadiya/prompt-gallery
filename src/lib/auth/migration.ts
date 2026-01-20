/**
 * Auth Migration Utilities
 * 
 * Handles the migration of users from SQLite/bcrypt to Supabase Auth.
 * Since Supabase cannot import bcrypt passwords, users must reset their passwords.
 */

import { prisma } from '@/lib/prisma';
import { createAdminClient, adminAuth } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';

interface LegacyUser {
    id: string;
    email: string;
    name: string | null;
    username: string | null;
    image: string | null;
    password: string | null;
    role: string;
    promptCount: number;
    totalCopies: number;
    totalLikes: number;
}

interface MigrationResult {
    success: boolean;
    message: string;
    requiresMigration?: boolean;
    resetEmailSent?: boolean;
}

/**
 * Check if a user needs to be migrated from SQLite to Supabase
 */
export async function checkLegacyUser(email: string): Promise<LegacyUser | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                username: true,
                image: true,
                password: true,
                role: true,
                promptCount: true,
                totalCopies: true,
                totalLikes: true
            }
        });
        
        // Only return if the user has a password (not OAuth-only)
        if (user && user.password) {
            return user as LegacyUser;
        }
        
        return null;
    } catch (error) {
        console.error('[AuthMigration] Failed to check legacy user:', error);
        return null;
    }
}

/**
 * Verify a legacy user's password
 */
export async function verifyLegacyPassword(
    email: string, 
    password: string
): Promise<boolean> {
    const user = await checkLegacyUser(email);
    
    if (!user || !user.password) {
        return false;
    }
    
    try {
        return await bcrypt.compare(password, user.password);
    } catch (error) {
        console.error('[AuthMigration] Password verification failed:', error);
        return false;
    }
}

/**
 * Initiate the migration process for a legacy user
 * This triggers a password reset email via Supabase
 */
export async function initiateMigration(email: string): Promise<MigrationResult> {
    const legacyUser = await checkLegacyUser(email);
    
    if (!legacyUser) {
        return {
            success: false,
            message: 'User not found or already migrated'
        };
    }
    
    try {
        // Generate a password reset link via Supabase
        const { data, error } = await adminAuth.generateResetLink(email);
        
        if (error) {
            console.error('[AuthMigration] Failed to generate reset link:', error);
            return {
                success: false,
                message: 'Failed to send reset email. Please try again later.'
            };
        }
        
        // The reset email is automatically sent by Supabase
        // Update the legacy user to mark migration as initiated
        await prisma.user.update({
            where: { email },
            data: {
                // Add a custom field to track migration status if needed
                // migratedToSupabase: false // This would need to be added to schema
            }
        });
        
        return {
            success: true,
            message: 'Password reset email sent. Please check your inbox.',
            requiresMigration: true,
            resetEmailSent: true
        };
    } catch (error) {
        console.error('[AuthMigration] Migration initiation failed:', error);
        return {
            success: false,
            message: 'Failed to initiate migration. Please try again.'
        };
    }
}

/**
 * Link legacy user data to a new Supabase user after password reset
 */
export async function linkLegacyData(
    supabaseUserId: string, 
    email: string
): Promise<{ success: boolean; linkedItems: number }> {
    const legacyUser = await checkLegacyUser(email);
    
    if (!legacyUser) {
        return { success: true, linkedItems: 0 };
    }
    
    const supabase = createAdminClient();
    let linkedItems = 0;
    
    try {
        // Update prompts to new user ID
        const { data: promptsData } = await supabase
            .from('prompts')
            .select('id')
            .eq('legacy_author_email', email);
        
        if (promptsData && promptsData.length > 0) {
            await supabase
                .from('prompts')
                .update({ author_id: supabaseUserId } as never)
                .eq('legacy_author_email', email);
            linkedItems += promptsData.length;
        }
        
        // Update collections to new user ID
        const { data: collectionsData } = await supabase
            .from('collections')
            .select('id')
            .eq('legacy_owner_email', email);
        
        if (collectionsData && collectionsData.length > 0) {
            await supabase
                .from('collections')
                .update({ owner_id: supabaseUserId } as never)
                .eq('legacy_owner_email', email);
            linkedItems += collectionsData.length;
        }
        
        // Update the Supabase profile with legacy data
        await supabase
            .from('profiles')
            .update({
                username: legacyUser.username,
                name: legacyUser.name,
                avatar_url: legacyUser.image,
                role: legacyUser.role,
                prompt_count: legacyUser.promptCount,
                total_copies: legacyUser.totalCopies,
                total_likes: legacyUser.totalLikes,
                legacy_user_id: legacyUser.id,
                migrated_from_sqlite: true
            } as never)
            .eq('id', supabaseUserId);
        
        // Mark legacy user as migrated
        await prisma.user.update({
            where: { email },
            data: {
                // Clear password to prevent login via legacy system
                password: null
            }
        });
        
        console.log(`[AuthMigration] Linked ${linkedItems} items for user ${email}`);
        
        return { success: true, linkedItems };
    } catch (error) {
        console.error('[AuthMigration] Failed to link legacy data:', error);
        return { success: false, linkedItems };
    }
}

/**
 * Check if a user has already been migrated
 */
export async function isUserMigrated(email: string): Promise<boolean> {
    const supabase = createAdminClient();
    
    try {
        const { data } = await supabase
            .from('profiles')
            .select('migrated_from_sqlite')
            .eq('email', email)
            .single();
        
        // Type assertion to handle Supabase type inference issue
        const profile = data as { migrated_from_sqlite: boolean } | null;
        return profile?.migrated_from_sqlite === true;
    } catch {
        return false;
    }
}

/**
 * Get migration statistics
 */
export async function getMigrationStats(): Promise<{
    totalLegacyUsers: number;
    migratedUsers: number;
    pendingMigration: number;
}> {
    try {
        const totalLegacyUsers = await prisma.user.count({
            where: { password: { not: null } }
        });
        
        const supabase = createAdminClient();
        const { count: migratedUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('migrated_from_sqlite', true);
        
        return {
            totalLegacyUsers,
            migratedUsers: migratedUsers || 0,
            pendingMigration: totalLegacyUsers - (migratedUsers || 0)
        };
    } catch (error) {
        console.error('[AuthMigration] Failed to get stats:', error);
        return {
            totalLegacyUsers: 0,
            migratedUsers: 0,
            pendingMigration: 0
        };
    }
}

export default {
    checkLegacyUser,
    verifyLegacyPassword,
    initiateMigration,
    linkLegacyData,
    isUserMigrated,
    getMigrationStats
};
