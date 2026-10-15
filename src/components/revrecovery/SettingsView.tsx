'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Settings,
  Download,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Building,
  DollarSign,
  Database,
  Globe,
  Sliders,
  Users,
  Flame,
  ArrowRight,
  Shield,
  User,
  Pencil,
} from 'lucide-react';
import { FirebaseSetupModal } from './FirebaseSetupModal';
import { EditProfileModal } from './EditProfileModal';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export const SettingsView: React.FC = () => {
  const {
    companies,
    leads,
    clients,
    teamMembers,
    exportLeadsToCSV,
    saveStatus,
    setActiveModule,
  } = useRevRecoveryStore();

  const [agencyName, setAgencyName] = useState('RevRecovery');
  const [currency, setCurrency] = useState('USD ($)');
  const [timezone, setTimezone] = useState('UTC / Eastern Time');
  const [savedNotice, setSavedNotice] = useState(false);
  const [firebaseModalOpen, setFirebaseModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { currentUser } = useWorkspaceStore();

  const handleSaveWorkspaceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleExportJSON = () => {
    const data = {
      agency: agencyName,
      exportedAt: new Date().toISOString(),
      companies,
      leads,
      clients,
      teamMembers,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revrecovery_backup_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Workspace Configuration & Data Governance</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            RevRecovery agency parameters, currency standards, team governance, and cloud persistence
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-6">
        {savedNotice && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Workspace configuration updated successfully.</span>
          </div>
        )}

        {/* Agency Profile */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Building className="w-4 h-4 text-accent" /> Agency & Workspace Identity
          </h2>

          <form onSubmit={handleSaveWorkspaceSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground block mb-1">Company / Operating Name</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Commercial Billing Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                >
                  <option value="USD ($)">USD ($)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="GBP (£)">GBP (£)</option>
                  <option value="CAD ($)">CAD ($)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">Operational Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:opacity-90 text-accent-foreground font-medium rounded-lg text-xs transition-opacity"
            >
              Save Configuration
            </button>
          </form>
        </div>

        {/* Team Management Card (TASK 3) */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" /> Team & Workspace Access
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage team members, roles (Owner, Co-Founder, Admin, Member, Viewer), and pending invitations.
              </p>
            </div>
            <button
              onClick={() => setActiveModule('team')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
            >
              <span>Manage Team</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{teamMembers.length} active / invited member(s)</span>
              <span className="text-muted-foreground text-[11px]">• Role-based permissions enforced</span>
            </div>
            <button
              onClick={() => setActiveModule('team')}
              className="text-accent hover:underline text-[11px] font-medium"
            >
              View Roster →
            </button>
          </div>
        </div>

        {/* My Account & Profile Card */}
        {(() => {
          const founderMember = teamMembers.find((m) => m.role === 'owner' || m.id === 'team-sanskar') || teamMembers[0];
          const userName = currentUser?.displayName || currentUser?.name || founderMember?.displayName || founderMember?.name || 'Sanskar Anand';
          const userTitle = currentUser?.title || founderMember?.title || 'Founder & Managing Director';
          const userAvatar = currentUser?.avatarUrl || founderMember?.avatarUrl || '/avatars/sanskar-anand.jpg';
          const userEmail = currentUser?.email || founderMember?.email || 'sanskar@revrecovery.io';

          return (
            <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" /> My Account & Founder Profile
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customize your personal details, job title, display name, and avatar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border flex items-center gap-3">
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/sanskar-anand.jpg';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span>{userName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-accent/20 text-accent uppercase">
                      Owner
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{userTitle}</div>
                  <div className="text-[10px] text-muted-foreground/80 font-mono">{userEmail}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Firebase Cloud Sync Card (TASK 2) */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" /> Firebase Cloud Persistence & Sync
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure Firebase Authentication & Firestore for real-time collaboration and workspace data isolation.
              </p>
            </div>
            <button
              onClick={() => setFirebaseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 border border-border text-xs font-semibold text-foreground transition-colors"
            >
              <span>Configure Firebase</span>
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/20 border border-border text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Active Mode:</span>
              <span className="font-mono text-emerald-500 font-bold">Offline-First IndexedDB Active</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              RevRecovery stores data locally in your browser. When Firebase credentials are provided, cloud syncing enables multi-device persistence with workspace data isolation.
            </p>
          </div>
        </div>

        {/* Data Persistence & Backups */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-accent" /> Persistence Health & Data Backups
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              RevRecovery OS stores all CRM companies, leads, tasks, and client records locally in IndexedDB.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-muted-foreground block text-[11px]">Database Engine:</span>
              <span className="font-mono font-bold text-foreground">IndexedDB (idb v8.0)</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-muted-foreground block text-[11px]">Sync Status:</span>
              <span className="font-mono font-bold text-emerald-500">Persistent ({saveStatus})</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-muted-foreground block text-[11px]">Total Persisted Entities:</span>
              <span className="font-mono font-bold text-foreground">
                {companies.length + leads.length + clients.length} records
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium text-xs flex items-center gap-2 border border-border transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Full System JSON Backup
            </button>
            <button
              onClick={exportLeadsToCSV}
              className="px-3.5 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium text-xs flex items-center gap-2 border border-border transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CRM Leads CSV
            </button>
          </div>
        </div>
      </div>

      {/* Firebase Setup Modal */}
      <FirebaseSetupModal
        isOpen={firebaseModalOpen}
        onClose={() => setFirebaseModalOpen(false)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
};
