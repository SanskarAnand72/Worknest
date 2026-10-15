'use client';

import React, { useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { DatabaseView } from '@/components/database/DatabaseView';
import { SearchModal } from '@/components/search/SearchModal';
import { Plus, Sparkles, FileText, Database } from 'lucide-react';

export default function Home() {
  const { isInitialized, init, pages, databases, activePageId, createPage } = useWorkspaceStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">Loading NovaNotes...</span>
        </div>
      </div>
    );
  }

  const activePage = activePageId ? pages[activePageId] : null;
  const activeDatabase = activePage?.type === 'database'
    ? Object.values(databases).find((db) => db.pageId === activePage.id)
    : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header page={activePage} />

        <main className="flex-1 overflow-y-auto">
          {activePage ? (
            activePage.type === 'database' && activeDatabase ? (
              <DatabaseView database={activeDatabase} />
            ) : (
              <BlockEditor page={activePage} />
            )
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-2xl mb-4 shadow-sm">
                📝
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-1">No Page Selected</h2>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                Select a page from the sidebar or create a new document or database to start writing.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => createPage({ type: 'doc', title: 'New Document' })}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <FileText className="w-4 h-4" />
                  New Document
                </button>
                <button
                  onClick={() => createPage({ type: 'database', title: 'New Database' })}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 text-xs font-medium border border-border transition-colors"
                >
                  <Database className="w-4 h-4" />
                  New Database
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Command Palette / Search Modal */}
      <SearchModal />
    </div>
  );
}
