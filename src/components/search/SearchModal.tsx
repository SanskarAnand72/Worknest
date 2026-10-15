'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Search, FileText, Database, Star, ArrowRight, Plus } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, pages, setActivePageId, createPage } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  if (!searchOpen) return null;

  const nonArchivedPages = Object.values(pages).filter((p) => !p.isArchived);

  const filteredPages = nonArchivedPages.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const titleMatch = p.title.toLowerCase().includes(q);
    const contentString = p.content ? JSON.stringify(p.content).toLowerCase() : '';
    const contentMatch = contentString.includes(q);
    return titleMatch || contentMatch;
  });

  const handleSelect = (pageId: string) => {
    setActivePageId(pageId);
    setSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredPages.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredPages.length) % Math.max(1, filteredPages.length));
    } else if (e.key === 'Enter' && filteredPages[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredPages[selectedIndex].id);
    }
  };

  return (
    <div
      onClick={() => setSearchOpen(false)}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages or type commands..."
            className="w-full bg-transparent outline-none text-foreground text-sm placeholder:text-muted-foreground/60"
          />
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredPages.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No pages match &quot;{query}&quot;</div>
          ) : (
            filteredPages.map((page, idx) => (
              <button
                key={page.id}
                onClick={() => handleSelect(page.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  idx === selectedIndex ? 'bg-muted text-foreground' : 'hover:bg-muted/50 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base flex-shrink-0">{page.icon || '📄'}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{page.title || 'Untitled'}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {page.type === 'database' ? (
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" /> Database
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Page
                        </span>
                      )}
                      {page.isFavorite && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star className="w-3 h-3 fill-amber-500" /> Favorite
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-50 flex-shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Quick action bar */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Navigate with &uarr; &darr; and Enter</span>
          <button
            onClick={async () => {
              const newP = await createPage({ title: query || 'New Page' });
              setActivePageId(newP.id);
              setSearchOpen(false);
            }}
            className="flex items-center gap-1 hover:text-foreground text-accent"
          >
            <Plus className="w-3.5 h-3.5" />
            Create page &quot;{query || 'New Page'}&quot;
          </button>
        </div>
      </div>
    </div>
  );
};
