"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, debounce } from "@/lib/utils";
import { Button } from "./button";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  autoFocus?: boolean;
  size?: "default" | "lg" | "xl";
}

const sizeClasses = {
  default: "h-11",
  lg: "h-12 text-base",
  xl: "h-14 text-lg rounded-2xl",
};

export function SearchBar({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = "Search prompts...",
  className,
  isLoading = false,
  suggestions = [],
  onSuggestionClick,
  autoFocus = false,
  size = "default",
}: SearchBarProps) {
  const [internalValue, setInternalValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Debounced search
  const debouncedSearch = React.useMemo(
    () =>
      debounce((searchValue: string) => {
        onSearch?.(searchValue);
      }, 300),
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
    debouncedSearch(newValue);
  };

  const handleClear = () => {
    if (controlledValue === undefined) {
      setInternalValue("");
    }
    onChange?.("");
    onSearch?.("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch?.(value);
      setShowSuggestions(false);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (controlledValue === undefined) {
      setInternalValue(suggestion);
    }
    onChange?.(suggestion);
    onSearch?.(suggestion);
    onSuggestionClick?.(suggestion);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "relative flex items-center rounded-xl transition-all duration-300",
          "bg-white border border-neutral-200/80 shadow-sm",
          "dark:bg-neutral-900 dark:border-neutral-800/80",
          isFocused && "ring-2 ring-neutral-900/10 border-neutral-300 shadow-md",
          isFocused && "dark:ring-neutral-50/10 dark:border-neutral-700",
          sizeClasses[size]
        )}
      >
        <div className="absolute left-4 text-neutral-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "w-full bg-transparent pl-12 pr-10 outline-none",
            "text-neutral-900 placeholder:text-neutral-400",
            "dark:text-neutral-50 dark:placeholder:text-neutral-500",
            sizeClasses[size]
          )}
        />

        <AnimatePresence>
          {value && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleClear}
                className="h-7 w-7 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "absolute z-50 w-full mt-2 py-2 rounded-xl border shadow-lg",
              "bg-white border-neutral-200/60",
              "dark:bg-neutral-900 dark:border-neutral-800/60"
            )}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm transition-colors",
                  "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  "text-neutral-700 dark:text-neutral-300"
                )}
              >
                <Search className="inline-block h-4 w-4 mr-2 opacity-50" />
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
