'use client';

/**
 * Realtime Hooks
 * 
 * Supabase Realtime subscriptions for live updates.
 * Features:
 * - Visibility-based connection management (disconnect on inactive tabs)
 * - Connection limiting to prevent cost explosion
 * - Global connection tracking for monitoring
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { dbFeatureFlags } from '@/lib/db/feature-flag';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Global connection tracking for monitoring
let activeChannelCount = 0;

/**
 * Get the current number of active realtime channels
 */
export function getActiveChannelCount(): number {
    return activeChannelCount;
}

/**
 * Hook for real-time like count updates
 * 
 * Subscribes to like_count changes on specific prompts and updates
 * the React Query cache automatically.
 * 
 * @param promptIds - Array of prompt IDs to subscribe to
 */
export function useRealtimeLikes(promptIds: string[]) {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    
    const subscribe = useCallback(() => {
        // Skip if realtime is not enabled
        if (!dbFeatureFlags.realtimeEnabled) {
            return null;
        }
        
        // Limit concurrent subscriptions to prevent cost explosion
        if (promptIds.length > 50) {
            console.warn('[Realtime] Too many subscriptions requested, using polling fallback');
            return null;
        }
        
        if (promptIds.length === 0) {
            return null;
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) return null;
        
        // Create a unique channel name
        const channelName = `likes-${promptIds.slice(0, 5).join('-').substring(0, 50)}`;
        
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'prompts',
                    filter: `id=in.(${promptIds.join(',')})`
                },
                (payload) => {
                    const newData = payload.new as { id: string; like_count: number };
                    
                    // Update React Query cache for infinite queries
                    queryClient.setQueryData(['prompts-infinite'], (old: any) => {
                        if (!old?.pages) return old;
                        return {
                            ...old,
                            pages: old.pages.map((page: any) => ({
                                ...page,
                                data: page.data?.map((p: any) =>
                                    p.id === newData.id
                                        ? { ...p, likeCount: newData.like_count }
                                        : p
                                )
                            }))
                        };
                    });
                    
                    // Update single prompt query
                    queryClient.setQueryData(['prompt', newData.id], (old: any) =>
                        old ? { ...old, likeCount: newData.like_count } : old
                    );
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    activeChannelCount++;
                    setIsConnected(true);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setIsConnected(false);
                }
            });
        
        return channel;
    }, [promptIds.join(','), queryClient]);
    
    const unsubscribe = useCallback(() => {
        if (channelRef.current) {
            const supabase = getSupabaseClient();
            if (supabase) {
                supabase.removeChannel(channelRef.current);
            }
            activeChannelCount = Math.max(0, activeChannelCount - 1);
            channelRef.current = null;
            setIsConnected(false);
        }
    }, []);
    
    useEffect(() => {
        // Initial subscription
        channelRef.current = subscribe();
        
        // Visibility-based connection management
        // Disconnect when tab is inactive to save connections/cost
        const handleVisibility = () => {
            if (document.hidden) {
                unsubscribe();
            } else {
                // Reconnect when tab becomes visible again
                if (!channelRef.current) {
                    channelRef.current = subscribe();
                }
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibility);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            unsubscribe();
        };
    }, [subscribe, unsubscribe]);
    
    return { isConnected };
}

/**
 * Hook for real-time new prompt notifications
 * 
 * Subscribes to INSERT events on the prompts table and invalidates
 * the prompts query to trigger a refetch.
 */
export function useRealtimeNewPrompts() {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    
    useEffect(() => {
        // Skip if realtime is not enabled
        if (!dbFeatureFlags.realtimeEnabled) {
            return;
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        const subscribe = () => {
            return supabase
                .channel('new-prompts-global')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'prompts',
                        filter: 'status=eq.published'
                    },
                    () => {
                        // Invalidate prompts queries to trigger refetch
                        queryClient.invalidateQueries({ queryKey: ['prompts'] });
                        queryClient.invalidateQueries({ queryKey: ['prompts-infinite'] });
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        activeChannelCount++;
                        setIsConnected(true);
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        setIsConnected(false);
                    }
                });
        };
        
        channelRef.current = subscribe();
        
        // Visibility-based connection management
        const handleVisibility = () => {
            if (document.hidden) {
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                    activeChannelCount = Math.max(0, activeChannelCount - 1);
                    channelRef.current = null;
                    setIsConnected(false);
                }
            } else if (!channelRef.current) {
                channelRef.current = subscribe();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibility);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                activeChannelCount = Math.max(0, activeChannelCount - 1);
            }
        };
    }, [queryClient]);
    
    return { isConnected };
}

/**
 * Hook for real-time collection updates
 * 
 * Subscribes to changes on a specific collection.
 */
export function useRealtimeCollection(collectionId: string | null) {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    
    useEffect(() => {
        if (!dbFeatureFlags.realtimeEnabled || !collectionId) {
            return;
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        const subscribe = () => {
            return supabase
                .channel(`collection-${collectionId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'collection_prompts',
                        filter: `collection_id=eq.${collectionId}`
                    },
                    () => {
                        // Invalidate collection query
                        queryClient.invalidateQueries({ 
                            queryKey: ['collection', collectionId] 
                        });
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        activeChannelCount++;
                        setIsConnected(true);
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        setIsConnected(false);
                    }
                });
        };
        
        channelRef.current = subscribe();
        
        const handleVisibility = () => {
            if (document.hidden) {
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                    activeChannelCount = Math.max(0, activeChannelCount - 1);
                    channelRef.current = null;
                    setIsConnected(false);
                }
            } else if (!channelRef.current) {
                channelRef.current = subscribe();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibility);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                activeChannelCount = Math.max(0, activeChannelCount - 1);
            }
        };
    }, [collectionId, queryClient]);
    
    return { isConnected };
}

export default {
    useRealtimeLikes,
    useRealtimeNewPrompts,
    useRealtimeCollection,
    getActiveChannelCount
};
