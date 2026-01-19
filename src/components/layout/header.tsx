"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const navLinks = [
  { href: "/", label: "Browse" },
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
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle dark mode
  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
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
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="relative w-8 h-8 md:w-9 md:h-9">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl rotate-6" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="font-bold text-xl text-neutral-900 dark:text-white hidden sm:block">
              Prompt Gallery
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  pathname === link.href
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <SearchBar
              placeholder="Search prompts, styles, categories..."
              onSearch={onSearch}
              size="default"
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="text-neutral-600 dark:text-neutral-400"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Submit button - Desktop */}
            <Button
              variant="gradient"
              size="default"
              className="hidden md:flex"
              asChild
            >
              <Link href="/submit">
                <Plus className="h-4 w-4 mr-1" />
                Submit
              </Link>
            </Button>

            {/* User menu */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserAvatar user={user} size="default" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/collections">
                      <BookMarked className="mr-2 h-4 w-4" />
                      My Collections
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="secondary" size="default" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search - Below header when scrolled */}
        <div className="lg:hidden pb-3">
          <SearchBar
            placeholder="Search prompts..."
            onSearch={onSearch}
            size="default"
          />
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800"
        >
          <nav className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/submit"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white mt-4"
            >
              <Plus className="inline-block h-4 w-4 mr-2" />
              Submit Prompt
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
