"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Github, Twitter, Mail, Heart } from "lucide-react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { label: "Browse Gallery", href: "/gallery" },
      { label: "Submit Prompt", href: "/submit" },
      { label: "Collections", href: "/collections" },
      { label: "Trending", href: "/trending" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/api-docs" },
      { label: "Browser Extension", href: "/extension" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "/careers" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "DMCA", href: "/dmca" },
    ],
  },
};

const socialLinks = [
  { label: "GitHub", href: "https://github.com", icon: Github },
  { label: "Twitter", href: "https://twitter.com", icon: Twitter },
  { label: "Email", href: "mailto:hello@promptgallery.com", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t bg-background py-24">
      <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 lg:gap-20">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg tracking-[-0.05em] uppercase">
                Prompt<span className="text-muted-foreground/60">Lab</span>
              </span>
            </Link>
            <p className="mt-8 text-sm text-muted-foreground/60 leading-relaxed font-medium max-w-xs">
              The premium library for AI engineering. Architecting the future of creative intelligence, one prompt at a time.
            </p>
            <div className="mt-10 flex items-center gap-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/60 hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key} className="col-span-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground mb-8">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-24 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} PromptLab Intelligence Systems.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-primary fill-primary" />
            <span>by Creators</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
