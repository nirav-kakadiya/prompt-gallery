"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
  BookMarked,
  Sparkles,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore, logout as logoutApi } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Magnetic } from "@/components/landing/magnetic";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const navLinks = [
  { href: "/gallery", label: "Explore" },
  { href: "/categories", label: "Categories" },
  { href: "/collections", label: "Collections" },
  { href: "/collections/discover", label: "Discover" },
];

export function Header({ onSearch }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout: logoutStore } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logoutApi();
      logoutStore();
      toast.success("Signed out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle dark mode - sync with document class
  React.useEffect(() => {
    const syncTheme = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
    };

    // Initial sync
    syncTheme();

    // Watch for class changes on html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          syncTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const toggleDarkMode = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    if (newValue) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-700",
        isScrolled
          ? "py-3 bg-background/80 backdrop-blur-xl border-b border-border/40"
          : "py-5 bg-background/50 backdrop-blur-sm"
      )}
    >
      <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Minimalist Logo */}
          <Link href="/gallery" className="flex items-center gap-3 group shrink-0" aria-label="PromptLab - Go to gallery">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:rotate-12">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-lg tracking-[-0.05em] uppercase hidden sm:block" aria-hidden="true">
              Prompt<span className="text-muted-foreground/60">Lab</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-10 ml-12">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-[11px] font-black uppercase tracking-[0.2em] transition-colors",
                  pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-12">
            <SearchBar
              placeholder="Search prompts..."
              onSearch={onSearch}
              className="bg-muted/50 border-none rounded-full h-11 px-6 text-sm"
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Submit Action */}
            <div className="hidden sm:block">
              <Magnetic>
                <Link 
                  href="/submit"
                  className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
                >
                  Submit
                  <Plus className="w-3 h-3 transition-transform group-hover:rotate-90" />
                </Link>
              </Magnetic>
            </div>

            {/* User Account */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all p-0.5">
                    <UserAvatar user={user} size="sm" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl border-border/40 shadow-2xl">
                  <div className="px-3 py-4 mb-2 bg-muted/30 rounded-xl">
                    <p className="text-sm font-black tracking-tight">
                      {user.name || "Architect"}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuItem asChild className="rounded-lg py-2.5">
                    <Link href="/profile">
                      <User className="mr-3 h-4 w-4 opacity-50" />
                      <span className="text-sm font-bold">Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg py-2.5">
                    <Link href="/collections">
                      <BookMarked className="mr-3 h-4 w-4 opacity-50" />
                      <span className="text-sm font-bold">Collections</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg py-2.5">
                    <Link href="/settings">
                      <Settings className="mr-3 h-4 w-4 opacity-50" />
                      <span className="text-sm font-bold">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive rounded-lg py-2.5 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4 opacity-50" />
                    <span className="text-sm font-bold">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link 
                href="/login" 
                className="text-[11px] font-black uppercase tracking-[0.2em] hover:text-primary transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-muted-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-t border-border/40 overflow-hidden"
          >
            <div className="px-6 py-8 space-y-4">
               {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-2xl font-black tracking-tighter"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-border/40 my-6" />
              <Link
                href="/submit"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-4 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs"
              >
                Submit Prompt
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
