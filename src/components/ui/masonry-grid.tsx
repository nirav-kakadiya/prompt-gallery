"use client";

import Masonry from "react-masonry-css";
import { cn } from "@/lib/utils";

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
}

const breakpointColumns = {
  default: 4,  // xl and above
  1280: 3,     // lg
  1024: 3,     // md-lg
  768: 2,      // sm-md
  640: 2,      // sm
  0: 1,        // xs
};

export function MasonryGrid({ children, className }: MasonryGridProps) {
  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className={cn("flex w-auto -ml-6", className)}
      columnClassName="pl-6 bg-clip-padding"
    >
      {children}
    </Masonry>
  );
}
