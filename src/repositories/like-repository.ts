/**
 * Like Repository
 * 
 * Handles like/unlike operations with optimized database functions.
 * Reduces multiple round trips to a single RPC call in Supabase.
 */

import { cache, cacheKeys } from '@/lib/cache/kv-cache';
import { dbFeatureFlags, getPrimaryBackend } from '@/lib/db/feature-flag';
import { prisma } from '@/lib/prisma';
import { createClient as createServerClient } from '@/lib/supabase/server';

interface ToggleLikeResult {
    liked: boolean;
    likeCount: number;
}

export class LikeRepository {
    /**
     * Toggle like on a prompt - uses single RPC call in Supabase
     * Replaces 4-query pattern with 1 query
     */
    async toggleLike(promptId: string, userId: string): Promise<ToggleLikeResult> {
        const primary = getPrimaryBackend();
        
        let result: ToggleLikeResult;
        
        if (primary === 'supabase') {
            result = await this.toggleLikeSupabase(promptId, userId);
        } else {
            result = await this.toggleLikeSqlite(promptId, userId);
        }
        
        // Invalidate user's likes cache
        await cache.del(cacheKeys.userLikes(userId));
        
        return result;
    }
    
    /**
     * Toggle like in SQLite (multiple queries - legacy)
     */
    private async toggleLikeSqlite(promptId: string, userId: string): Promise<ToggleLikeResult> {
        // Check if prompt exists
        const prompt = await prisma.prompt.findUnique({
            where: { id: promptId },
            select: { id: true, authorId: true, likeCount: true }
        });
        
        if (!prompt) {
            throw new Error('Prompt not found');
        }
        
        // Check existing like
        const existingLike = await prisma.like.findUnique({
            where: {
                uniqueLike: {
                    userId,
                    promptId
                }
            }
        });
        
        if (existingLike) {
            // Unlike
            await prisma.like.delete({
                where: { id: existingLike.id }
            });
            
            const updated = await prisma.prompt.update({
                where: { id: promptId },
                data: { likeCount: { decrement: 1 } }
            });
            
            // Update author stats
            if (prompt.authorId) {
                await prisma.user.update({
                    where: { id: prompt.authorId },
                    data: { totalLikes: { decrement: 1 } }
                });
            }
            
            return { liked: false, likeCount: updated.likeCount };
        } else {
            // Like
            await prisma.like.create({
                data: { userId, promptId }
            });
            
            const updated = await prisma.prompt.update({
                where: { id: promptId },
                data: { likeCount: { increment: 1 } }
            });
            
            // Update author stats
            if (prompt.authorId) {
                await prisma.user.update({
                    where: { id: prompt.authorId },
                    data: { totalLikes: { increment: 1 } }
                });
            }
            
            return { liked: true, likeCount: updated.likeCount };
        }
    }
    
    /**
     * Toggle like in Supabase (single RPC call - optimized)
     */
    private async toggleLikeSupabase(promptId: string, userId: string): Promise<ToggleLikeResult> {
        const supabase = await createServerClient();
        
        // Type assertion needed due to Supabase client type inference issues
        const { data, error } = await supabase.rpc('toggle_like', {
            p_prompt_id: promptId,
            p_user_id: userId
        } as never) as { 
            data: Array<{ liked: boolean; like_count: number }> | null; 
            error: Error | null;
        };
        
        if (error) {
            console.error('[LikeRepository] Toggle like failed:', error);
            throw new Error(`Failed to toggle like: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
            throw new Error('Prompt not found');
        }
        
        return {
            liked: data[0].liked,
            likeCount: data[0].like_count
        };
    }
    
    /**
     * Check if a user has liked a prompt
     */
    async hasLiked(promptId: string, userId: string): Promise<boolean> {
        const primary = getPrimaryBackend();
        
        if (primary === 'supabase') {
            const supabase = await createServerClient();
            const { data } = await supabase
                .from('likes')
                .select('id')
                .eq('prompt_id', promptId)
                .eq('user_id', userId)
                .single();
            
            return !!data;
        }
        
        const like = await prisma.like.findUnique({
            where: {
                uniqueLike: { userId, promptId }
            }
        });
        
        return !!like;
    }
    
    /**
     * Get all prompt IDs liked by a user
     */
    async getUserLikedPromptIds(userId: string): Promise<string[]> {
        const cacheKey = cacheKeys.userLikes(userId);
        
        return cache.getOrFetch(
            cacheKey,
            async () => {
                const primary = getPrimaryBackend();
                
                if (primary === 'supabase') {
                    const supabase = await createServerClient();
                    const { data } = await supabase
                        .from('likes')
                        .select('prompt_id')
                        .eq('user_id', userId);
                    
                    // Type assertion for Supabase type inference
                    const likesData = data as Array<{ prompt_id: string }> | null;
                    return (likesData || []).map(l => l.prompt_id);
                }
                
                const likes = await prisma.like.findMany({
                    where: { userId },
                    select: { promptId: true }
                });
                
                return likes.map(l => l.promptId);
            },
            { ttl: 120 }
        );
    }
    
    /**
     * Get like count for a prompt
     */
    async getLikeCount(promptId: string): Promise<number> {
        const primary = getPrimaryBackend();
        
        if (primary === 'supabase') {
            const supabase = await createServerClient();
            const { data } = await supabase
                .from('prompts')
                .select('like_count')
                .eq('id', promptId)
                .single();
            
            // Type assertion for Supabase type inference
            const promptData = data as { like_count: number } | null;
            return promptData?.like_count || 0;
        }
        
        const prompt = await prisma.prompt.findUnique({
            where: { id: promptId },
            select: { likeCount: true }
        });
        
        return prompt?.likeCount || 0;
    }
}

export const likeRepository = new LikeRepository();
export default likeRepository;
