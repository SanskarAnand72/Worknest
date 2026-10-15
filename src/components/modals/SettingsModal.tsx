'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Settings, X, Download, Upload, Shield, User, HardDrive } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    workspaces,
    activeWorkspaceId,
    pages,
    databases,
    currentUser,
    createPage,
    setActivePageId,
  } = useWorkspaceStore();

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  if (!isOpen) return null;

  // Export complete JSON backup
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workspace: activeWs,
      pages: Object.values(pages),
      databases: Object.values(databases),
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novanotes_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Markdown file
  const handleImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const contentText = evt.target?.result as string;
      const fileName = file.name.replace(/\.[^/.]+$/, '');

      // Parse lines into simple TipTap JSON paragraphs
      const lines = contentText.split('\n');
      const paragraphs = lines.map((l) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: l }],
      }));

      const newPage = await createPage({
        title: fileName,
        icon: '📥',
        type: 'doc',
      });

      await useWorkspaceStore.getState().updatePageContent(newPage.id, {
        type: 'doc',
        content: paragraphs,
      });

      setActivePageId(newPage.id);
      onClose();
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            <h2 className="text-base font-bold">Workspace Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* Workspace Identity */}
          <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
            <div className="font-semibold text-sm text-foreground flex items-center gap-2">
              <span className="text-lg">{activeWs?.icon || '🚀'}</span>
              <span>{activeWs?.name}</span>
            </div>
            <div className="text-muted-foreground">Personal Single-User Workspace (Offline-First)</div>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">{currentUser?.name}</div>
                <div className="text-[11px] text-muted-foreground">{currentUser?.email}</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold text-[10px]">
              {currentUser?.role?.toUpperCase()}
            </span>
          </div>

          {/* Backup & Portability */}
          <div className="space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              Data Portability & Backup
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleExportBackup}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Export Full Backup (JSON)
              </button>

              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors font-medium cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Import File (.md / .txt)
                <input
                  type="file"
                  accept=".md,.txt,.json"
                  onChange={handleImportMarkdown}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
