// Prompt types
export type PromptType = 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video';

export type SourceType = 'reddit' | 'twitter' | 'selection' | 'other';

// Extracted prompt data
export interface ExtractedPrompt {
  text: string;
  title?: string;
  imageUrls: string[];
  sourceUrl: string;
  sourceType: SourceType;
  author?: string;
  tags?: string[];
  metadata?: PromptMetadata;
}

// Parsed prompt with cleaned data
export interface ParsedPrompt {
  cleanText: string;
  type: PromptType;
  tags: string[];
  parameters: PromptParameters;
  style?: string;
  category?: string;
}

// AI generation parameters
export interface PromptParameters {
  model?: string;
  aspectRatio?: string;
  version?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  negativePrompt?: string;
  sampler?: string;
  style?: string; // Midjourney --style parameter (raw, cute, etc.)
}

// Full prompt metadata
export interface PromptMetadata {
  model?: string;
  parameters?: PromptParameters;
  originalAuthor?: string;
  platform?: string;
  extractedAt?: string;
}

// Pending prompt in storage
export interface PendingPrompt {
  text: string;
  title?: string;
  imageUrls?: string[];
  sourceUrl: string;
  sourceTitle?: string;
  sourceType: SourceType;
  tags?: string[];
  metadata?: PromptMetadata;
  isLoading?: boolean; // True while extracting data in background
}

// User data
export interface User {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role?: string;
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Create prompt request
export interface CreatePromptRequest {
  title: string;
  promptText: string;
  type: PromptType;
  tags?: string[];
  category?: string;
  style?: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  imageUrl?: string; // Primary image (for backward compatibility)
  images?: Array<{ url: string; thumbnailUrl: string }>; // Multiple images support
  metadata?: PromptMetadata;
}

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  PENDING_PROMPT: 'pendingPrompt',
  SETTINGS: 'settings',
} as const;

// API base URL - change to production URL when deploying extension
// export const API_BASE_URL = 'http://localhost:3000';
export const API_BASE_URL = 'https://prompt-gallery-six.vercel.app';
