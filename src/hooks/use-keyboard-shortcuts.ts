/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard shortcuts for better UX.
 * Industry standard: Gmail, Notion, Linear all use similar patterns.
 */

import { useEffect, useCallback } from "react";

type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description?: string;
}

// Check if user is typing in an input field
function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  const tagName = target.tagName.toLowerCase();
  const isEditable = target.isContentEditable;
  const isInput = tagName === "input" || tagName === "textarea" || tagName === "select";

  return isInput || isEditable;
}

// Check if modifier matches (works cross-platform)
function matchesModifier(event: KeyboardEvent, config: ShortcutConfig): boolean {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  // For Cmd/Ctrl shortcuts, accept either based on platform
  const wantsCtrlOrCmd = config.ctrl || config.meta;
  const hasCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

  if (wantsCtrlOrCmd && !hasCtrlOrCmd) return false;
  if (!wantsCtrlOrCmd && (event.ctrlKey || event.metaKey)) return false;

  if (config.shift && !event.shiftKey) return false;
  if (!config.shift && event.shiftKey) return false;

  if (config.alt && !event.altKey) return false;
  if (!config.alt && event.altKey) return false;

  return true;
}

export function useKeyboardShortcut(
  key: string,
  handler: ShortcutHandler,
  options: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    allowInInput?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { ctrl, meta, shift, alt, allowInInput = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input (unless explicitly allowed)
      if (!allowInInput && isTyping(event)) return;

      // Check if key matches
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      // Check modifiers
      if (!matchesModifier(event, { key, ctrl, meta, shift, alt, handler })) return;

      // Prevent default and call handler
      event.preventDefault();
      handler(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrl, meta, shift, alt, handler, allowInInput, enabled]);
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input
      if (isTyping(event)) return;

      for (const config of shortcuts) {
        if (event.key.toLowerCase() !== config.key.toLowerCase()) continue;
        if (!matchesModifier(event, config)) continue;

        event.preventDefault();
        config.handler(event);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

// Shortcut display helper (shows platform-appropriate key)
export function getShortcutDisplay(config: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean; key: string }): string {
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const parts: string[] = [];

  if (config.ctrl || config.meta) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (config.alt) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (config.shift) {
    parts.push(isMac ? "⇧" : "Shift");
  }

  parts.push(config.key.toUpperCase());

  return parts.join(isMac ? "" : "+");
}
