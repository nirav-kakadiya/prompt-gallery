/**
 * Repository Index
 *
 * Central export point for all repository classes.
 * Use repositories for data access to ensure consistent patterns across the app.
 *
 * Usage:
 * ```typescript
 * import { promptRepository } from '@/repositories';
 *
 * const prompts = await promptRepository.list({ page: 1, pageSize: 20 });
 * ```
 */

export { promptRepository, PromptRepository } from "./prompt-repository";
export type {
  ListPromptsInput,
  CreatePromptInput,
  UpdatePromptInput,
  ListPromptsResult,
  PromptWithRelations,
} from "./prompt-repository";
