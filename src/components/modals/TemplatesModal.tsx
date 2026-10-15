'use client';

import React from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Sparkles, X, FileText, Database, Check } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'doc' | 'database';
  content?: any;
}

const TEMPLATES: TemplateDef[] = [
  {
    id: 'tpl-meeting',
    name: 'Meeting Notes & Action Items',
    icon: '🤝',
    description: 'Structured template for agenda, discussions, key decisions, and assigned follow-ups.',
    type: 'doc',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🤝 Team Sync Agenda' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📋 Discussion Points' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Review sprint deliverables' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Architecture roadblocks and dependency triage' }] }] },
          ],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '✅ Action Items' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alex: Finalize API schema definitions' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dev Team: Run stress tests on storage engine' }] }] },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-adr',
    name: 'Architecture Decision Record (ADR)',
    icon: '🏛️',
    description: 'Document architectural decisions, context, trade-offs, and consequences.',
    type: 'doc',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🏛️ ADR: Local-First Storage Architecture' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Context & Problem Statement' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'We need instantaneous zero-latency document edits with offline capability and seamless recovery.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Decision' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Adopt client-side IndexedDB caching paired with in-memory Zustand store and optimistic local mutation buffers.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Consequences' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Positive: Works seamlessly offline with sub-millisecond local reads.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Positive: Preserves draft integrity during network loss.' }] }] },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-bug-tracker',
    name: 'Issue & Bug Tracker',
    icon: '🐛',
    description: 'Track software issues with severity, reproduction steps, and status views.',
    type: 'database',
  },
];

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose }) => {
  const { createPage, setActivePageId } = useWorkspaceStore();

  if (!isOpen) return null;

  const handleUseTemplate = async (template: TemplateDef) => {
    const page = await createPage({
      title: template.name,
      icon: template.icon,
      type: template.type,
    });

    if (template.type === 'doc' && template.content) {
      await useWorkspaceStore.getState().updatePageContent(page.id, template.content);
    }

    setActivePageId(page.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-base font-bold">Template Gallery</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Jumpstart your personal workspace with battle-tested templates.
        </p>

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => handleUseTemplate(tpl)}
              className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/60 transition-colors cursor-pointer flex items-start gap-3 group"
            >
              <span className="text-2xl p-1 bg-background border border-border rounded-lg flex-shrink-0">
                {tpl.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors flex items-center justify-between">
                  <span>{tpl.name}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted">
                    {tpl.type}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
