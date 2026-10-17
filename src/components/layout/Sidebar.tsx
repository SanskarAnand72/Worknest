'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { Page } from '@/types';
import { RevRecoveryModule } from '@/types/revrecovery';
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
  Pencil,
  Zap,
  Target,
  Briefcase,
  FolderGit2,
  CheckSquare,
  Calendar,
  Share2,
  BookOpen,
  BarChart3,
  Plug,
  Users,
  Flame,
  Shield,
} from 'lucide-react';
import { TemplatesModal } from '@/components/modals/TemplatesModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { ModuleBuilderModal } from '@/components/revrecovery/ModuleBuilderModal';
import { EditProfileModal } from '@/components/revrecovery/EditProfileModal';

interface NavModuleItem {
  id: RevRecoveryModule;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export const Sidebar: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    pages,
    activePageId,
    setActivePageId,
    createPage,
    updatePage,
    movePage,
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

  const {
    activeModule,
    setActiveModule,
    leads,
    tasks,
    clients,
    meetings,
    companies,
    customModules,
    teamMembers,
  } = useRevRecoveryStore();

  const [moduleBuilderOpen, setModuleBuilderOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [copiedPageId, setCopiedPageId] = useState<string | null>(null);
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({
    'page-welcome': true,
  });
  const [showTrash, setShowTrash] = useState(false);
  const [menuOpenPageId, setMenuOpenPageId] = useState<string | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!sidebarOpen) return null;

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const toggleExpand = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const handleCreateRootDoc = async () => {
    const page = await createPage({ parentId: null, type: 'doc', title: 'Untitled Page', icon: '📄' });
    setActivePageId(page.id);
  };

  const handleCreateRootDatabase = async () => {
    const page = await createPage({ parentId: null, type: 'database', title: 'New Database', icon: '🎯' });
    setActivePageId(page.id);
  };

  const handleSelectModule = (mod: RevRecoveryModule) => {
    setActiveModule(mod);
    setActivePageId(null);
  };

  const nonArchivedPages = Object.values(pages).filter((p) => !p.isArchived);
  const archivedPages = Object.values(pages).filter((p) => p.isArchived);
  const favoritePages = nonArchivedPages.filter((p) => p.isFavorite);
  const rootPages = nonArchivedPages
    .filter((p) => p.parentId === null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt);

  const handleFinishRename = (pageId: string) => {
    if (renamingTitle.trim()) {
      updatePage(pageId, { title: renamingTitle.trim() });
    }
    setRenamingPageId(null);
  };

  // Badges calculation
  const pendingTasksCount = tasks.filter((t) => t.status !== 'Done').length;
  const overdueFollowupsCount = leads.filter(
    (l) => l.nextFollowUpDate && new Date(l.nextFollowUpDate).getTime() < Date.now() && !['Won', 'Lost'].includes(l.stage)
  ).length;

