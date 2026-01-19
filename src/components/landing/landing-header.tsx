"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/use-auth";

export function LandingHeader() {
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/gallery", label: "Gallery" },
    { href: "/categories", label: "Categories" },
    { href: "/collections/discover", label: "Discover" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-700",
        isScrolled
          ? "py-4 bg-background/80 backdrop-blur-xl border-b border-border/40"
          : "py-8 bg-transparent"
      )}
    >
      <div className="container px-8 mx-auto">
        <div className="flex items-center justify-between">
          {/* Minimalist Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:rotate-12">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-lg tracking-[-0.05em] uppercase">
              Prompt<span className="text-muted-foreground/40">Lab</span>
            </span>
          </Link>

          {/* Centered Desktop Nav */}
          <nav className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/login" 
              className="text-[11px] font-black uppercase tracking-[0.2em] hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href={isAuthenticated ? "/gallery" : "/register"}
              className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
            >
              {isAuthenticated ? "Dashboard" : "Join Free"}
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[101] bg-background md:hidden flex flex-col p-10"
          >
            <div className="flex justify-between items-center mb-20">
              <span className="font-black text-xl tracking-tighter">MENU</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="flex flex-col gap-10">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-5xl font-black tracking-tighter hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-4">
              <Link 
                href="/register"
                className="w-full py-6 rounded-2xl bg-primary text-primary-foreground text-center font-black uppercase tracking-widest"
              >
                Get Started
              </Link>
              <Link 
                href="/login"
                className="w-full py-6 rounded-2xl border border-border text-center font-black uppercase tracking-widest"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
