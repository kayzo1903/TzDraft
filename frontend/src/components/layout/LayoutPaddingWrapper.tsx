"use client";

import React from "react";
import { usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LayoutPaddingWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <div className={cn(
      "flex min-h-[calc(100vh-64px)] lg:min-h-screen",
      isHomePage ? "pb-20 lg:pb-0" : ""
    )}>
      {children}
    </div>
  );
}
