"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PulseDotProps {
  online?: boolean;
  size?: number;
  className?: string;
}

export function PulseDot({ online = false, size = 12, className }: PulseDotProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <div
        className={cn(
          "absolute h-full w-full rounded-full opacity-75",
          online ? "animate-ping bg-emerald-400" : "bg-neutral-500",
        )}
      />
      <div
        className={cn(
          "relative rounded-full border border-black/20",
          online ? "bg-emerald-500" : "bg-neutral-600",
        )}
        style={{ width: size * 0.7, height: size * 0.7 }}
      />
    </div>
  );
}
