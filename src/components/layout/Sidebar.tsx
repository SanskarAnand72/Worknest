'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Page } from '@/types';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Star,
  Trash2,
  FileText,
  Database as DatabaseIcon,
  Moon,
  Sun,
  MoreHorizontal,
  FolderPlus,
  RefreshCw,
  LogOut,
  Sparkles,
  Settings,
  Archive,
  Copy,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { TemplatesModal } from '@/components/modals/TemplatesModal';
import { SettingsModal } from '@/components/modals/SettingsModal';

export const Sidebar: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    pages,
    activePageId,
    setActivePageId,
    createPage,
    toggleFavorite,
    archivePage,
    restorePage,
    deletePagePermanently,
    duplicatePage,
    theme,
    toggleTheme,
    setSearchOpen,
    currentUser,
    sidebarOpen,
  } = useWorkspaceStore();
  const [copiedPageId, setCopiedPageId] = useState<string | null>(null);

  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({
    'page-welcome': true,
  });
  const [showTrash, setShowTrash] = useState(false);
  const [menuOpenPageId, setMenuOpenPageId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!sidebarOpen) return null;

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const toggleExpand = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const handleCreateRootDoc = async () => {
    await createPage({ parentId: null, type: 'doc', title: 'Untitled Page', icon: '📄' });
  };

  const handleCreateRootDatabase = async () => {
    await createPage({ parentId: null, type: 'database', title: 'New Database', icon: '🎯' });
  };

  const handleCreateChildPage = async (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages((prev) => ({ ...prev, [parentId]: true }));
    await createPage({ parentId, type: 'doc', title: 'Sub Page', icon: '📄' });
  };

  const nonArchivedPages = Object.values(pages).filter((p) => !p.isArchived);
  const archivedPages = Object.values(pages).filter((p) => p.isArchived);
  const favoritePages = nonArchivedPages.filter((p) => p.isFavorite);
  const rootPages = nonArchivedPages.filter((p) => p.parentId === null);

  const renderPageItem = (page: Page, level = 0) => {
    const isExpanded = !!expandedPages[page.id];
    const isActive = activePageId === page.id;
    const childPages = nonArchivedPages.filter((p) => p.parentId === page.id);
    const hasChildren = childPages.length > 0;

    return (
      <div key={page.id} className="select-none">
        <div
          onClick={() => setActivePageId(page.id)}
          style={{ paddingLeft: `${12 + level * 14}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-sm cursor-pointer transition-colors relative ${
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(page.id, e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center text-xs opacity-60">
                {page.type === 'database' ? <DatabaseIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              </span>
            )}
            <span className="text-base flex-shrink-0">{page.icon || '📄'}</span>
            <span className="truncate">{page.title || 'Untitled'}</span>
          </div>

          {/* Hover Action Buttons */}
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={(e) => handleCreateChildPage(page.id, e)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Add child page"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenPageId(menuOpenPageId === page.id ? null : page.id);
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>

          {/* Context Dropdown Menu */}
          {menuOpenPageId === page.id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-2 top-8 z-30 w-44 bg-card border border-border rounded-lg shadow-lg py-1 text-xs"
            >
              <button
                onClick={() => {
                  toggleFavorite(page.id);
                  setMenuOpenPageId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-left"
              >
                <Star className={`w-3.5 h-3.5 ${page.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                {page.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </button>
              <button
                onClick={async () => {
                  await duplicatePage(page.id);
                  setMenuOpenPageId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-left"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                Duplicate page
              </button>
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.origin + `?page=${page.id}`);
                    setCopiedPageId(page.id);
                    setTimeout(() => setCopiedPageId(null), 2000);
                  }
                  setMenuOpenPageId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-left"
              >
                {copiedPageId === page.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5 text-zinc-500" />
                )}
                {copiedPageId === page.id ? 'Link copied!' : 'Copy link'}
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => {
                  archivePage(page.id);
                  setMenuOpenPageId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Move to Trash
              </button>
            </div>
          )}
        </div>

        {/* Child Pages recursion */}
        {isExpanded && childPages.length > 0 && (
          <div className="flex flex-col">
            {childPages.map((child) => renderPageItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col justify-between flex-shrink-0 transition-all select-none">
        {/* Top Header */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Workspace Switcher */}
          <div className="p-3 border-b border-sidebar-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl p-1 bg-muted rounded-md">{activeWorkspace?.icon || '🚀'}</span>
              <span className="font-semibold text-sm truncate text-sidebar-foreground">
                {activeWorkspace?.name || 'Workspace'}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
              title="Toggle light/dark theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Nav (Search, Templates, Settings, New Page) */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span>Search</span>
              </div>
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">Ctrl K</kbd>
            </button>
            <button
              onClick={() => setTemplatesOpen(true)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Settings</span>
            </button>
            <button
              onClick={handleCreateRootDoc}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span>New Page</span>
            </button>
            <button
              onClick={handleCreateRootDatabase}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <DatabaseIcon className="w-4 h-4 text-muted-foreground" />
              <span>New Database</span>
            </button>
          </div>

          {/* Favorites Section */}
          {favoritePages.length > 0 && (
            <div className="mt-3 px-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Favorites
              </div>
              <div className="space-y-0.5">{favoritePages.map((page) => renderPageItem(page, 0))}</div>
            </div>
          )}

          {/* Workspace Pages Tree */}
          <div className="mt-4 px-2 flex-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Workspace</span>
              <button
                onClick={handleCreateRootDoc}
                className="p-0.5 hover:bg-sidebar-accent rounded"
                title="Add page"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">{rootPages.map((page) => renderPageItem(page, 0))}</div>
          </div>
        </div>

        {/* Footer (Trash & User Profile) */}
        <div className="p-2 border-t border-sidebar-border bg-sidebar/50">
          {/* Trash Popover */}
          <button
            onClick={() => setShowTrash(!showTrash)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
              showTrash ? 'bg-sidebar-accent font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
            <span>Trash ({archivedPages.length})</span>
          </button>

          {showTrash && (
            <div className="mt-1 p-2 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto space-y-1">
              {archivedPages.length === 0 ? (
                <div className="text-xs text-muted-foreground p-2 text-center">Trash is empty</div>
              ) : (
                archivedPages.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-1.5 hover:bg-muted rounded text-xs">
                    <span className="truncate max-w-[120px]">{p.title}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => restorePage(p.id)}
                        className="p-1 hover:text-accent"
                        title="Restore page"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deletePagePermanently(p.id)}
                        className="p-1 hover:text-red-500"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* User Card */}
          <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'}
              alt="Avatar"
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-sidebar-foreground truncate">{currentUser?.name || 'User'}</div>
              <div className="text-[10px] text-muted-foreground truncate">{currentUser?.email || 'user@nova.local'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Templates & Settings Modals */}
      <TemplatesModal isOpen={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};
