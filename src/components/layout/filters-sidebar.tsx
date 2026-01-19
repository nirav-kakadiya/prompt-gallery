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
        "w-full flex flex-col gap-8",
        className
      )}
    >
      {/* Header with clear button */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-[15px] font-bold tracking-tight text-foreground">
            Filters
          </h2>
        </div>
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={clearFilters}
              className="text-[11px] font-bold uppercase tracking-widest text-primary/80 hover:text-primary transition-colors bg-primary/5 px-2 py-1 rounded-md"
            >
              Reset
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-1">
        {/* Type Filter */}
        <div className="group border-b border-border/40 pb-6">
          <button
            onClick={() => toggleSection("types")}
            className="flex items-center justify-between w-full py-2 text-left hover:opacity-80 transition-opacity"
          >
            <h3 className="text-[12px] font-black uppercase tracking-widest text-muted-foreground/80">
              Prompt Type
            </h3>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground/50 transition-transform duration-300",
                expandedSections.types && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.types && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="grid gap-1.5 mt-2"
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
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all relative group/item border",
                        isSelected
                          ? "bg-primary/5 text-primary font-bold border-primary/20 shadow-sm shadow-primary/5"
                          : "text-muted-foreground border-transparent hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground/60 group-hover/item:bg-background"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="tracking-tight">{config.label}</span>
                      </div>
                      {isSelected && (
                        <motion.div
                          layoutId="active-check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary relative z-10"
                        />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tags Filter */}
        <div className="group border-b border-border/40 py-6">
          <button
            onClick={() => toggleSection("tags")}
            className="flex items-center justify-between w-full py-2 text-left hover:opacity-80 transition-opacity"
          >
            <h3 className="text-[12px] font-black uppercase tracking-widest text-muted-foreground/80">
              Tags
            </h3>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground/50 transition-transform duration-300",
                expandedSections.tags && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.tags && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-wrap gap-2 mt-3"
              >
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shadow-xs",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                      )}
                    >
                      {tag.toUpperCase()}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sort */}
        <div className="group py-6">
          <button
            onClick={() => toggleSection("sort")}
            className="flex items-center justify-between w-full py-2 text-left hover:opacity-80 transition-opacity"
          >
            <h3 className="text-[12px] font-black uppercase tracking-widest text-muted-foreground/80">
              Sort By
            </h3>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground/50 transition-transform duration-300",
                expandedSections.sort && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.sort && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="grid gap-1 mt-2"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value as any)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-all relative group/sort",
                      sortBy === option.value
                        ? "text-primary font-bold bg-primary/5"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <span className="relative z-10 tracking-tight">{option.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
  const { clearFilters, types, tags, query } = useFilterStore();
  const hasActiveFilters = types.length > 0 || tags.length > 0 || !!query;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-[2.5rem] max-h-[92vh] flex flex-col shadow-2xl border-t lg:hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Filters</h2>
                {hasActiveFilters && (
                  <span className="w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {types.length + tags.length + (query ? 1 : 0)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-primary font-semibold text-xs"
                  >
                    Reset
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-muted/50">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <FiltersSidebar />
            </div>

            {/* Footer */}
            <div className="p-6 bg-background border-t safe-area-bottom">
              <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20" onClick={onClose}>
                Show Results
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
