"use client";

import React, { useState } from "react";
import { Scroll, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RulesTabsProps {
  generalContent: React.ReactNode;
  tournamentContent: React.ReactNode;
  labels: {
    general: string;
    tournament: string;
  };
}

export const RulesTabs: React.FC<RulesTabsProps> = ({ 
  generalContent, 
  tournamentContent,
  labels
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "tournament">("general");

  return (
    <div className="w-full">
      {/* Tabs Header */}
      <div className="flex flex-col sm:flex-row gap-2 mb-8 bg-[#1c1917] p-1.5 rounded-xl border border-white/5 w-full">
        <button
          onClick={() => setActiveTab("general")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300",
            activeTab === "general" 
              ? "bg-[#292524] text-primary shadow-lg border border-primary/20" 
              : "text-neutral-500 hover:text-neutral-300 hover:bg-[#292524]/50"
          )}
        >
          <Scroll className={cn("w-4 h-4", activeTab === "general" ? "text-primary" : "text-neutral-500")} />
          {labels.general}
        </button>
        <button
          onClick={() => setActiveTab("tournament")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300",
            activeTab === "tournament" 
              ? "bg-[#292524] text-primary shadow-lg border border-primary/20" 
              : "text-neutral-500 hover:text-neutral-300 hover:bg-[#292524]/50"
          )}
        >
          <Trophy className={cn("w-4 h-4", activeTab === "tournament" ? "text-primary" : "text-neutral-500")} />
          {labels.tournament}
        </button>
      </div>

      {/* Tabs Content */}
      <div className="relative overflow-hidden">
        {activeTab === "general" ? (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {generalContent}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {tournamentContent}
          </div>
        )}
      </div>
    </div>
  );
};
