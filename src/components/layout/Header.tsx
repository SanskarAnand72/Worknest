'use client';

import React from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Page } from '@/types';
import {
  Menu,
  ChevronRight,
  Star,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  MoreHorizontal,
  Share2,
  Database,
  FileText,
} from 'lucide-react';

interface HeaderProps {
  page: Page | null;
}

export const Header: React.FC<HeaderProps> = ({ page }) => {
  const {
    pages,
    saveStatus,
    sidebarOpen,
    setSidebarOpen,
    toggleFavorite,
    setActivePageId,
    archivePage,
  } = useWorkspaceStore();

  // Compute breadcrumbs
  const getBreadcrumbs = (): Page[] => {
    if (!page) return [];
    const crumbs: Page[] = [page];
    let curr = page;
    while (curr.parentId && pages[curr.parentId]) {
      curr = pages[curr.parentId];
      crumbs.unshift(curr);
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-md sticky top-0 z-20">
      {/* Left: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1"
            title="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />}
              <button
                onClick={() => setActivePageId(crumb.id)}
                className={`flex items-center gap-1 truncate hover:text-foreground transition-colors ${
                  idx === breadcrumbs.length - 1 ? 'font-medium text-foreground' : ''
                }`}
              >
                <span>{crumb.icon || '📄'}</span>
                <span className="truncate max-w-[120px] md:max-w-[200px]">{crumb.title || 'Untitled'}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right: Save Status, Favorite & Actions */}
      <div className="flex items-center gap-2 text-xs">
        {/* Autosave Status Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-amber-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
            </span>
          )}
          {saveStatus === 'offline' && (
            <span className="flex items-center gap-1 text-zinc-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </span>
          )}
        </div>

        {page && (
          <>
            {/* Favorite Button */}
            <button
              onClick={() => toggleFavorite(page.id)}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                page.isFavorite ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={page.isFavorite ? 'Favorited' : 'Favorite'}
            >
              <Star className={`w-4 h-4 ${page.isFavorite ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Quick Archive */}
            <button
              onClick={() => archivePage(page.id)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
              title="Archive page"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
