"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  Video,
  RefreshCw,
  Play,
  X,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { cn, PROMPT_TYPES, type PromptType } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFilterStore } from "@/store";

interface FiltersProps {
  className?: string;
}

const typeIcons: Record<PromptType, React.ElementType> = {
  "text-to-image": Image,
  "text-to-video": Video,
  "image-to-image": RefreshCw,
  "image-to-video": Play,
};

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "most_copied", label: "Most Copied" },
  { value: "most_liked", label: "Most Liked" },
  { value: "alphabetical", label: "A-Z" },
];

const defaultTags = [
  "portrait",
  "landscape",
  "abstract",
  "realistic",
  "anime",
  "3D",
  "cinematic",
  "fantasy",
  "sci-fi",
  "nature",
  "architecture",
  "character",
];

export function FiltersSidebar({ className }: FiltersProps) {
  const {
    types: selectedTypes,
    tags: selectedTags,
    sortBy,
    toggleType,
    toggleTag,
    setSortBy,
    clearFilters,
  } = useFilterStore();

  const [expandedSections, setExpandedSections] = React.useState({
    types: true,
    tags: true,
    sort: true,
  });

  const availableTags = defaultTags;

  const hasActiveFilters =
    selectedTypes.length > 0 || selectedTags.length > 0 || sortBy !== "newest";

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <aside
      className={cn(
        "w-full space-y-5",
        className
      )}
    >
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          Filters
        </h2>
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active filters */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {selectedTypes.map((type) => (
              <Badge
                key={type}
                variant={type}
                className="pl-2 pr-1 py-1 cursor-pointer"
                onClick={() => toggleType(type)}
              >
                {PROMPT_TYPES[type].label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="pl-2 pr-1 py-1 cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection("types")}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-muted-foreground">
            Prompt Type
          </h3>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expandedSections.types && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence>
          {expandedSections.types && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {(Object.keys(PROMPT_TYPES) as PromptType[]).map((type) => {
                const config = PROMPT_TYPES[type];
                const Icon = typeIcons[type];
                const isSelected = selectedTypes.includes(type);

                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isSelected
                          ? "bg-primary-foreground/20"
                          : config.bgLight
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isSelected
                            ? "text-current"
                            : config.textColor
                        )}
                      />
                    </div>
                    <span className="font-medium">{config.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tags Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection("tags")}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-muted-foreground">
            Tags
          </h3>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expandedSections.tags && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence>
          {expandedSections.tags && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2"
            >
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer transition-all"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sort */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection("sort")}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-muted-foreground">
            Sort By
          </h3>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expandedSections.sort && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence>
          {expandedSections.sort && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as "newest" | "popular" | "most_copied" | "most_liked")}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all",
                    sortBy === option.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

// Mobile filter sheet
interface MobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileFilters({ isOpen, onClose }: MobileFiltersProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[85vh] overflow-auto lg:hidden"
          >
            <div className="sticky top-0 bg-background p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <FiltersSidebar />
            </div>
            <div className="sticky bottom-0 p-4 bg-background border-t">
              <Button className="w-full" onClick={onClose}>
                Show Results
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
