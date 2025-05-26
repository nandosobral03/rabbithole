"use client";

import { Moon, Sun } from "lucide-react";
import { Switch } from "~/components/ui/switch";
import { useTheme } from "../providers/theme-provider";

interface ThemeToggleProps {
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost" | "default";
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "system") {
      // If currently system, switch to the opposite of resolved theme
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      // If currently light or dark, switch to the opposite
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const isDark = resolvedTheme === "dark";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Sun className="h-3 w-3 text-muted-foreground" />
      <Switch checked={isDark} onCheckedChange={toggleTheme} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`} />
      <Moon className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}
