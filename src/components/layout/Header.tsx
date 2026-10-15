'use client';

import React from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
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
  Zap,
} from 'lucide-react';
import { RevRecoveryModule } from '@/types/revrecovery';

interface HeaderProps {
  page: Page | null;
}

const MODULE_NAMES: Record<RevRecoveryModule, { name: string; icon: string }> = {
  hq: { name: 'RevRecovery HQ', icon: '⚡' },
  crm: { name: 'CRM & Lead Pipeline', icon: '🎯' },
  clients: { name: 'Client Management & Onboarding', icon: '💼' },
  projects: { name: 'Client Delivery Projects', icon: '📁' },
  tasks: { name: 'Operational Tasks', icon: '✅' },
  meetings: { name: 'Meetings & Decisions', icon: '📅' },
  marketing: { name: 'Marketing & Outbound Messaging', icon: '📢' },
  sops: { name: 'Company Wiki & SOPs', icon: '📘' },
  goals: { name: 'Goals & KPI Targets', icon: '🎯' },
  reports: { name: 'Funnel & Revenue Reports', icon: '📊' },
  integrations: { name: 'Integrations & Automations', icon: '🔌' },
  team: { name: 'Team & Permissions', icon: '👥' },
  settings: { name: 'Settings & Data Governance', icon: '⚙️' },
};

export const Header: React.FC<HeaderProps> = ({ page }) => {
  const {
    pages,
    saveStatus: docSaveStatus,
    sidebarOpen,
    setSidebarOpen,
    toggleFavorite,
    setActivePageId,
    archivePage,
  } = useWorkspaceStore();

  const { activeModule, setActiveModule, saveStatus: revSaveStatus, customModules } = useRevRecoveryStore();

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
  const customMod = customModules.find((m) => m.id === activeModule);
  const currentModule = customMod
    ? { name: customMod.name, icon: customMod.icon || '📁' }
    : MODULE_NAMES[activeModule] || MODULE_NAMES.hq;

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
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
          {page ? (
            breadcrumbs.map((crumb, idx) => (
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
            ))
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setActiveModule('hq');
                  setActivePageId(null);
                }}
                className="hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <span>⚡</span>
                <span className="font-semibold text-foreground">RevRecovery OS</span>
              </button>
              <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
              <span className="flex items-center gap-1 text-foreground font-medium">
                <span>{currentModule.icon}</span>
                <span>{currentModule.name}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Save Status, Favorite & Actions */}
      <div className="flex items-center gap-2 text-xs">
        {/* Autosave Status Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono text-[11px]">DB Synced</span>
          </span>
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
