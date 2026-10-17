'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  Users,
  Sliders,
  Target,
  Copy,
  Check,
  UserPlus,
  Trash2,
  ExternalLink,
  Lock,
  Sparkles,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Client, ClientPortalUser, ClientRole, ClientPortalSettings } from '@/types/revrecovery';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';

interface ClientPortalManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  companyName: string;
}

export const ClientPortalManageModal: React.FC<ClientPortalManageModalProps> = ({
  isOpen,
  onClose,
  client,
  companyName,
}) => {
  const {
    clientPortalUsers,
    updateClientPortalSettings,
    inviteClientPortalUser,
    updateClientPortalUserRole,
    revokeClientPortalUser,
    deleteClientPortalUser,
    setPortalClientId,
    setIsClientPortalMode,
  } = useRevRecoveryStore();

  const [activeTab, setActiveTab] = useState<'access' | 'metrics' | 'kpis' | 'users'>('access');
  const [copiedLink, setCopiedLink] = useState(false);

  // Invite user form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ClientRole>('client_admin');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessLink, setInviteSuccessLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings local state
  const currentSettings: ClientPortalSettings = client.portalSettings || {
    enabled: true,
    allowedMetrics: ['leads', 'outreach', 'replies', 'qualified', 'meetings', 'conversions'],
    allowedTabs: ['overview', 'campaigns', 'meetings', 'projects', 'documents'],
    kpiTargets: {
      monthlyOutreach: 500,
      monthlyLeads: 250,
      monthlyQualified: 30,
      monthlyMeetings: 15,
      targetConversionRate: 5.0,
    },
    sharedDocIds: [],
    sharedNotes: '',
  };

  const [enabled, setEnabled] = useState(currentSettings.enabled);
  const [allowedMetrics, setAllowedMetrics] = useState<string[]>(currentSettings.allowedMetrics);
  const [allowedTabs, setAllowedTabs] = useState<string[]>(currentSettings.allowedTabs);
  const [monthlyOutreach, setMonthlyOutreach] = useState(currentSettings.kpiTargets.monthlyOutreach || 500);
  const [monthlyLeads, setMonthlyLeads] = useState(currentSettings.kpiTargets.monthlyLeads || 250);
  const [monthlyQualified, setMonthlyQualified] = useState(currentSettings.kpiTargets.monthlyQualified || 30);
  const [monthlyMeetings, setMonthlyMeetings] = useState(currentSettings.kpiTargets.monthlyMeetings || 15);
  const [targetConversionRate, setTargetConversionRate] = useState(currentSettings.kpiTargets.targetConversionRate || 5.0);
  const [sharedNotes, setSharedNotes] = useState(currentSettings.sharedNotes || '');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter users belonging to this client organization
  const organizationUsers = clientPortalUsers.filter((u) => u.clientId === client.id);

  const handleToggleMetric = (metric: any) => {
    if (allowedMetrics.includes(metric)) {
      setAllowedMetrics(allowedMetrics.filter((m) => m !== metric));
    } else {
      setAllowedMetrics([...allowedMetrics, metric]);
    }
  };

  const handleToggleTab = (tab: any) => {
    if (allowedTabs.includes(tab)) {
      if (allowedTabs.length <= 1) return; // Keep at least one tab
      setAllowedTabs(allowedTabs.filter((t) => t !== tab));
    } else {
      setAllowedTabs([...allowedTabs, tab]);
    }
  };

  const handleSaveSettings = async () => {
    setSaveStatus('Saving configuration...');
    await updateClientPortalSettings(client.id, {
      enabled,
      allowedMetrics: allowedMetrics as any,
      allowedTabs: allowedTabs as any,
      kpiTargets: {
        monthlyOutreach: Number(monthlyOutreach),
        monthlyLeads: Number(monthlyLeads),
        monthlyQualified: Number(monthlyQualified),
        monthlyMeetings: Number(monthlyMeetings),
        targetConversionRate: Number(targetConversionRate),
      },
      sharedNotes,
    });
    setSaveStatus('Settings updated successfully');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('Please provide a valid client user email address');
      return;
    }
    if (!inviteName.trim()) {
      setInviteError('Please enter the client representative name');
      return;
    }

    setInviteError(null);
    setIsSubmitting(true);
    try {
      const { inviteLink } = await inviteClientPortalUser(client.id, {
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
      });

      setInviteSuccessLink(inviteLink);
      setInviteEmail('');
      setInviteName('');
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to create client user invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewPortal = () => {
    setPortalClientId(client.id);
    setIsClientPortalMode(true);
    onClose();
  };

  const portalBaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/client-portal/login?email=${encodeURIComponent(client.contactEmail || '')}&clientId=${client.id}`
    : '';

  const handleCopyLink = (linkToCopy: string) => {
    navigator.clipboard.writeText(linkToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center font-bold text-sky-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Client Portal Configuration</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-accent/15 text-accent">
                  {companyName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Manage client access permissions, agreed KPI targets, and invited portal users
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviewPortal}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 border border-sky-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Portal</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border bg-muted/10 px-5 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('access')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'access'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Portal Settings & Controls</span>
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'metrics'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Allowed Metrics & Tabs</span>
          </button>
          <button
            onClick={() => setActiveTab('kpis')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'kpis'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agreed KPI Benchmarks</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'users'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Portal Users ({organizationUsers.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PORTAL ACCESS & CONTROLS */}
          {activeTab === 'access' && (
            <div className="space-y-6">
              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Client Portal Enabled</h4>
                  <p className="text-xs text-muted-foreground">
                    When active, authorized users with assigned credentials can view campaign delivery progress
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    enabled ? 'bg-emerald-500 justify-end' : 'bg-muted justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Direct Portal Link */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Client Direct Portal Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={portalBaseUrl}
                    className="flex-1 px-3 py-2 text-xs bg-muted/40 border border-border rounded-xl font-mono text-muted-foreground select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(portalBaseUrl)}
                    className="px-3 py-2 text-xs font-medium rounded-xl bg-accent text-accent-foreground flex items-center gap-1.5 shrink-0 hover:bg-accent/90 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Security & Isolation Notice */}
              <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 flex items-start gap-3">
                <Lock className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h5 className="font-semibold text-sky-500">Security & Privacy Guarantee</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Client users are isolated to records tagged with <span className="font-mono text-foreground font-semibold">{companyName}</span>.
                    Internal notes, team task backlogs, commercial margins, and team member salaries are strictly redacted and never transmitted to the client.
                  </p>
                </div>
              </div>

              {/* Client Briefing / Shared Notes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Client Shared Briefing / Executive Notes</label>
                <textarea
                  rows={3}
                  value={sharedNotes}
                  onChange={(e) => setSharedNotes(e.target.value)}
                  placeholder="Shared weekly message or campaign guidance visible on the client's overview dashboard..."
                  className="w-full px-3 py-2 text-xs bg-muted/20 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-accent resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: ALLOWED METRICS & TABS */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Permitted Metric Cards on Client Dashboard
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'leads', label: 'Leads Generated', desc: 'Total researched and verified outbound prospects' },
                    { id: 'outreach', label: 'Outreach Sent', desc: 'Outbound emails and LinkedIn messages dispatched' },
                    { id: 'replies', label: 'Replies Received', desc: 'Direct responses and interested prospect replies' },
                    { id: 'qualified', label: 'Qualified Prospects', desc: 'Prospects meeting criteria and entering sales discussion' },
                    { id: 'meetings', label: 'Meetings Booked & Held', desc: 'Confirmed discovery calls and completed sessions' },
                    { id: 'conversions', label: 'Conversions / Win Rate', desc: 'Closed revenue opportunities and conversion rate' },
                    { id: 'deals', label: 'Deals Closed', desc: 'Display count of won customer opportunities to client' },
                    { id: 'revenue', label: 'Revenue Generated', desc: 'Display client-attributed pipeline revenue' },
                  ].map((m) => {
                    const isChecked = allowedMetrics.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMetric(m.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isChecked ? 'border-accent/40 bg-accent/5' : 'border-border bg-card opacity-60'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-accent border-accent text-white' : 'border-border'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-foreground block">{m.label}</span>
                          <span className="text-[11px] text-muted-foreground">{m.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Visible Client Portal Tabs
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'overview', label: 'Executive Overview', desc: 'Metrics summary, KPI progress, and recent meetings' },
                    { id: 'campaigns', label: 'Campaigns & Lead Pipeline', desc: 'Sanitized leads and outbound channel performance' },
                    { id: 'meetings', label: 'Meeting Schedule', desc: 'Upcoming scheduled calls and completed notes' },
                    { id: 'projects', label: 'Delivery Milestones', desc: 'Sprint timeline and milestone check-offs' },
                    { id: 'documents', label: 'Shared Documents & Strategy', desc: 'Uploaded SOPs, ICP documents, and reports' },
                  ].map((t) => {
                    const isChecked = allowedTabs.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTab(t.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isChecked ? 'border-sky-500/40 bg-sky-500/5' : 'border-border bg-card opacity-60'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-sky-500 border-sky-500 text-white' : 'border-border'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-foreground block">{t.label}</span>
                          <span className="text-[11px] text-muted-foreground">{t.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AGREED KPI TARGETS */}
          {activeTab === 'kpis' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Set monthly targets negotiated with the client. These numbers drive the goal progress bars in their dashboard.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Monthly Outreach Volume</label>
                  <input
                    type="number"
                    value={monthlyOutreach}
                    onChange={(e) => setMonthlyOutreach(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-muted/20 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-accent font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Target outbound touches per 30-day cycle</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Monthly Researched Leads</label>
                  <input
                    type="number"
                    value={monthlyLeads}
                    onChange={(e) => setMonthlyLeads(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-muted/20 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-accent font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Target verified contacts added to campaign</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Monthly Qualified Prospects</label>
                  <input
                    type="number"
                    value={monthlyQualified}
                    onChange={(e) => setMonthlyQualified(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-muted/20 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-accent font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Prospects passing ICP verification</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Monthly Meetings Booked</label>
                  <input
                    type="number"
                    value={monthlyMeetings}
                    onChange={(e) => setMonthlyMeetings(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-muted/20 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-accent font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Agreed discovery calls delivered</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Target Conversion Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetConversionRate}
                    onChange={(e) => setTargetConversionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-muted/20 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-accent font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Expected meeting-to-close percentage</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PORTAL USERS */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Add User Form */}
              <form onSubmit={handleInviteUser} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-accent" />
                  <h4 className="text-xs font-bold text-foreground">Invite Client Portal User</h4>
                </div>

                {inviteError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {inviteSuccessLink && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Invitation created successfully! Share this direct access link:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteSuccessLink}
                        className="flex-1 px-2.5 py-1 text-[11px] bg-background border border-emerald-500/30 rounded font-mono select-all text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inviteSuccessLink)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-[11px] flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Email Address</label>
                    <input
                      type="email"
                      placeholder="jane@clientcompany.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as ClientRole)}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-accent"
                    >
                      <option value="client_admin">Client Admin (Full Portal Access)</option>
                      <option value="client_guest">Client Guest (Read Only)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Creating...' : 'Invite User'}</span>
                  </button>
                </div>
              </form>

              {/* Existing Users List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Client Organization Representatives
                </h4>

                {organizationUsers.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                    No client portal users invited yet. Use the form above to grant client access.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
                    {organizationUsers.map((u) => (
                      <div key={u.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{u.name}</span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                                  u.status === 'active'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : 'bg-rose-500/15 text-rose-500'
                                }`}
                              >
                                {u.status}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-[11px] font-mono">{u.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => updateClientPortalUserRole(u.id, e.target.value as ClientRole)}
                            className="px-2 py-1 text-xs bg-muted/40 border border-border rounded-lg text-foreground"
                          >
                            <option value="client_admin">Client Admin</option>
                            <option value="client_guest">Client Guest</option>
                          </select>

                          {u.status === 'active' ? (
                            <button
                              onClick={() => revokeClientPortalUser(u.id)}
                              className="px-2.5 py-1 text-xs text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              Revoke
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Revoked</span>
                          )}

                          <button
                            onClick={() => deleteClientPortalUser(u.id)}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {saveStatus ? (
              <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {saveStatus}
              </span>
            ) : (
              <span>Changes apply immediately to this client portal instance</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
