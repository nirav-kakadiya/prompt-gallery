/**
 * Keyboard Navigation Hook
 *
 * Provides arrow key navigation between items in a grid/list.
 * Industry standard: Gmail, Trello, Notion all use similar patterns.
 */

import { useCallback, useEffect, useState } from "react";

interface UseKeyboardNavigationOptions {
  /** Total number of items */
  itemCount: number;
  /** Number of columns in grid (1 for list view) */
  columns?: number;
  /** Whether navigation is enabled */
  enabled?: boolean;
  /** Callback when item is selected (Enter key) */
  onSelect?: (index: number) => void;
  /** Callback when focus changes */
  onFocusChange?: (index: number) => void;
}

export function useKeyboardNavigation({
  itemCount,
  columns = 1,
  enabled = true,
  onSelect,
  onFocusChange,
}: UseKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const moveFocus = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (itemCount === 0) return;

      setFocusedIndex((current) => {
        let next = current;

        // If nothing focused, start at first item
        if (current === -1) {
          next = 0;
        } else {
          switch (direction) {
            case "up":
              next = current - columns;
              break;
            case "down":
              next = current + columns;
              break;
            case "left":
              next = current - 1;
              break;
            case "right":
              next = current + 1;
              break;
          }
        }

        // Clamp to valid range
        if (next < 0) next = 0;
        if (next >= itemCount) next = itemCount - 1;

        return next;
      });
    },
    [itemCount, columns]
  );

  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  const setFocus = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      setFocusedIndex(index);
    }
  }, [itemCount]);

  // Notify on focus change
  useEffect(() => {
    if (focusedIndex >= 0 && onFocusChange) {
      onFocusChange(focusedIndex);
    }
  }, [focusedIndex, onFocusChange]);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          moveFocus("up");
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFocus("down");
          break;
        case "ArrowLeft":
          event.preventDefault();
          moveFocus("left");
          break;
        case "ArrowRight":
          event.preventDefault();
          moveFocus("right");
          break;
        case "Enter":
          if (focusedIndex >= 0 && onSelect) {
            event.preventDefault();
            onSelect(focusedIndex);
          }
          break;
        case "Escape":
          resetFocus();
          break;
        case "Home":
          event.preventDefault();
          setFocus(0);
          break;
        case "End":
          event.preventDefault();
          setFocus(itemCount - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, moveFocus, resetFocus, setFocus, focusedIndex, itemCount, onSelect]);

  return {
    focusedIndex,
    setFocusedIndex: setFocus,
    resetFocus,
    isFocused: (index: number) => focusedIndex === index,
  };
}
