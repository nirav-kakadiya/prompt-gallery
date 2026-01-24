/**
 * Undo Hook
 *
 * Provides undo functionality with configurable timeout.
 * Industry standard: Gmail's "Undo Send", Slack's message delete undo.
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";

interface UndoOptions<T> {
  /** Action to perform after timeout if not undone */
  action: () => Promise<void>;
  /** Action to restore state if undone */
  undo: () => void;
  /** Timeout in ms before action is finalized (default: 5000) */
  timeout?: number;
  /** Toast message to show */
  message: string;
  /** Toast description */
  description?: string;
  /** Data to pass to callbacks */
  data?: T;
}

export function useUndoAction<T = unknown>() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const execute = useCallback(async (options: UndoOptions<T>) => {
    const { action, undo, timeout = 5000, message, description } = options;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show toast with undo button
    toastIdRef.current = toast(message, {
      description,
      duration: timeout,
      action: {
        label: "Undo",
        onClick: () => {
          // Clear the timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          // Restore state
          undo();
          toast.success("Action undone", { duration: 2000 });
        },
      },
    });

    // Set timeout to perform the actual action
    timeoutRef.current = setTimeout(async () => {
      try {
        await action();
      } catch (error) {
        // If action fails, restore state
        undo();
        toast.error("Action failed", {
          description: error instanceof Error ? error.message : "Please try again",
        });
      }
      timeoutRef.current = null;
    }, timeout);
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  return { execute, cancel };
}
