"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  href: string;
  className?: string;
  badge?: string;
}

export function ServiceCard({
  title,
  subtitle,
  icon,
  iconColor,
  href,
  className,
  badge,
}: ServiceCardProps) {
  return (
    <Link href={href as any} className={cn("group block", className)}>
      <article className="relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-surface p-5 transition-all duration-300 hover:border-white/10 hover:bg-surface-elevated hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10"
            style={{ backgroundColor: `${iconColor}20`, color: iconColor }}
          >
            <div className="text-2xl">{icon}</div>
          </div>
          {badge && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-neutral-400">{subtitle}</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 transition-colors group-hover:text-white">
            Open
          </span>
          <ArrowRight className="h-4 w-4 text-neutral-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
        </div>
      </article>
    </Link>
  );
}
