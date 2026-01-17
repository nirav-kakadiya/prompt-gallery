// Core types for Prompt Gallery

export type PromptType =
  | "text-to-image"
  | "text-to-video"
  | "image-to-image"
  | "image-to-video";

export type PromptStatus =
  | "draft"
  | "pending_review"
  | "pending_image"
  | "processing"
  | "published"
  | "rejected"
  | "archived";

export type UserRole = "user" | "creator" | "moderator" | "admin";

export type SortOption =
  | "newest"
  | "oldest"
  | "popular"
  | "most_copied"
  | "most_liked"
  | "alphabetical";

// Prompt interfaces
export interface PromptMetadata {
  model?: string;
  modelVersion?: string;
  negativePrompt?: string;
  parameters?: {
    steps?: number;
    cfgScale?: number;
    seed?: number;
    sampler?: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
  };
  sourceUrl?: string;
  submissionSource?: "web" | "extension" | "api";
}

export interface Prompt {
  id: string;
  title: string;
  slug: string;
  promptText: string;
  type: PromptType;
  status: PromptStatus;

  // Media
  imageUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  blurhash: string | null;

  // Categorization
  tags: string[];
  category: string | null;
  style: string | null;

  // Author
  authorId: string | null;
  author: UserPreview | null;

  // Metadata
  metadata: PromptMetadata;

  // Stats
  viewCount: number;
  copyCount: number;
  likeCount: number;

  // User interaction state
  isLiked?: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PromptCard {
  id: string;
  title: string;
  slug: string;
  promptText: string;
  type: PromptType;
  thumbnailUrl: string | null;
  blurhash: string | null;
  tags: string[];
  author: UserPreview | null;
  copyCount: number;
  likeCount: number;
  isLiked?: boolean;
  createdAt: string;
}

// User interfaces
export interface UserPreview {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  image: string | null;
  bio: string | null;
  role: UserRole;
  promptCount: number;
  totalCopies: number;
  totalLikes: number;
  createdAt: string;
}

// Collection interfaces
export interface Collection {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  ownerId: string;
  promptCount: number;
  createdAt: string;
  updatedAt: string;
}

// Filter interfaces
export interface FilterState {
  query: string;
  types: PromptType[];
  tags: string[];
  categories: string[];
  styles: string[];
  sortBy: SortOption;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

// API Response interfaces
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Prompt filter options for API
export interface PromptFilters {
  query?: string;
  types?: string[];
  tags?: string[];
  category?: string;
  style?: string;
  sortBy?: SortOption;
  page?: number;
  limit?: number;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// Tag and Category interfaces
export interface Tag {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  promptCount: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  promptCount: number;
}
