import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PromptType, SortOption, FilterState } from "@/types";

// Filter Store
interface FilterStore extends FilterState {
  setQuery: (query: string) => void;
  setTypes: (types: PromptType[]) => void;
  toggleType: (type: PromptType) => void;
  setTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  setCategories: (categories: string[]) => void;
  setStyles: (styles: string[]) => void;
  setSortBy: (sortBy: SortOption) => void;
  clearFilters: () => void;
}

const initialFilterState: FilterState = {
  query: "",
  types: [],
  tags: [],
  categories: [],
  styles: [],
  sortBy: "newest",
};

export const useFilterStore = create<FilterStore>()((set) => ({
  ...initialFilterState,

  setQuery: (query) => set({ query }),

  setTypes: (types) => set({ types }),

  toggleType: (type) =>
    set((state) => ({
      types: state.types.includes(type)
        ? state.types.filter((t) => t !== type)
        : [...state.types, type],
    })),

  setTags: (tags) => set({ tags }),

  toggleTag: (tag) =>
    set((state) => ({
      tags: state.tags.includes(tag)
        ? state.tags.filter((t) => t !== tag)
        : [...state.tags, tag],
    })),

  setCategories: (categories) => set({ categories }),

  setStyles: (styles) => set({ styles }),

  setSortBy: (sortBy) => set({ sortBy }),

  clearFilters: () => set(initialFilterState),
}));

// UI Store for global UI state
interface UIStore {
  isSidebarOpen: boolean;
  isSearchFocused: boolean;
  activeModal: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchFocused: (focused: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  isSidebarOpen: false,
  isSearchFocused: false,
  activeModal: null,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setSearchFocused: (focused) => set({ isSearchFocused: focused }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
}));

// User Preferences Store (persisted)
interface PreferencesStore {
  theme: "light" | "dark" | "system";
  defaultPromptType: PromptType;
  viewMode: "grid" | "list" | "masonry" | "compact";
  gridColumns: number;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setDefaultPromptType: (type: PromptType) => void;
  setViewMode: (mode: "grid" | "list" | "masonry" | "compact") => void;
  setGridColumns: (columns: number) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: "system",
      defaultPromptType: "text-to-image",
      viewMode: "masonry",
      gridColumns: 4,

      setTheme: (theme) => {
        set({ theme });
        // Apply theme immediately
        if (typeof window !== "undefined") {
          const isDark =
            theme === "dark" ||
            (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
          if (isDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          localStorage.setItem("theme", theme);
        }
      },
      setDefaultPromptType: (type) => set({ defaultPromptType: type }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setGridColumns: (columns) => set({ gridColumns: columns }),
    }),
    {
      name: "prompt-gallery-preferences",
    }
  )
);

// Search History Store (persisted)
interface SearchHistoryStore {
  history: string[];
  addSearch: (query: string) => void;
  clearHistory: () => void;
}

export const useSearchHistoryStore = create<SearchHistoryStore>()(
  persist(
    (set) => ({
      history: [],

      addSearch: (query) =>
        set((state) => ({
          history: [
            query,
            ...state.history.filter((q) => q !== query),
          ].slice(0, 10),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "prompt-gallery-search-history",
    }
  )
);