  const REVRECOVERY_NAV: NavModuleItem[] = [
    { id: 'hq', label: 'RevRecovery HQ', icon: <Zap className="w-4 h-4 text-accent" /> },
    {
      id: 'crm',
      label: 'CRM & Leads',
      icon: <Target className="w-4 h-4 text-emerald-500" />,
      badge: overdueFollowupsCount > 0 ? `${overdueFollowupsCount} due` : undefined,
    },
    { id: 'clients', label: 'Clients', icon: <Briefcase className="w-4 h-4 text-blue-500" />, badge: clients.length },
    { id: 'client-portal', label: 'Client Portal', icon: <Shield className="w-4 h-4 text-sky-400" /> },
    { id: 'projects', label: 'Projects', icon: <FolderGit2 className="w-4 h-4 text-purple-500" /> },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <CheckSquare className="w-4 h-4 text-amber-500" />,
      badge: pendingTasksCount,
    },
    { id: 'meetings', label: 'Meetings', icon: <Calendar className="w-4 h-4 text-pink-500" /> },
    { id: 'marketing', label: 'Marketing & Content', icon: <Share2 className="w-4 h-4 text-cyan-500" /> },
    { id: 'sops', label: 'SOPs & Company Wiki', icon: <BookOpen className="w-4 h-4 text-indigo-500" /> },
    { id: 'goals', label: 'Goals & KPIs', icon: <Target className="w-4 h-4 text-emerald-600" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4 text-orange-500" /> },
    { id: 'integrations', label: 'Integrations', icon: <Plug className="w-4 h-4 text-teal-500" /> },
    { id: 'team', label: 'Team & Permissions', icon: <Users className="w-4 h-4 text-violet-500" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-zinc-400" /> },
  ];

  const renderPageItem = (page: Page, level = 0) => {
    const isExpanded = !!expandedPages[page.id];
    const isActive = activePageId === page.id;
    const isDropTarget = dropTargetId === page.id;
    const isDragging = draggedPageId === page.id;
    const childPages = nonArchivedPages
      .filter((p) => p.parentId === page.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt);
    const hasChildren = childPages.length > 0;

    return (
      <div
        key={page.id}
        className="select-none"
        draggable={!renamingPageId}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', page.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggedPageId(page.id);
        }}
        onDragEnd={() => {
          setDraggedPageId(null);
          setDropTargetId(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedPageId && draggedPageId !== page.id) {
            setDropTargetId(page.id);
          }
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (dropTargetId === page.id) setDropTargetId(null);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const droppedId = e.dataTransfer.getData('text/plain') || draggedPageId;
          setDropTargetId(null);
          setDraggedPageId(null);
          if (droppedId && droppedId !== page.id) {
            await movePage(droppedId, page.id);
            setExpandedPages((prev) => ({ ...prev, [page.id]: true }));
          }
        }}
      >
        <div
          onClick={() => {
            if (renamingPageId !== page.id) {
              setActivePageId(page.id);
            }
          }}
          style={{ paddingLeft: `${12 + level * 14}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-sm cursor-pointer transition-colors relative ${
            isDropTarget
              ? 'ring-2 ring-accent bg-accent/15'
              : isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
          } ${isDragging ? 'opacity-40' : ''}`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(page.id, e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground flex-shrink-0"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center text-xs opacity-60 flex-shrink-0">
                {page.type === 'database' ? <DatabaseIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              </span>
            )}
            <span className="text-base flex-shrink-0">{page.icon || '📄'}</span>

            {renamingPageId === page.id ? (
              <input
                type="text"
                value={renamingTitle}
                autoFocus
                onChange={(e) => setRenamingTitle(e.target.value)}
                onBlur={() => handleFinishRename(page.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename(page.id);
                  if (e.key === 'Escape') setRenamingPageId(null);
                }}
                className="bg-background border border-border px-1.5 py-0.5 rounded text-xs w-full focus:outline-none"
              />
            ) : (
              <span className="truncate text-xs">{page.title || 'Untitled'}</span>
            )}
          </div>

          {/* Hover Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(page.id);
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-400"
              title={page.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-3 h-3 ${page.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenamingPageId(page.id);
                setRenamingTitle(page.title);
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              title="Rename page"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                archivePage(page.id);
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500"
              title="Archive page"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">{childPages.map((child) => renderPageItem(child, level + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col justify-between flex-shrink-0 transition-all select-none">
        {/* Top Header */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* RevRecovery Workspace Switcher & Theme */}
          <div className="p-3 border-b border-sidebar-border/50 flex items-center justify-between">
            <div
              onClick={() => handleSelectModule('hq')}
              className="flex items-center gap-2 min-w-0 cursor-pointer group"
            >
              <span className="text-lg p-1.5 bg-accent/15 rounded-lg text-accent font-bold group-hover:scale-105 transition-transform">
                ⚡
              </span>
              <div>
                <span className="font-bold text-sm truncate text-sidebar-foreground block">
                  RevRecovery
                </span>
                <span className="text-[10px] text-muted-foreground block -mt-0.5">
                  Internal Operating System
                </span>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
              title="Toggle light/dark theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Search */}
          <div className="p-2 border-b border-sidebar-border/40">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-colors bg-muted/30 border border-border/50"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Search Anything...</span>
              </div>
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">Ctrl K</kbd>
            </button>
          </div>

          {/* Primary RevRecovery OS Navigation (13 Modules) */}
          <div className="p-2 space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Operating Modules
            </div>

            {REVRECOVERY_NAV.map((mod) => {
              const isSelected = activePageId === null && activeModule === mod.id;

              return (
                <button
                  key={mod.id}
                  onClick={() => handleSelectModule(mod.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {mod.icon}
                    <span className="truncate">{mod.label}</span>
                  </div>

                  {mod.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        typeof mod.badge === 'string' && mod.badge.includes('due')
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {mod.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Operating Modules Section (TASK 8) */}
          <div className="p-2 space-y-0.5 border-t border-sidebar-border/40 pt-2">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Custom Modules</span>
              <button
                onClick={() => setModuleBuilderOpen(true)}
                className="px-1.5 py-0.5 hover:bg-sidebar-accent rounded text-accent hover:text-accent font-semibold flex items-center gap-1 text-[10px] transition-colors"
                title="Create new operating module"
              >
                <Plus className="w-3 h-3" />
                <span>Create</span>
              </button>
            </div>

            {customModules.map((cMod) => {
              const isSelected = activePageId === null && activeModule === cMod.id;
              return (
                <button
                  key={cMod.id}
                  onClick={() => handleSelectModule(cMod.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-accent/15 text-accent font-semibold shadow-xs'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0">{cMod.icon || '📁'}</span>
                    <span className="truncate">{cMod.name}</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-muted text-muted-foreground font-mono uppercase">
                    {cMod.type}
                  </span>
                </button>
              );
            })}

            {customModules.length === 0 && (
              <button
                onClick={() => setModuleBuilderOpen(true)}
                className="w-full text-left px-2 py-1.5 text-[11px] text-muted-foreground hover:text-accent hover:bg-sidebar-accent rounded-lg flex items-center gap-1.5 border border-dashed border-border/60 transition-colors"
              >
                <Plus className="w-3 h-3 text-accent" />
                <span>Create your first module...</span>
              </button>
            )}
          </div>

          {/* Favorites Section */}
          {favoritePages.length > 0 && (
            <div className="mt-2 px-2 border-t border-sidebar-border/40 pt-2">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Favorites
              </div>
              <div className="space-y-0.5">{favoritePages.map((page) => renderPageItem(page, 0))}</div>
            </div>
          )}

          {/* Custom Notion-Style Documents & Databases */}
          <div
            className={`mt-2 px-2 flex-1 rounded-lg transition-colors border-t border-sidebar-border/40 pt-2 ${
              dropTargetId === 'root' ? 'bg-accent/10 ring-2 ring-accent' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedPageId) {
                setDropTargetId('root');
              }
            }}
            onDragLeave={() => {
              if (dropTargetId === 'root') setDropTargetId(null);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              const droppedId = e.dataTransfer.getData('text/plain') || draggedPageId;
              setDropTargetId(null);
              setDraggedPageId(null);
              if (droppedId) {
                await movePage(droppedId, null);
              }
            }}
          >
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Custom Docs & Databases</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCreateRootDoc}
                  className="p-0.5 hover:bg-sidebar-accent rounded text-muted-foreground hover:text-foreground"
                  title="Add document page"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-0.5">{rootPages.map((page) => renderPageItem(page, 0))}</div>
          </div>
        </div>

        {/* Footer (Trash & User Profile) */}
        <div className="p-2 border-t border-sidebar-border bg-sidebar/50">
          {/* Trash Popover */}
          <button
            onClick={() => setShowTrash(!showTrash)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              showTrash ? 'bg-sidebar-accent font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
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

          {/* User Profile Card - Clickable to Edit Profile */}
          {(() => {
            const founderMember = teamMembers.find((m) => m.role === 'owner' || m.id === 'team-sanskar') || teamMembers[0];
            const userName = currentUser?.displayName || currentUser?.name || founderMember?.displayName || founderMember?.name || 'Sanskar Anand';
            const userTitle = currentUser?.title || founderMember?.title || 'Founder & Managing Director';
            const userAvatar = currentUser?.avatarUrl || founderMember?.avatarUrl || '/avatars/sanskar-anand.jpg';

            return (
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="w-full mt-2 flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-muted/40 hover:bg-muted/80 border border-border/40 hover:border-accent/40 transition-all text-left group shadow-xs cursor-pointer"
                title="Click to edit your profile"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/60 group-hover:ring-2 group-hover:ring-accent/50 transition-all"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/avatars/sanskar-anand.jpg';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-sidebar-foreground truncate group-hover:text-accent transition-colors">
                      {userName}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {userTitle}
                    </div>
                  </div>
                </div>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity shrink-0" />
              </button>
            );
          })()}
        </div>
      </aside>

      {/* Templates & Settings & Module Builder & Edit Profile Modals */}
      <TemplatesModal isOpen={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ModuleBuilderModal isOpen={moduleBuilderOpen} onClose={() => setModuleBuilderOpen(false)} />
      <EditProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
};
