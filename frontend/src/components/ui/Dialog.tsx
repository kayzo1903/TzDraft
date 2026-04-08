"use client";

import React, { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger" | "warning";
  loading?: boolean;
}

export function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  loading = false,
}: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted && !open) return null;

  const variants = {
    primary: "bg-amber-500 hover:bg-amber-400 text-gray-950",
    danger: "bg-rose-500 hover:bg-rose-400 text-white",
    warning: "bg-orange-500 hover:bg-orange-400 text-white",
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300",
        open ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={loading ? undefined : onClose}
      />

      {/* Content */}
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-800 bg-gray-950 p-8 shadow-2xl transition-all duration-300",
          open ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-6 top-6 rounded-full p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
        <p className="mb-8 text-sm leading-relaxed text-gray-400">{description}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-800 px-6 py-2.5 text-sm font-semibold text-gray-400 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50",
              variants[confirmVariant]
            )}
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
