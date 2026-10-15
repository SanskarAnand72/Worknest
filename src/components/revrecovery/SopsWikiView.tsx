'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Send,
  Target,
  Sparkles,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { BlockEditor } from '@/components/editor/BlockEditor';

export const SopsWikiView: React.FC = () => {
  const { pages, activePageId, setActivePageId, createPage } = useWorkspaceStore();
  const { teamMembers } = useRevRecoveryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sales' | 'verification' | 'operations'>('all');

  // Filter pages that are SOP documents
  const allPages = Object.values(pages).filter((p) => !p.isArchived && p.type === 'doc');

  const sopPages = allPages.filter((p) => {
    if (searchTerm) {
      return p.title.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const activeSopPage = activePageId ? pages[activePageId] : sopPages[0] || null;

  const handleCreateNewSop = async () => {
    const newPage = await createPage({
      parentId: null,
      type: 'doc',
      title: 'New RevRecovery SOP Protocol',
      icon: '📘',
    });
    setActivePageId(newPage.id);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Company Wiki & Operating SOPs</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
              {sopPages.length} active documents
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Operational guidelines, ICP criteria, verification quality standards, and sales scripts
          </p>
        </div>

        <button
          onClick={handleCreateNewSop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 shadow-sm transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          + New SOP Document
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left SOP Directory */}
        <div className="w-80 border-r border-border bg-muted/20 flex flex-col overflow-y-auto shrink-0">
          {/* Search box */}
          <div className="p-3 border-b border-border bg-card">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search SOPs and wiki..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Directory items */}
          <div className="divide-y divide-border">
            {sopPages.map((page) => {
              const isSelected = activeSopPage?.id === page.id;

              return (
                <div
                  key={page.id}
                  onClick={() => setActivePageId(page.id)}
                  className={`p-3.5 hover:bg-muted/40 cursor-pointer transition-colors flex items-start gap-2.5 ${
                    isSelected ? 'bg-card border-l-2 border-accent shadow-xs' : ''
                  }`}
                >
                  <span className="text-base shrink-0">{page.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-xs truncate ${
                        isSelected ? 'text-accent' : 'text-foreground'
                      }`}
                    >
                      {page.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Updated {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Embedded Notion-Grade TipTap Block Editor */}
        {activeSopPage ? (
          <div className="flex-1 overflow-y-auto bg-card">
            <BlockEditor page={activeSopPage} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            Select an SOP from the directory to view and edit.
          </div>
        )}
      </div>
    </div>
  );
};
