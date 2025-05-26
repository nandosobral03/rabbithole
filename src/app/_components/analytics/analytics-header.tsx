"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "../shared/theme-toggle";

export function AnalyticsHeader() {
  return (
    <div className="border-border border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-foreground hover:text-foreground/80 transition-colors">
              <Image src="/icon.png" alt="rabbithole icon" width={32} height={32} className="h-8 w-8" />
              rabbithole
            </Link>
            <p className="mt-1 text-muted-foreground">Discover patterns and insights from shared rabbit holes</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
