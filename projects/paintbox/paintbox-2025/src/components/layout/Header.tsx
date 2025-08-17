"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pb-theme");
    const initial = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("pb-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[color-mix(in_oklab,var(--color-bg),transparent_60%)] border-b border-[--border]">
      <div className="mx-auto max-w-6xl px-6 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-sm brand-stripe" aria-hidden />
          <span className="text-sm font-medium tracking-tight">Paintbox</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="subtle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </div>
    </header>
  );
}
