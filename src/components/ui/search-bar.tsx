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
          "relative flex items-center rounded-full transition-all duration-500",
          "bg-muted/30 border border-border/40 backdrop-blur-md",
          isFocused && "bg-background border-primary/40 shadow-2xl shadow-primary/5",
          sizeClasses[size]
        )}
      >
        <div className="absolute left-5 text-muted-foreground/40 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
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
            "w-full bg-transparent pl-12 pr-12 outline-none font-medium",
            "text-foreground placeholder:text-muted-foreground/30",
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
                className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 w-full mt-3 py-3 rounded-2xl border-border/40 bg-background text-popover-foreground shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-5 py-2.5 text-left text-sm font-bold tracking-tight transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <Search className="inline-block h-3.5 w-3.5 mr-3 opacity-30" />
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
