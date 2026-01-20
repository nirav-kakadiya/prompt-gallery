/**
 * Supabase Database Types
 * 
 * These types should be generated using:
 * npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/types.ts
 * 
 * For now, we define them manually based on our schema.
 * Replace this file with generated types once Supabase project is set up.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    username: string | null;
                    name: string | null;
                    bio: string | null;
                    avatar_url: string | null;
                    role: 'user' | 'creator' | 'moderator' | 'admin';
                    prompt_count: number;
                    total_copies: number;
                    total_likes: number;
                    legacy_user_id: string | null;
                    migrated_from_sqlite: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email?: string | null;
                    username?: string | null;
                    name?: string | null;
                    bio?: string | null;
                    avatar_url?: string | null;
                    role?: 'user' | 'creator' | 'moderator' | 'admin';
                    prompt_count?: number;
                    total_copies?: number;
                    total_likes?: number;
                    legacy_user_id?: string | null;
                    migrated_from_sqlite?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string | null;
                    username?: string | null;
                    name?: string | null;
                    bio?: string | null;
                    avatar_url?: string | null;
                    role?: 'user' | 'creator' | 'moderator' | 'admin';
                    prompt_count?: number;
                    total_copies?: number;
                    total_likes?: number;
                    legacy_user_id?: string | null;
                    migrated_from_sqlite?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            prompts: {
                Row: {
                    id: string;
                    title: string;
                    slug: string;
                    prompt_text: string;
                    type: 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video';
                    status: 'draft' | 'pending_review' | 'pending_image' | 'processing' | 'published' | 'rejected' | 'archived';
                    image_url: string | null;
                    thumbnail_url: string | null;
                    video_url: string | null;
                    blurhash: string | null;
                    category: string | null;
                    style: string | null;
                    source_url: string | null;
                    source_type: 'reddit' | 'twitter' | 'selection' | 'web' | 'api' | 'other' | null;
                    author_id: string | null;
                    legacy_prompt_id: string | null;
                    legacy_author_email: string | null;
                    metadata: Json;
                    view_count: number;
                    copy_count: number;
                    like_count: number;
                    created_at: string;
                    updated_at: string;
                    published_at: string | null;
                };
                Insert: {
                    id?: string;
                    title: string;
                    slug: string;
                    prompt_text: string;
                    type: 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video';
                    status?: 'draft' | 'pending_review' | 'pending_image' | 'processing' | 'published' | 'rejected' | 'archived';
                    image_url?: string | null;
                    thumbnail_url?: string | null;
                    video_url?: string | null;
                    blurhash?: string | null;
                    category?: string | null;
                    style?: string | null;
                    source_url?: string | null;
                    source_type?: 'reddit' | 'twitter' | 'selection' | 'web' | 'api' | 'other' | null;
                    author_id?: string | null;
                    legacy_prompt_id?: string | null;
                    legacy_author_email?: string | null;
                    metadata?: Json;
                    view_count?: number;
                    copy_count?: number;
                    like_count?: number;
                    created_at?: string;
                    updated_at?: string;
                    published_at?: string | null;
                };
                Update: {
                    id?: string;
                    title?: string;
                    slug?: string;
                    prompt_text?: string;
                    type?: 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video';
                    status?: 'draft' | 'pending_review' | 'pending_image' | 'processing' | 'published' | 'rejected' | 'archived';
                    image_url?: string | null;
                    thumbnail_url?: string | null;
                    video_url?: string | null;
                    blurhash?: string | null;
                    category?: string | null;
                    style?: string | null;
                    source_url?: string | null;
                    source_type?: 'reddit' | 'twitter' | 'selection' | 'web' | 'api' | 'other' | null;
                    author_id?: string | null;
                    legacy_prompt_id?: string | null;
                    legacy_author_email?: string | null;
                    metadata?: Json;
                    view_count?: number;
                    copy_count?: number;
                    like_count?: number;
                    created_at?: string;
                    updated_at?: string;
                    published_at?: string | null;
                };
            };
            tags: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    category: string | null;
                    prompt_count: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    category?: string | null;
                    prompt_count?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    category?: string | null;
                    prompt_count?: number;
                    created_at?: string;
                };
            };
            prompt_tags: {
                Row: {
                    prompt_id: string;
                    tag_id: string;
                    created_at: string;
                };
                Insert: {
                    prompt_id: string;
                    tag_id: string;
                    created_at?: string;
                };
                Update: {
                    prompt_id?: string;
                    tag_id?: string;
                    created_at?: string;
                };
            };
            likes: {
                Row: {
                    id: string;
                    user_id: string;
                    prompt_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    prompt_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    prompt_id?: string;
                    created_at?: string;
                };
            };
            collections: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    cover_image_url: string | null;
                    is_public: boolean;
                    owner_id: string | null;
                    legacy_collection_id: string | null;
                    legacy_owner_email: string | null;
                    prompt_count: number;
                    save_count: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    cover_image_url?: string | null;
                    is_public?: boolean;
                    owner_id?: string | null;
                    legacy_collection_id?: string | null;
                    legacy_owner_email?: string | null;
                    prompt_count?: number;
                    save_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    cover_image_url?: string | null;
                    is_public?: boolean;
                    owner_id?: string | null;
                    legacy_collection_id?: string | null;
                    legacy_owner_email?: string | null;
                    prompt_count?: number;
                    save_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            collection_prompts: {
                Row: {
                    collection_id: string;
                    prompt_id: string;
                    display_order: number;
                    added_at: string;
                };
                Insert: {
                    collection_id: string;
                    prompt_id: string;
                    display_order?: number;
                    added_at?: string;
                };
                Update: {
                    collection_id?: string;
                    prompt_id?: string;
                    display_order?: number;
                    added_at?: string;
                };
            };
            saved_collections: {
                Row: {
                    user_id: string;
                    collection_id: string;
                    saved_at: string;
                };
                Insert: {
                    user_id: string;
                    collection_id: string;
                    saved_at?: string;
                };
                Update: {
                    user_id?: string;
                    collection_id?: string;
                    saved_at?: string;
                };
            };
            view_buffer: {
                Row: {
                    id: string;
                    prompt_id: string;
                    count: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    prompt_id: string;
                    count?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    prompt_id?: string;
                    count?: number;
                    created_at?: string;
                };
            };
            copy_buffer: {
                Row: {
                    id: string;
                    prompt_id: string;
                    count: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    prompt_id: string;
                    count?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    prompt_id?: string;
                    count?: number;
                    created_at?: string;
                };
            };
            categories: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    icon: string | null;
                    parent_id: string | null;
                    prompt_count: number;
                    display_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    description?: string | null;
                    icon?: string | null;
                    parent_id?: string | null;
                    prompt_count?: number;
                    display_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    description?: string | null;
                    icon?: string | null;
                    parent_id?: string | null;
                    prompt_count?: number;
                    display_order?: number;
                    created_at?: string;
                };
            };
            api_keys: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    key_hash: string;
                    key_prefix: string;
                    scopes: Json;
                    last_used_at: string | null;
                    expires_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    key_hash: string;
                    key_prefix: string;
                    scopes?: Json;
                    last_used_at?: string | null;
                    expires_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    name?: string;
                    key_hash?: string;
                    key_prefix?: string;
                    scopes?: Json;
                    last_used_at?: string | null;
                    expires_at?: string | null;
                    created_at?: string;
                };
            };
            contact_messages: {
                Row: {
                    id: string;
                    name: string;
                    email: string;
                    subject: string;
                    message: string;
                    status: 'new' | 'read' | 'replied' | 'archived';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    email: string;
                    subject: string;
                    message: string;
                    status?: 'new' | 'read' | 'replied' | 'archived';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    email?: string;
                    subject?: string;
                    message?: string;
                    status?: 'new' | 'read' | 'replied' | 'archived';
                    created_at?: string;
                    updated_at?: string;
                };
            };
            reports: {
                Row: {
                    id: string;
                    prompt_id: string;
                    user_id: string | null;
                    reason: 'spam' | 'inappropriate' | 'copyright' | 'other';
                    details: string | null;
                    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    prompt_id: string;
                    user_id?: string | null;
                    reason: 'spam' | 'inappropriate' | 'copyright' | 'other';
                    details?: string | null;
                    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    prompt_id?: string;
                    user_id?: string | null;
                    reason?: 'spam' | 'inappropriate' | 'copyright' | 'other';
                    details?: string | null;
                    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Functions: {
            toggle_like: {
                Args: {
                    p_prompt_id: string;
                    p_user_id: string;
                };
                Returns: {
                    liked: boolean;
                    like_count: number;
                }[];
            };
            flush_view_counts: {
                Args: Record<string, never>;
                Returns: {
                    prompts_updated: number;
                    views_flushed: number;
                }[];
            };
            flush_copy_counts: {
                Args: Record<string, never>;
                Returns: {
                    prompts_updated: number;
                    copies_flushed: number;
                }[];
            };
            cleanup_view_buffer: {
                Args: Record<string, never>;
                Returns: number;
            };
            cleanup_copy_buffer: {
                Args: Record<string, never>;
                Returns: number;
            };
            buffer_view: {
                Args: {
                    p_prompt_id: string;
                };
                Returns: undefined;
            };
            buffer_copy: {
                Args: {
                    p_prompt_id: string;
                };
                Returns: undefined;
            };
            get_prompt_by_slug: {
                Args: {
                    p_slug: string;
                    p_user_id?: string;
                };
                Returns: {
                    id: string;
                    title: string;
                    slug: string;
                    prompt_text: string;
                    type: string;
                    status: string;
                    image_url: string | null;
                    thumbnail_url: string | null;
                    video_url: string | null;
                    blurhash: string | null;
                    category: string | null;
                    style: string | null;
                    metadata: Json;
                    view_count: number;
                    copy_count: number;
                    like_count: number;
                    created_at: string;
                    published_at: string | null;
                    author_id: string | null;
                    author_username: string | null;
                    author_name: string | null;
                    author_avatar: string | null;
                    tags: string[];
                    is_liked: boolean;
                }[];
            };
            search_prompts: {
                Args: {
                    p_query: string;
                    p_type?: string;
                    p_category?: string;
                    p_limit?: number;
                    p_offset?: number;
                };
                Returns: {
                    id: string;
                    title: string;
                    slug: string;
                    prompt_text: string;
                    type: string;
                    thumbnail_url: string | null;
                    blurhash: string | null;
                    like_count: number;
                    copy_count: number;
                    created_at: string;
                    author_id: string | null;
                    author_username: string | null;
                    author_avatar: string | null;
                    rank: number;
                }[];
            };
        };
        Enums: {
            prompt_type: 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video';
            prompt_status: 'draft' | 'pending_review' | 'pending_image' | 'processing' | 'published' | 'rejected' | 'archived';
            user_role: 'user' | 'creator' | 'moderator' | 'admin';
            source_type: 'reddit' | 'twitter' | 'selection' | 'web' | 'api' | 'other';
            report_reason: 'spam' | 'inappropriate' | 'copyright' | 'other';
            report_status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
            message_status: 'new' | 'read' | 'replied' | 'archived';
        };
    };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Commonly used types
export type Profile = Tables<'profiles'>;
export type Prompt = Tables<'prompts'>;
export type Tag = Tables<'tags'>;
export type Collection = Tables<'collections'>;
export type Like = Tables<'likes'>;
