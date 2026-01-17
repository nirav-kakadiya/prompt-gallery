"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import type { Prompt, PaginatedResponse, PromptFilters, PaginationMeta } from "@/types";

interface PromptsApiResponse {
  success: boolean;
  data: Prompt[];
  meta: PaginationMeta;
  error?: {
    code: string;
    message: string;
  };
}

async function fetchPrompts(filters: PromptFilters): Promise<PaginatedResponse<Prompt>> {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.types?.length) {
    filters.types.forEach(t => params.append("type", t));
  }
  if (filters.tags?.length) {
    filters.tags.forEach(t => params.append("tag", t));
  }
  if (filters.category) params.set("category", filters.category);
  if (filters.sortBy) params.set("sort", filters.sortBy);
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("pageSize", filters.limit.toString());

  const response = await fetch(`/api/prompts?${params.toString()}`);
  const result: PromptsApiResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || "Failed to fetch prompts");
  }

  // Transform API response to match PaginatedResponse type
  return {
    data: result.data,
    pagination: result.meta,
  };
}

interface SinglePromptResponse {
  success: boolean;
  data: Prompt;
  error?: { code: string; message: string };
}

interface CopyResponse {
  success: boolean;
  data: { copyCount: number };
  error?: { code: string; message: string };
}

interface LikeResponse {
  success: boolean;
  data: { liked: boolean; likeCount: number };
  error?: { code: string; message: string };
}

async function fetchPromptById(id: string): Promise<Prompt> {
  const response = await fetch(`/api/prompts/${id}`);
  const result: SinglePromptResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || "Failed to fetch prompt");
  }

  return result.data;
}

async function trackCopy(id: string): Promise<{ copyCount: number }> {
  const response = await fetch(`/api/prompts/${id}/copy`, {
    method: "POST",
  });
  const result: CopyResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || "Failed to track copy");
  }

  return result.data;
}

async function toggleLike(id: string): Promise<{ liked: boolean; likeCount: number }> {
  const response = await fetch(`/api/prompts/${id}/like`, {
    method: "POST",
  });
  const result: LikeResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || "Failed to toggle like");
  }

  return result.data;
}

interface DeleteResponse {
  success: boolean;
  data: { id: string };
  error?: { code: string; message: string };
}

async function deletePrompt(id: string): Promise<{ id: string }> {
  const response = await fetch(`/api/prompts/${id}`, {
    method: "DELETE",
  });
  const result: DeleteResponse = await response.json();

  if (!result.success) {
    const errorMessage = result.error?.message || "Failed to delete prompt";
    const errorCode = result.error?.code || "UNKNOWN_ERROR";
    throw new Error(`${errorCode}: ${errorMessage}`);
  }

  return result.data;
}

export function usePrompts() {
  const { query, types, tags, sortBy } = useFilterStore(
    useShallow((state) => ({
      query: state.query,
      types: state.types,
      tags: state.tags,
      sortBy: state.sortBy,
    }))
  );

  // Create stable query key - sort arrays to ensure consistent ordering
  const typesKey = [...types].sort().join(",");
  const tagsKey = [...tags].sort().join(",");

  return useQuery({
    queryKey: ["prompts", query, typesKey, tagsKey, sortBy],
    queryFn: () =>
      fetchPrompts({
        query: query || undefined,
        types: types.length > 0 ? types : undefined,
        tags: tags.length > 0 ? tags : undefined,
        sortBy: sortBy as PromptFilters["sortBy"],
      }),
    staleTime: 60 * 1000,
  });
}

// Infinite query hook for paginated loading (used in gallery)
export function useInfinitePrompts() {
  const { query, types, tags, sortBy } = useFilterStore(
    useShallow((state) => ({
      query: state.query,
      types: state.types,
      tags: state.tags,
      sortBy: state.sortBy,
    }))
  );

  // Create stable query key
  const typesKey = [...types].sort().join(",");
  const tagsKey = [...tags].sort().join(",");

  return useInfiniteQuery({
    queryKey: ["prompts-infinite", query, typesKey, tagsKey, sortBy],
    queryFn: ({ pageParam = 1 }) =>
      fetchPrompts({
        query: query || undefined,
        types: types.length > 0 ? types : undefined,
        tags: tags.length > 0 ? tags : undefined,
        sortBy: sortBy as PromptFilters["sortBy"],
        page: pageParam,
        limit: 12,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 60 * 1000,
  });
}

export function usePrompt(id: string) {
  return useQuery({
    queryKey: ["prompt", id],
    queryFn: () => fetchPromptById(id),
    enabled: !!id,
  });
}

export function useCopyPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trackCopy,
    onSuccess: (data, id) => {
      queryClient.setQueryData<Prompt>(["prompt", id], (old) =>
        old ? { ...old, copyCount: data.copyCount } : old
      );
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}

export function useLikePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLike,
    onSuccess: (data, id) => {
      queryClient.setQueryData<Prompt>(["prompt", id], (old) =>
        old ? { ...old, likeCount: data.likeCount } : old
      );
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePrompt,
    onSuccess: (data) => {
      // Remove the deleted prompt from cache
      queryClient.removeQueries({ queryKey: ["prompt", data.id] });
      // Invalidate all prompt queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["prompts-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["user-prompts"] });
    },
  });
}
