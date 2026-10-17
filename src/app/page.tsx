'use client';

import React, { useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { DatabaseView } from '@/components/database/DatabaseView';
import { SearchModal } from '@/components/search/SearchModal';

// RevRecovery Modules
import { RevRecoveryHQ } from '@/components/revrecovery/RevRecoveryHQ';
import { CrmLeadsView } from '@/components/revrecovery/CrmLeadsView';
import { ClientsView } from '@/components/revrecovery/ClientsView';
import { ProjectsView } from '@/components/revrecovery/ProjectsView';
import { TasksView } from '@/components/revrecovery/TasksView';
import { MeetingsView } from '@/components/revrecovery/MeetingsView';
import { MarketingView } from '@/components/revrecovery/MarketingView';
import { GoalsReportsView } from '@/components/revrecovery/GoalsReportsView';
import { IntegrationsView } from '@/components/revrecovery/IntegrationsView';
import { TeamView } from '@/components/revrecovery/TeamView';
import { SettingsView } from '@/components/revrecovery/SettingsView';
import { SopsWikiView } from '@/components/revrecovery/SopsWikiView';
import { CustomModuleView } from '@/components/revrecovery/CustomModuleView';
import { ClientPortalView } from '@/components/revrecovery/ClientPortalView';

export default function Home() {
  const {
    isInitialized: isWorkspaceInitialized,
    init: initWorkspace,
    pages,
    databases,
    activePageId,
  } = useWorkspaceStore();

  const {
    isInitialized: isRevInitialized,
    init: initRevRecovery,
    activeModule,
    customModules,
    isClientPortalMode,
    setIsClientPortalMode,
    setPortalClientId,
    clientPortalUsers,
    setPortalClientUser,
  } = useRevRecoveryStore();

  useEffect(() => {
    initWorkspace();
    initRevRecovery().then(() => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlClientId = params.get('portalClientId');
        const urlEmail = params.get('portalEmail');
        if (urlClientId) {
          setPortalClientId(urlClientId);
          setIsClientPortalMode(true);
          if (urlEmail) {
            const users = useRevRecoveryStore.getState().clientPortalUsers;
            const matched = users.find(
              (u) => u.clientId === urlClientId && u.email.toLowerCase() === urlEmail.toLowerCase()
            );
            if (matched) {
              setPortalClientUser(matched);
            }
          }
        }
      }
    });
  }, [initWorkspace, initRevRecovery, setPortalClientId, setIsClientPortalMode, setPortalClientUser]);

  if (!isWorkspaceInitialized || !isRevInitialized) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent text-xl animate-pulse">
            ⚡
          </div>
          <span className="text-xs text-muted-foreground font-mono">Initializing RevRecovery OS...</span>
        </div>
      </div>
    );
  }

  const activePage = activePageId ? pages[activePageId] : null;
  const activeDatabase =
    activePage?.type === 'database'
      ? Object.values(databases).find((db) => db.pageId === activePage.id)
      : null;

  if (isClientPortalMode || activeModule === 'client-portal') {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <ClientPortalView />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Collapsible Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header page={activePage} />

        <main className="flex-1 overflow-y-auto flex flex-col">
          {activePage ? (
            /* Notion Custom Page or Database Mode */
            activePage.type === 'database' && activeDatabase ? (
              <DatabaseView database={activeDatabase} />
            ) : (
              <BlockEditor page={activePage} />
            )
          ) : (
            /* RevRecovery OS Module Mode */
            <>
              {activeModule === 'hq' && <RevRecoveryHQ />}
              {activeModule === 'crm' && <CrmLeadsView />}
              {activeModule === 'clients' && <ClientsView />}
              {activeModule === 'projects' && <ProjectsView />}
              {activeModule === 'tasks' && <TasksView />}
              {activeModule === 'meetings' && <MeetingsView />}
              {activeModule === 'marketing' && <MarketingView />}
              {activeModule === 'goals' && <GoalsReportsView />}
              {activeModule === 'reports' && <GoalsReportsView />}
              {activeModule === 'integrations' && <IntegrationsView />}
              {activeModule === 'team' && <TeamView />}
              {activeModule === 'settings' && <SettingsView />}
              {activeModule === 'sops' && <SopsWikiView />}
              {customModules.some((m) => m.id === activeModule) && (
                <CustomModuleView moduleId={activeModule} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Command Palette / Search Modal */}
      <SearchModal />
    </div>
  );
}
