'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Archive,
  Trash2,
  FolderGit2,
  CheckSquare,
  Calendar,
  FileText,
  ShieldAlert,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { Client } from '@/types/revrecovery';

interface DeleteClientModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
}

export const DeleteClientModal: React.FC<DeleteClientModalProps> = ({
  isOpen,
  client,
  onClose,
}) => {
  const {
    companies,
    projects,
    tasks,
    meetings,
    proposals,
    archiveClient,
    deleteClient,
  } = useRevRecoveryStore();

  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen || !client) return null;

  const company = companies.find((c) => c.id === client.companyId);
  const clientName = company?.name || 'Client Account';

  // Dependency analysis
  const relatedProjects = projects.filter((p) => p.clientId === client.id);
  const relatedTasks = tasks.filter(
    (t) => t.relatedClientId === client.id || (client.companyId && t.relatedCompanyId === client.companyId)
  );
  const relatedMeetings = meetings.filter(
    (m) => m.relatedClientId === client.id || (client.companyId && m.relatedCompanyId === client.companyId)
  );
  const relatedProposals = proposals.filter((p) => client.companyId && p.companyId === client.companyId);

  const totalDependencies =
    relatedProjects.length + relatedTasks.length + relatedMeetings.length + relatedProposals.length;

  const handleArchive = async () => {
    setIsProcessing(true);
    try {
      await archiveClient(client.id);
      setNotice(`Client "${clientName}" was safely archived. Historical records are preserved.`);
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Failed to archive client');
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    setIsProcessing(true);
    try {
      await deleteClient(client.id);
      setNotice(`Client "${clientName}" permanently deleted from database.`);
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete client');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Client Removal & Safeguards</h2>
              <p className="text-[11px] text-muted-foreground">
                Account: <span className="font-semibold text-foreground">{clientName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {notice ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground leading-relaxed">
                You are about to remove <strong className="text-foreground">{clientName}</strong> from active workspace operations. Deletion or archival may affect dependent business history.
              </p>

              {/* Dependency Breakdown */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Associated Workspace Records:</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {totalDependencies} record{totalDependencies === 1 ? '' : 's'} linked
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                    <FolderGit2 className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>{relatedProjects.length} Delivery Projects</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{relatedTasks.length} Assigned Tasks</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                    <Calendar className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span>{relatedMeetings.length} Recorded Meetings</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                    <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{relatedProposals.length} Proposals</span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Safeguard policy: Reversible archival is strongly recommended to protect delivery history and billing audit logs.
                </p>
              </div>

              {/* Permanent Delete Confirmation Toggle */}
              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmPermanent}
                    onChange={(e) => setConfirmPermanent(e.target.checked)}
                    className="mt-0.5 rounded border-border text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    I understand the risks and want to enable irreversible permanent deletion.
                  </span>
                </label>
              </div>
            </>
          )}

          {/* Actions */}
          {!notice && (
            <div className="pt-4 flex items-center justify-between gap-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted border border-border font-medium transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {/* 1. Archive Button (Recommended) */}
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                  <span>Archive Client</span>
                </button>

                {/* 2. Permanent Delete Button */}
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={isProcessing || !confirmPermanent}
                  className="px-3.5 py-2 rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Client</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
