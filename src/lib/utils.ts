import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash } from "crypto";

// Merge Tailwind CSS classes with clsx
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate URL-friendly slug from text
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// Format number with K/M suffix
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

// Format relative time
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;

  return past.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: past.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// Parse JSON safely
export function parseJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

// Generate random color for avatar placeholder
export function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Generate SHA-256 hash of prompt text for duplicate detection
export function hashPromptText(promptText: string): string {
  // Normalize: trim, lowercase, collapse whitespace
  const normalized = promptText.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

// Prompt type configurations
export const PROMPT_TYPES = {
  "text-to-image": {
    label: "Text to Image",
    color: "bg-blue-500",
    textColor: "text-blue-500",
    bgLight: "bg-blue-50 dark:bg-blue-950",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
    ringColor: "ring-blue-500/50",
    icon: "Image",
  },
  "text-to-video": {
    label: "Text to Video",
    color: "bg-purple-500",
    textColor: "text-purple-500",
    bgLight: "bg-purple-50 dark:bg-purple-950",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
    ringColor: "ring-purple-500/50",
    icon: "Video",
  },
  "image-to-image": {
    label: "Image to Image",
    color: "bg-green-500",
    textColor: "text-green-500",
    bgLight: "bg-green-50 dark:bg-green-950",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
    ringColor: "ring-green-500/50",
    icon: "RefreshCw",
  },
  "image-to-video": {
    label: "Image to Video",
    color: "bg-orange-500",
    textColor: "text-orange-500",
    bgLight: "bg-orange-50 dark:bg-orange-950",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
    ringColor: "ring-orange-500/50",
    icon: "Play",
  },
} as const;

export type PromptType = keyof typeof PROMPT_TYPES;
