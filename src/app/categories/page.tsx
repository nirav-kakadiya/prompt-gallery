"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout, PageHeader, EmptyState } from "@/components/layout/page-layout";
import { CategoryCard, CategoryCardSkeleton } from "@/components/cards/category-card";
import { Layers } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  promptCount: number;
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch("/api/categories");
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || "Failed to fetch categories");
  }
  return data.data;
}

export default function CategoriesPage() {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <PageLayout fullWidth>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <PageHeader
          title="Categories"
          description="Browse prompts by category to find exactly what you're looking for"
        />

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 pb-16">
            {Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <EmptyState
            icon={<Layers className="w-8 h-8 text-muted-foreground" />}
            title="Failed to load categories"
            description="Something went wrong. Please try again later."
          />
        )}

        {/* Empty state */}
        {!isLoading && !error && categories?.length === 0 && (
          <EmptyState
            icon={<Layers className="w-8 h-8 text-muted-foreground" />}
            title="No categories yet"
            description="Categories will appear here as prompts are added."
          />
        )}

        {/* Categories grid */}
        {!isLoading && !error && categories && categories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 pb-16">
            {categories.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
