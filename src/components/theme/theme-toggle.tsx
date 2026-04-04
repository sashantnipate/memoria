"use client";

import * as React from "react";
import { Check, Search, Palette } from "lucide-react";
import { THEMES } from "@/lib/registry/theme";
import { useThemeConfig } from "./theme-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ThemeToggle() {
  const [search, setSearch] = React.useState("");
  const { currentTheme, setThemeConfig } = useThemeConfig();

  const filtered = THEMES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Palette className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden border-sidebar-border shadow-2xl">
        <div className="p-3 border-b flex items-center gap-2 bg-muted/30">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-none bg-transparent focus-visible:ring-0 px-0 shadow-none"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
          <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {filtered.length} Themes
          </div>
          {filtered.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setThemeConfig(theme.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1">
                  {/* CRITICAL FIX: Safe mapping with fallback array */}
                  {(theme.previewColors || (theme as any).colors || []).map((c: string, i: number) => (
                    <div 
                      key={i} 
                      className="h-4 w-4 rounded-full border-2 border-card" 
                      style={{ backgroundColor: c }} 
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{theme.name}</span>
              </div>
              {currentTheme.id === theme.id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}