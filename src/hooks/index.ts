export { usePrompts, usePrompt, useCopyPrompt, useLikePrompt } from "./use-prompts";
export {
  useCollections,
  useCollection,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useAddToCollection,
  useRemoveFromCollection,
  usePublicCollections,
  useSavedCollections,
  useSaveCollection,
  useUnsaveCollection,
} from "./use-collections";

// Realtime hooks (only active when Supabase is primary backend)
export {
  useRealtimeLikes,
  useRealtimeNewPrompts,
  useRealtimeCollection,
  getActiveChannelCount,
} from "./use-realtime";
