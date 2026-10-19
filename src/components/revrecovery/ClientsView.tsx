'use client';

import React, { useState, useEffect } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Briefcase,
  Building,
  CheckCircle2,
  Circle,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  FolderGit2,
  ExternalLink,
  ChevronRight,
  Plus,
  ShieldCheck,
  Edit,
  Save,
  MoreVertical,
  Archive,
  Trash2,
  Eye,
  RefreshCw,
  Pencil,
  Shield,
  Sliders,
  Lock,
  Users,
  Copy,
  Check,
  Mail,
  UserPlus,
  AlertCircle,
  BarChart2,
  PhoneCall,
  Award,
  Layers,
  Sparkles,
  Info,
  Key,
  EyeOff,
} from 'lucide-react';
import {
  Client,
  ClientDiscoveryQuestionnaire,
  ClientOperationalMetrics,
  ClientRole,
  getClientPortalAccessStatus,
} from '@/types/revrecovery';
import { hashPortalPassword } from '@/lib/invitationRegistry';
import { EditClientModal } from './EditClientModal';
import { DeleteClientModal } from './DeleteClientModal';
import { ClientPortalManageModal } from './ClientPortalManageModal';
import { AddClientModal } from './AddClientModal';

type ClientDetailTab =
  | 'overview'
  | 'campaigns'
  | 'metrics'
  | 'meetings'
  | 'deals'
  | 'reports'
  | 'portal';

export const ClientsView: React.FC = () => {
  const {
    clients,
    companies,
    contacts,
    leads,
    meetings,
    projects,
    tasks,
    teamMembers,
    selectedClientId,
    setSelectedClientId,
    toggleOnboardingItem,
    updateDiscoveryQuestionnaire,
    updateClient,
    updateClientOperationalMetrics,
    archiveClient,
    restoreClient,
    deleteClient,
    setActiveModule,
    clientPortalUsers,
    inviteClientPortalUser,
    resendClientPortalInvitation,
    revokeClientPortalUser,
    deleteClientPortalUser,
    updateClientPortalUserRole,
    updateClientPortalUser,
    updateClientPortalSettings,
    setPortalClientId,
    setIsClientPortalMode,
  } = useRevRecoveryStore();

  const [activeTab, setActiveTab] = useState<ClientDetailTab>('overview');
  const [editingQuestionnaire, setEditingQuestionnaire] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<'active' | 'archived'>('active');

  // Modals & Action State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [actionClient, setActionClient] = useState<Client | null>(null);
  const [openMenuClientId, setOpenMenuClientId] = useState<string | null>(null);

  // Filtered Client Sets
  const nonArchivedClients = clients.filter((c) => !c.archived);
  const archivedClients = clients.filter((c) => !!c.archived);
  const displayedClients = directoryFilter === 'active' ? nonArchivedClients : archivedClients;

  // Active client
  const activeClient =
    displayedClients.find((c) => c.id === selectedClientId) ||
    displayedClients[0] ||
    nonArchivedClients[0] ||
    null;
  const activeCompany = activeClient ? companies.find((c) => c.id === activeClient.companyId) : null;
  const activeContact = activeClient?.primaryContactId
    ? contacts.find((c) => c.id === activeClient.primaryContactId)
    : contacts.find((c) => c.companyId === activeClient?.companyId) || null;

  // Questionnaire form state
  const [qForm, setQForm] = useState<Partial<ClientDiscoveryQuestionnaire>>({});

  // Operational Metrics Form State (Internal Team Edit)
  const [metricsForm, setMetricsForm] = useState<Partial<ClientOperationalMetrics>>({});
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsSuccess, setMetricsSuccess] = useState<string | null>(null);
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);

  // Client Portal Tab Local State
  const [portalInviteEmail, setPortalInviteEmail] = useState('');
  const [portalInviteName, setPortalInviteName] = useState('');
  const [portalInviteRole, setPortalInviteRole] = useState<ClientRole>('client_admin');
  const [portalPassword, setPortalPassword] = useState('');
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{
    email: string;
    password?: string;
    portalUrl: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [portalActionError, setPortalActionError] = useState<string | null>(null);
  const [portalActionSuccess, setPortalActionSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInviteMsg, setCopiedInviteMsg] = useState(false);
  const [isUpdatingContactEmail, setIsUpdatingContactEmail] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [isResendingVerification, setIsResendingVerification] = useState<string | null>(null);

  // Sync metrics form whenever activeClient changes
  useEffect(() => {
    if (activeClient) {
      const existing = activeClient.operationalMetrics;
      const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      setMetricsForm({
        reportingPeriod: existing?.reportingPeriod || currentMonthYear,
        campaignStatus: existing?.campaignStatus || 'Active',
        targetAccounts: existing?.targetAccounts ?? 0,
        contactsReached: existing?.contactsReached ?? 0,
        totalReplies: existing?.totalReplies ?? 0,
        positiveReplies: existing?.positiveReplies ?? 0,
        qualifiedProspects: existing?.qualifiedProspects ?? 0,
        meetingsBooked: existing?.meetingsBooked ?? 0,
        meetingsCompleted: existing?.meetingsCompleted ?? 0,
        dealsClosed: existing?.dealsClosed ?? 0,
        revenueGenerated: existing?.revenueGenerated ?? 0,
        internalNotes: existing?.internalNotes || '',
        updatedBy: existing?.updatedBy || activeClient.accountOwner || 'Sarah Jenkins',
      });
      setNewContactEmail(activeClient.contactEmail || activeContact?.email || '');
      setPortalInviteEmail(activeClient.contactEmail || activeContact?.email || '');
      setPortalInviteName(activeContact?.name || activeCompany?.name || 'Client Lead');
      setMetricsError(null);
      setMetricsSuccess(null);
      setPortalActionError(null);
      setPortalActionSuccess(null);
    }
  }, [activeClient?.id, activeClient?.contactEmail, activeContact?.email, activeTab]);

  // Synchronize client records and invitations with server registry for cloud access
  useEffect(() => {
    if (clients.length > 0 || clientPortalUsers.length > 0) {
      fetch('/api/client-portal/invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients,
          companies,
          portalUsers: clientPortalUsers,
        }),
      }).catch((err) => console.warn('Registry background sync notice:', err));
    }
  }, [clients.length, clientPortalUsers.length]);

  const handleOpenQuestionnaire = (client: Client) => {
    setQForm(
      client.discoveryQuestionnaire || {
        targetMarket: 'Enterprise B2B',
        idealCustomerProfile: 'Founders / CROs of $2M-$50M ARR Tech Companies',
        targetGeographies: 'US & UK',
        dealSizeAverage: '$25,000 ARR',
        currentSalesProcess: 'Inbound only, no outbound',
        monthlyMeetingGoal: '15 qualified calls/month',
        monthlyBudget: '$6,500/mo',
        constraintsAndRequirements: 'Requires HIPAA compliance awareness',
      }
    );
    setEditingQuestionnaire(true);
  };

  const handleSaveQuestionnaire = async () => {
    if (!activeClient) return;
    await updateDiscoveryQuestionnaire(activeClient.id, {
      targetMarket: qForm.targetMarket || '',
      idealCustomerProfile: qForm.idealCustomerProfile || '',
      targetGeographies: qForm.targetGeographies || '',
      dealSizeAverage: qForm.dealSizeAverage || '',
      currentSalesProcess: qForm.currentSalesProcess || '',
      monthlyMeetingGoal: qForm.monthlyMeetingGoal || '',
      monthlyBudget: qForm.monthlyBudget || '',
      constraintsAndRequirements: qForm.constraintsAndRequirements || '',
    });
    setEditingQuestionnaire(false);
  };

  // Operational metrics save with numeric validation
  const handleSaveOperationalMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    // Validate numbers
    const numFields = [
      { key: 'targetAccounts', label: 'Target Accounts' },
      { key: 'contactsReached', label: 'Contacts Reached' },
      { key: 'totalReplies', label: 'Total Replies' },
      { key: 'positiveReplies', label: 'Positive Replies' },
      { key: 'qualifiedProspects', label: 'Qualified Prospects' },
      { key: 'meetingsBooked', label: 'Meetings Booked' },
      { key: 'meetingsCompleted', label: 'Meetings Completed' },
      { key: 'dealsClosed', label: 'Deals Closed' },
      { key: 'revenueGenerated', label: 'Revenue Generated' },
    ];

    for (const field of numFields) {
      const val = Number((metricsForm as any)[field.key]);
      if (isNaN(val) || val < 0) {
        setMetricsError(`${field.label} must be a valid non-negative number.`);
        return;
      }
    }

    if (Number(metricsForm.meetingsCompleted) > Number(metricsForm.meetingsBooked)) {
      setMetricsError('Meetings completed cannot exceed total meetings booked.');
      return;
    }

    setIsSavingMetrics(true);
    setMetricsError(null);
    setMetricsSuccess(null);

    try {
      await updateClientOperationalMetrics(activeClient.id, {
        ...metricsForm,
        updatedBy: activeClient.accountOwner || 'Sarah Jenkins',
      });
      setMetricsSuccess('Operational metrics saved and synced to database records successfully.');
      setTimeout(() => setMetricsSuccess(null), 4000);
    } catch (err: unknown) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to save operational metrics.');
    } finally {
      setIsSavingMetrics(false);
    }
  };

  // Update contact email
  const handleUpdateContactEmail = async () => {
    if (!activeClient || !newContactEmail.trim() || !newContactEmail.includes('@')) {
      setPortalActionError('Please enter a valid client contact email.');
      return;
    }
    try {
      const emailLower = newContactEmail.trim().toLowerCase();
      await updateClient(activeClient.id, {
        contactEmail: emailLower,
      });
      setPortalInviteEmail(emailLower);
      setIsUpdatingContactEmail(false);
      setPortalActionSuccess('Contact email updated successfully.');
      setTimeout(() => setPortalActionSuccess(null), 3000);
    } catch (err: unknown) {
      setPortalActionError('Failed to update contact email.');
    }
  };

  // Generate a strong random password helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 9; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPortalPassword(`${pass}8!`);
    setShowPortalPassword(true);
  };

  // Save / Create Client Portal Access
  const handleSaveClientAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeClient) return;

    const emailTrimmed = portalInviteEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setPortalActionError('Please enter a valid business email address.');
      return;
    }

    if (!portalPassword || portalPassword.length < 6) {
      setPortalActionError('Password must be at least 6 characters.');
      return;
    }

    setIsSavingAccess(true);
    setPortalActionError(null);
    setPortalActionSuccess(null);

    try {
      const passwordHash = hashPortalPassword(portalPassword);

      // 1. Call server API to create/update Firebase Auth and link to client
      const res = await fetch('/api/client-portal/create-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: activeClient.id,
          email: emailTrimmed,
          password: portalPassword,
          portalPasswordHash: passwordHash,
          name: portalInviteName.trim() || activeCompany?.name || 'Client Representative',
          role: portalInviteRole,
          client: activeClient,
          company: activeCompany,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create client portal access.');
      }

      // 2. Update local store state: link representative to active client record and activate access
      const { user: linkedUser } = await inviteClientPortalUser(activeClient.id, {
        email: emailTrimmed,
        name: portalInviteName.trim() || activeCompany?.name || 'Client Representative',
        role: portalInviteRole,
      });

      await updateClientPortalUser(linkedUser.id, {
        clientId: activeClient.id,
        clientName: activeCompany?.name || 'Client',
        status: 'active',
        role: portalInviteRole,
        portalPasswordHash: passwordHash,
      });

      await updateClient(activeClient.id, {
        contactEmail: emailTrimmed,
        portalAccessStatus: 'Active',
        portalPasswordHash: passwordHash,
        portalSettings: {
          ...(activeClient.portalSettings || {
            enabled: true,
            allowedMetrics: ['leads', 'outreach', 'meetings', 'conversions'],
            allowedTabs: ['overview', 'campaigns', 'meetings'],
            kpiTargets: {},
            sharedDocIds: [],
          }),
          portalPasswordHash: passwordHash,
        },
      });

      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://worknest-seven-rosy.vercel.app';
      const portalUrl =
        data.portalUrl ||
        `${origin}/client-portal/login?email=${encodeURIComponent(emailTrimmed)}&clientId=${encodeURIComponent(activeClient.id)}`;

      setLastCreatedCredentials({
        email: emailTrimmed,
        password: portalPassword,
        portalUrl,
      });

      setPortalActionSuccess(
        `Portal access created for ${emailTrimmed}! Credentials are active and ready to share.`
      );
    } catch (err: unknown) {
      setPortalActionError(err instanceof Error ? err.message : 'Failed to save client access.');
    } finally {
      setIsSavingAccess(false);
    }
  };

  // Resend email verification link
  const handleResendVerificationEmail = async (email: string) => {
    setIsResendingVerification(email);
    setPortalActionError(null);
    setPortalActionSuccess(null);

    try {
      const res = await fetch('/api/client-portal/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPortalActionSuccess(data.message || `Verification link dispatched to ${email}!`);
      } else {
        setPortalActionError(data.error || 'Failed to dispatch verification email.');
      }
    } catch (err: unknown) {
      setPortalActionError(err instanceof Error ? err.message : 'Error sending verification link.');
    } finally {
      setIsResendingVerification(null);
    }
  };

  // Copy full credentials message
  const handleCopyCredentialsMessage = () => {
    if (!lastCreatedCredentials) return;
    const msg = `RevRecovery Client Portal Credentials:

Portal URL: ${lastCreatedCredentials.portalUrl}
Authorized Email: ${lastCreatedCredentials.email}
Password: ${lastCreatedCredentials.password}

Log in directly with these credentials to view your performance dashboard.`;

    navigator.clipboard.writeText(msg);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  // Copy portal login link
  const handleCopyPortalLink = (email?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const clientEmail = email || activeClient?.contactEmail || '';
    const link = `${origin}/client-portal/login?email=${encodeURIComponent(clientEmail)}&clientId=${activeClient?.id || ''}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);

    if (activeClient) {
      fetch('/api/client-portal/invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: activeClient,
          company: activeCompany,
        }),
      }).catch(() => {});
    }
  };

  // Copy invitation message
  const handleCopyInviteMessage = () => {
    if (!activeClient) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const email = activeClient.contactEmail || activeContact?.email || 'your-email@company.com';
    const portalUrl = `${origin}/client-portal/login?email=${encodeURIComponent(email)}&clientId=${activeClient.id}`;

    const message = `Hello,

You are invited to access the RevRecovery Client Portal for ${activeCompany?.name || 'your company'}.
In this secure portal, you can monitor live lead research, campaign outreach progress, qualified prospects, and scheduled discovery meetings.

Portal Login URL:
${portalUrl}

Your Authorized Login Email: ${email}

First-Time Access:
1. Open the portal URL above.
2. Enter your email and choose your portal password to activate your account.
3. Once your password is set, you will enter your authorized portal dashboard directly.

Best regards,
RevRecovery Growth Team`;

    navigator.clipboard.writeText(message);
    setCopiedInviteMsg(true);
    setTimeout(() => setCopiedInviteMsg(false), 2500);
  };

  // Overall metrics
  const activeClientsCount = nonArchivedClients.filter((c) => c.contractStatus === 'Active').length;
  const totalRetainerMRR = nonArchivedClients
    .filter((c) => c.contractStatus === 'Active')
    .reduce((sum, c) => sum + (c.monthlyValue || 0), 0);

  // Active client calculations
  const clientLeads = activeClient
    ? leads.filter((l) => l.clientId === activeClient.id || l.companyId === activeClient.companyId)
    : [];
  const clientMeetings = activeClient
    ? meetings.filter(
        (m) => m.relatedClientId === activeClient.id || m.relatedCompanyId === activeClient.companyId
      )
    : [];
  const clientProjects = activeClient
    ? projects.filter((p) => p.clientId === activeClient.id)
    : [];
  const clientPortalUsersList = activeClient
    ? clientPortalUsers.filter(
        (u) =>
          u.clientId === activeClient.id ||
          activeClient.portalUserIds?.includes(u.id) ||
          (activeClient.contactEmail && u.email.toLowerCase() === activeClient.contactEmail.toLowerCase())
      )
    : [];

  const portalStatus = activeClient
    ? getClientPortalAccessStatus(activeClient, clientPortalUsers)
    : 'Not Invited';

  const portalBadgeStyle = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'Invitation Pending':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'Revoked':
        return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Client Management & Operations</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-500 font-semibold font-mono">
              {clients.length} accounts
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Internal RevRecovery client governance, operational performance tracking, and client portal access control
          </p>
        </div>

        {/* Top Controls & Add Client */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border">
              <span className="text-muted-foreground">Active Retainers: </span>
              <span className="font-bold text-foreground">${totalRetainerMRR.toLocaleString()}/mo</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <span className="font-medium">Active Accounts: </span>
              <strong className="font-bold">{activeClientsCount}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Master List + Detail View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Master Client Directory List */}
        <div className="w-80 border-r border-border bg-muted/20 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 border-b border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Client Directory
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {displayedClients.length} accounts
              </span>
            </div>

            {/* Directory Filter Tabs */}
            <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border text-[11px]">
              <button
                type="button"
                onClick={() => setDirectoryFilter('active')}
                className={`flex-1 py-1 rounded-md font-medium text-center transition-colors ${
                  directoryFilter === 'active'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active ({nonArchivedClients.length})
              </button>
              <button
                type="button"
                onClick={() => setDirectoryFilter('archived')}
                className={`flex-1 py-1 rounded-md font-medium text-center transition-colors ${
                  directoryFilter === 'archived'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Archived ({archivedClients.length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {displayedClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Building className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p>{directoryFilter === 'active' ? 'No active clients registered.' : 'No archived clients.'}</p>
                {directoryFilter === 'active' && (
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs inline-flex items-center gap-1 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Client</span>
                  </button>
                )}
              </div>
            ) : (
              displayedClients.map((client) => {
                const comp = companies.find((c) => c.id === client.companyId);
                const completedSteps = client.onboardingChecklist.filter((s) => s.completed).length;
                const totalSteps = client.onboardingChecklist.length;
                const onboardingPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const clientStatus = getClientPortalAccessStatus(client, clientPortalUsers);

                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setOpenMenuClientId(null);
                    }}
                    className={`p-3.5 hover:bg-muted/40 cursor-pointer transition-colors relative ${
                      activeClient?.id === client.id ? 'bg-card border-l-2 border-accent shadow-xs' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-foreground truncate max-w-[140px]">
                        {comp?.name || 'Client Account'}
                      </span>
                      <div className="flex items-center gap-1.5 relative">
                        {/* Portal Access Status Badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${portalBadgeStyle(
                            clientStatus
                          )}`}
                          title={`Portal Access: ${clientStatus}`}
                        >
                          {clientStatus}
                        </span>

                        {/* 3-dots actions menu button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuClientId(openMenuClientId === client.id ? null : client.id);
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Client Actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuClientId === client.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-xl py-1 z-30 space-y-0.5 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setOpenMenuClientId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground"
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>View Client</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionClient(client);
                                setEditModalOpen(true);
                                setOpenMenuClientId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground"
                            >
                              <Pencil className="w-3.5 h-3.5 text-accent" />
                              <span>Edit Client</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setActiveTab('portal');
                                setOpenMenuClientId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-sky-500 font-medium"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>Portal Access</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPortalClientId(client.id);
                                setIsClientPortalMode(true);
                                setOpenMenuClientId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Preview Portal</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (client.archived) {
                                  await restoreClient(client.id);
                                } else {
                                  await archiveClient(client.id);
                                }
                                setOpenMenuClientId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground"
                            >
                              {client.archived ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Restore Client</span>
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Archive Client</span>
                                </>
                              )}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setActionClient(client);
                                setDeleteModalOpen(true);
                                setOpenMenuClientId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 flex items-center gap-2 text-rose-500 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Client</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        ${client.monthlyValue?.toLocaleString()}/mo
                      </span>
                      <span>Lead: {client.accountOwner}</span>
                    </div>

                    {/* Onboarding progress bar */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Onboarding Protocol</span>
                        <span className="font-mono font-medium">{onboardingPct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-accent h-full transition-all duration-300"
                          style={{ width: `${onboardingPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        {activeClient && activeCompany ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-card">
            {/* Detail Sub-Navigation Header */}
            <div className="p-4 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent text-lg">
                  {activeCompany.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{activeCompany.name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${portalBadgeStyle(
                        portalStatus
                      )}`}
                    >
                      Portal: {portalStatus}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{activeCompany.industry}</span>
                    <span>•</span>
                    <span>Account Lead: {activeClient.accountOwner}</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-500">
                      ${activeClient.monthlyValue?.toLocaleString()}/mo Retainer
                    </span>
                  </div>
                </div>
              </div>

              {/* 7 Dedicated Tabs Selector */}
              <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-card text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'campaigns'
                      ? 'bg-card text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Campaigns & Work
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('metrics')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'metrics'
                      ? 'bg-card text-emerald-500 shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Performance Metrics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('meetings')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'meetings'
                      ? 'bg-card text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Meetings ({clientMeetings.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('deals')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'deals'
                      ? 'bg-card text-amber-500 shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Deals & Revenue</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'reports'
                      ? 'bg-card text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Reports & Updates</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('portal')}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeTab === 'portal'
                      ? 'bg-card text-sky-500 shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Client Portal Access</span>
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Account Summary & Commercial Terms */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                          Commercial Engagement
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-500">
                          {activeClient.contractStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Monthly Retainer:</span>
                          <span className="font-bold text-foreground text-sm">
                            ${activeClient.monthlyValue?.toLocaleString()}/mo
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Contract Start:</span>
                          <span className="font-medium text-foreground">{activeClient.startDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Renewal Date:</span>
                          <span className="font-medium text-foreground">{activeClient.renewalDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Account Owner:</span>
                          <span className="font-medium text-foreground">{activeClient.accountOwner}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground block text-[11px]">Services Purchased:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {activeClient.servicesPurchased.map((svc, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                              {svc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Portal Access Status Card */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-sky-500" />
                          <span>Client Portal Access Status</span>
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${portalBadgeStyle(
                            portalStatus
                          )}`}
                        >
                          {portalStatus}
                        </span>
                      </div>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Primary Contact Email:</span>
                          <span className="font-mono text-foreground font-medium">
                            {activeClient.contactEmail || activeContact?.email || 'No contact email set'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Active Portal Representatives:</span>
                          <span className="text-foreground font-medium">
                            {clientPortalUsersList.length} user(s) associated with this organization
                          </span>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('portal')}
                            className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Manage Portal Access & Invitations →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 10-Step Onboarding Checklist */}
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          10-Step Client Onboarding Protocol
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Rigorous operational workflow executed upon client engagement.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/15 text-accent font-mono">
                        {activeClient.onboardingChecklist.filter((s) => s.completed).length} /{' '}
                        {activeClient.onboardingChecklist.length} Complete
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {activeClient.onboardingChecklist.map((step) => (
                        <div
                          key={step.id}
                          onClick={() => toggleOnboardingItem(activeClient.id, step.id)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-3 text-xs ${
                            step.completed
                              ? 'bg-emerald-500/5 border-emerald-500/30 text-muted-foreground'
                              : 'bg-card border-border hover:border-accent/40 text-foreground'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={step.completed ? 'line-through' : 'font-medium'}>
                            {step.title}
                          </span>
                          {step.completed && step.completedAt && (
                            <span className="ml-auto text-[10px] text-emerald-500 font-mono">
                              ✓ {new Date(step.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Internal Notes & Strategy (Strictly Hidden from Client) */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <span>Internal Strategic Notes</span>
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono font-medium">
                        Hidden from Client Portal
                      </span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {activeClient.notes || 'No internal notes entered for this client account.'}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: CAMPAIGNS & WORK */}
              {activeTab === 'campaigns' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Campaign Header & Scope */}
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Outbound Campaign & Delivery Scope
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Campaign parameters, target accounts, and delivery sprints for {activeCompany.name}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-500 font-mono">
                        Status: {activeClient.operationalMetrics?.campaignStatus || 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <span className="text-muted-foreground block text-[11px]">Reporting Period:</span>
                        <span className="font-bold text-foreground">
                          {activeClient.operationalMetrics?.reportingPeriod || 'Current Period'}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <span className="text-muted-foreground block text-[11px]">Target Accounts:</span>
                        <span className="font-bold text-foreground">
                          {activeClient.operationalMetrics?.targetAccounts ?? clientLeads.length} accounts
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <span className="text-muted-foreground block text-[11px]">Contacts Reached:</span>
                        <span className="font-bold text-foreground">
                          {activeClient.operationalMetrics?.contactsReached ?? 0} prospects
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Projects & Milestones */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Associated Delivery Projects ({clientProjects.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveModule('projects')}
                        className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open Projects Module</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {clientProjects.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                        No delivery project linked yet. A project is automatically generated upon lead conversion.
                      </div>
                    ) : (
                      clientProjects.map((proj) => (
                        <div key={proj.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{proj.name}</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-accent/15 text-accent font-semibold font-mono">
                              {proj.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{proj.description}</p>
                          <div className="space-y-1.5 pt-2 border-t border-border">
                            <span className="text-[11px] font-semibold text-muted-foreground block">
                              Key Sprints & Milestones:
                            </span>
                            {proj.milestones.map((m) => (
                              <div key={m.id} className="flex items-center justify-between text-xs py-1">
                                <span className={m.completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
                                  {m.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">{m.dueDate}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Discovery Questionnaire Snapshot */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Target Market & ICP Criteria
                      </h4>
                      {!editingQuestionnaire ? (
                        <button
                          onClick={() => handleOpenQuestionnaire(activeClient)}
                          className="px-2.5 py-1 rounded-md border border-border bg-card text-foreground hover:bg-muted text-xs font-medium flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> Edit ICP
                        </button>
                      ) : (
                        <button
                          onClick={handleSaveQuestionnaire}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Save ICP
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Target Market:</span>
                        <span className="font-semibold text-foreground">
                          {activeClient.discoveryQuestionnaire?.targetMarket || 'B2B Mid-Market'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">ICP Criteria:</span>
                        <span className="font-semibold text-foreground">
                          {activeClient.discoveryQuestionnaire?.idealCustomerProfile || 'Founders & CROs'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PERFORMANCE METRICS (TEAM EDITABLE & LIVE DATABASE SYNC) */}
              {activeTab === 'metrics' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Header & Explanation */}
                  <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-emerald-500" />
                        <span>Client Operational Performance Metrics</span>
                      </h3>
                      {activeClient.operationalMetrics?.updatedAt && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Last updated: {new Date(activeClient.operationalMetrics.updatedAt).toLocaleDateString()} by{' '}
                          {activeClient.operationalMetrics.updatedBy || 'Team'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Authorized team members can manually enter and calibrate operational metrics for this client.
                      Saved records power both the internal analytics and the client-facing dashboard.
                    </p>
                  </div>

                  {/* Feedback Alerts */}
                  {metricsError && (
                    <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{metricsError}</span>
                    </div>
                  )}

                  {metricsSuccess && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{metricsSuccess}</span>
                    </div>
                  )}

                  {/* Metrics Form */}
                  <form onSubmit={handleSaveOperationalMetrics} className="space-y-5">
                    {/* Period & Campaign Status */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Reporting Period & Campaign Governance
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">
                            Reporting Period (e.g. "October 2026", "Q4 2026") *
                          </label>
                          <input
                            type="text"
                            required
                            value={metricsForm.reportingPeriod || ''}
                            onChange={(e) => setMetricsForm({ ...metricsForm, reportingPeriod: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">
                            Campaign Operational Status *
                          </label>
                          <select
                            value={metricsForm.campaignStatus || 'Active'}
                            onChange={(e) =>
                              setMetricsForm({
                                ...metricsForm,
                                campaignStatus: e.target.value as any,
                              })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          >
                            <option value="Active">Active (Pacing to Target)</option>
                            <option value="Pacing Well">Pacing Well (Exceeding Goal)</option>
                            <option value="Optimizing">Optimizing (Refining Sequences)</option>
                            <option value="On Hold">On Hold (Client Request)</option>
                            <option value="Completed">Completed (Milestones Met)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Operational Numeric Metrics Grid */}
                    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Operational Funnel Metrics (Numeric Validation Enforced)
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Target Accounts</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.targetAccounts ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, targetAccounts: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Contacts Reached</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.contactsReached ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, contactsReached: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Total Replies</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.totalReplies ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, totalReplies: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Positive Replies</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.positiveReplies ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, positiveReplies: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Qualified Prospects</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.qualifiedProspects ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, qualifiedProspects: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Meetings Booked</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.meetingsBooked ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, meetingsBooked: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Meetings Completed</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.meetingsCompleted ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, meetingsCompleted: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Deals Closed</label>
                          <input
                            type="number"
                            min="0"
                            value={metricsForm.dealsClosed ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, dealsClosed: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-muted-foreground font-medium mb-1">Revenue Generated ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={metricsForm.revenueGenerated ?? 0}
                            onChange={(e) =>
                              setMetricsForm({ ...metricsForm, revenueGenerated: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Internal Notes (Notes for internal use, hidden from client) */}
                    <div className="p-4 rounded-xl border border-border bg-amber-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Internal Performance Notes & Attribution Context</span>
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-mono font-medium">
                          Strictly Hidden from Client Portal
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Internal observations regarding campaign velocity, reply sentiment, or deal attribution.
                      </p>
                      <textarea
                        rows={3}
                        placeholder="Internal campaign notes, ICP adjustments, or team action items..."
                        value={metricsForm.internalNotes || ''}
                        onChange={(e) => setMetricsForm({ ...metricsForm, internalNotes: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingMetrics}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSavingMetrics ? 'Saving Metrics...' : 'Save & Publish Metrics'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: MEETINGS (AVOID DOUBLE COUNTING) */}
              {activeTab === 'meetings' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                      <span className="text-xs text-muted-foreground font-medium">Meetings Booked</span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {activeClient.operationalMetrics?.meetingsBooked ?? clientMeetings.length}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Verified discovery calls</span>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                      <span className="text-xs text-muted-foreground font-medium">Meetings Completed</span>
                      <div className="text-2xl font-bold text-emerald-500 mt-1">
                        {activeClient.operationalMetrics?.meetingsCompleted ??
                          clientMeetings.filter((m) => m.outcome === 'Completed').length}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Conducted with prospect</span>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                      <span className="text-xs text-muted-foreground font-medium">Recorded in Calendar</span>
                      <div className="text-2xl font-bold text-sky-500 mt-1">{clientMeetings.length}</div>
                      <span className="text-[11px] text-muted-foreground">Unique calendar events</span>
                    </div>
                  </div>

                  {/* Meetings List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Discovery & Kickoff Meetings
                    </h4>

                    {clientMeetings.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                        <PhoneCall className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p>No meeting events registered yet for {activeCompany.name}.</p>
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
                        {clientMeetings.map((m) => (
                          <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{m.title}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    m.outcome === 'Completed'
                                      ? 'bg-emerald-500/15 text-emerald-500'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {m.outcome}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                                <span>📅 {m.date} {m.time}</span>
                                <span>•</span>
                                <span>Duration: {m.durationMinutes}m</span>
                                <span>•</span>
                                <span>Attendees: {m.attendees?.join(', ') || 'Team'}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {m.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: DEALS & REVENUE (INTERNAL CRM FINANCIALS) */}
              {activeTab === 'deals' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Financial Governance Alert */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                      <Lock className="w-4 h-4" />
                      <span>Internal CRM Financials & Revenue Governance</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deals, pipeline values, and revenue generation figures are kept strictly private to internal RevRecovery
                      team members unless the <strong>Deals & Revenue</strong> widget is explicitly enabled in the Client Portal Access settings.
                    </p>
                  </div>

                  {/* Revenue Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                      <span className="text-xs text-muted-foreground font-medium">Monthly Retainer</span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        ${activeClient.monthlyValue?.toLocaleString()}/mo
                      </div>
                      <span className="text-[11px] text-muted-foreground">Contractual revenue</span>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                      <span className="text-xs text-muted-foreground font-medium">Deals Closed</span>
                      <div className="text-2xl font-bold text-emerald-500 mt-1">
                        {activeClient.operationalMetrics?.dealsClosed ??
                          clientLeads.filter((l) => l.stage === 'Won').length}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Attributed client wins</span>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                      <span className="text-xs text-muted-foreground font-medium">Revenue Generated</span>
                      <div className="text-2xl font-bold text-amber-500 mt-1">
                        ${(
                          activeClient.operationalMetrics?.revenueGenerated ??
                          clientLeads
                            .filter((l) => l.stage === 'Won')
                            .reduce((sum, l) => sum + (l.value || 0), 0)
                        ).toLocaleString()}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Pipeline conversion value</span>
                    </div>
                  </div>

                  {/* Pipeline / Deals Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Associated Leads & Deals ({clientLeads.length})
                    </h4>

                    {clientLeads.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                        <DollarSign className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p>No individual leads or deals recorded for {activeCompany.name}.</p>
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
                        {clientLeads.map((l) => (
                          <div key={l.id} className="p-3.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{l.title}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent">
                                  {l.stage}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                Owner: {l.assignedTo || 'Team'} • Added {new Date(l.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="font-bold font-mono text-foreground">
                              ${(l.value || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: REPORTS & UPDATES */}
              {activeTab === 'reports' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                    <h3 className="text-sm font-bold text-foreground">
                      Client Deliverables & Executive Reports
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Standard operational artifacts shared with {activeCompany.name}.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="font-bold text-xs text-foreground">Outbound Strategy & Protocol</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Documented ICP targeting parameters, email infrastructure configuration, and sequence copy.
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono block pt-1">
                        Status: Active & Deployed
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-xs text-foreground">Monthly Performance Attribution</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comprehensive audit of target accounts reached, reply sentiments, and qualified meetings delivered.
                      </p>
                      <span className="text-[10px] text-emerald-500 font-mono block pt-1">
                        Period: {activeClient.operationalMetrics?.reportingPeriod || 'Current Month'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: CLIENT PORTAL ACCESS (GRANT ACCESS BY EMAIL & STABLE LOGIN URL) */}
              {activeTab === 'portal' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Access Governance Banner */}
                  <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-sky-500" />
                        <h3 className="text-sm font-bold text-foreground">
                          Client Portal Access for {activeCompany.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${portalBadgeStyle(
                            portalStatus
                          )}`}
                        >
                          {portalStatus}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Secure email invitation flow. Client representatives authenticate to see only their authorized data.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPortalClientId(activeClient.id);
                          setIsClientPortalMode(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Portal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionClient(activeClient);
                          setPortalModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Sliders className="w-3.5 h-3.5 text-accent" />
                        <span>Advanced Permissions</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Alerts */}
                  {portalActionError && (
                    <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{portalActionError}</span>
                    </div>
                  )}

                  {portalActionSuccess && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{portalActionSuccess}</span>
                    </div>
                  )}

                  {/* Section 1: Client Contact Email & Direct Actions */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Client Contact Email & Portal Access
                    </h4>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border text-xs">
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-[11px] block">Primary Client Contact Email:</span>
                        {!isUpdatingContactEmail ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground font-mono text-sm">
                              {activeClient.contactEmail || activeContact?.email || 'No email assigned'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsUpdatingContactEmail(true)}
                              className="text-accent hover:underline text-[11px]"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="email"
                              value={newContactEmail}
                              onChange={(e) => setNewContactEmail(e.target.value)}
                              placeholder="client@company.com"
                              className="px-2.5 py-1 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={handleUpdateContactEmail}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsUpdatingContactEmail(false)}
                              className="px-2.5 py-1 border border-border hover:bg-muted text-muted-foreground rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick Sharing Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyPortalLink()}
                          className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                          title="Copy direct portal login URL"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Copied URL!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Portal Link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyInviteMessage}
                          className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
                          title="Copy invitation message text"
                        >
                          {copiedInviteMsg ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Copied Message!</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5" />
                              <span>Copy Invite Message</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Set Up Client Portal Access (Email & Password) */}
                  <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-sky-500" />
                        <span>Set Up Client Portal Access</span>
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        Manual credentials flow — client logs in directly
                      </span>
                    </div>

                    <form onSubmit={handleSaveClientAccess} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                      <div className="sm:col-span-3">
                        <label className="block text-muted-foreground font-medium mb-1">Representative Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Jordan Blake"
                          value={portalInviteName}
                          onChange={(e) => setPortalInviteName(e.target.value)}
                          className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-muted-foreground font-medium mb-1">Client Email *</label>
                        <input
                          type="email"
                          required
                          placeholder="client@company.com"
                          value={portalInviteEmail}
                          onChange={(e) => setPortalInviteEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs font-mono"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-muted-foreground font-medium">Set Password *</label>
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="text-[10px] text-sky-500 hover:text-sky-400 font-medium underline"
                          >
                            Generate
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            id="portal-password-input"
                            type={showPortalPassword ? 'text' : 'password'}
                            required
                            placeholder="Min 6 characters"
                            value={portalPassword}
                            onChange={(e) => setPortalPassword(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPortalPassword(!showPortalPassword)}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showPortalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="submit"
                          disabled={isSavingAccess}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          {isSavingAccess ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Key className="w-3.5 h-3.5" />
                              <span>Save / Create Access</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Active Credentials Card */}
                    {lastCreatedCredentials && (
                      <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Access Active — Credentials Ready to Send</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyPortalLink(lastCreatedCredentials.email)}
                              className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-[11px] font-medium text-foreground flex items-center gap-1 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyCredentialsMessage}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                            >
                              {copiedCredentials ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Copied Credentials!</span>
                                </>
                              ) : (
                                <>
                                  <Key className="w-3 h-3" />
                                  <span>Copy Credentials</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-card/60 p-2.5 rounded-lg border border-border">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Client Email:</span>
                            <span className="font-mono font-bold text-foreground truncate block">
                              {lastCreatedCredentials.email}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Password:</span>
                            <span className="font-mono font-bold text-foreground truncate block">
                              {lastCreatedCredentials.password}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Portal URL:</span>
                            <span className="font-mono text-muted-foreground truncate block">
                              {lastCreatedCredentials.portalUrl}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Invited Client Representatives Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Authorized Portal Representatives ({clientPortalUsersList.length})
                      </h4>
                    </div>

                    {clientPortalUsersList.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                        <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p>No client representatives have been configured yet for {activeCompany.name}.</p>
                        <p className="text-[11px] text-muted-foreground/80">
                          Enter the client's email and password above to grant portal access.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
                        {clientPortalUsersList.map((user) => (
                          <div
                            key={user.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/25 flex items-center justify-center font-bold text-sky-500 text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{user.name}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                      user.status === 'revoked'
                                        ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                                        : user.status === 'active'
                                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                        : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                    }`}
                                  >
                                    {user.status === 'revoked'
                                      ? 'Revoked Access'
                                      : user.status === 'active'
                                      ? 'Active Access'
                                      : 'Invitation Pending'}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground capitalize">
                                    {user.role.replace('_', ' ')}
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono">{user.email}</span>
                              </div>
                            </div>

                            {/* User Action Buttons */}
                            <div className="flex items-center gap-2">
                              {/* Change Password helper */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPortalInviteEmail(user.email);
                                  setPortalInviteName(user.name);
                                  setPortalInviteRole(user.role);
                                  setPortalPassword('');
                                  const pwInput = document.getElementById('portal-password-input');
                                  pwInput?.focus();
                                  setPortalActionSuccess(
                                    `Ready to update password for ${user.email}. Enter a new password above and click Save / Create Access.`
                                  );
                                }}
                                className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-colors flex items-center gap-1"
                              >
                                <Key className="w-3 h-3 text-sky-500" />
                                <span>Change Password</span>
                              </button>

                              {/* Copy Portal Link */}
                              <button
                                type="button"
                                onClick={() => handleCopyPortalLink(user.email)}
                                className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-colors flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Link</span>
                              </button>

                              {/* Resend Verification Email */}
                              <button
                                type="button"
                                disabled={isResendingVerification === user.email}
                                onClick={() => handleResendVerificationEmail(user.email)}
                                className="px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                                title="Resend email verification link"
                              >
                                {isResendingVerification === user.email ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-3 h-3" />
                                    <span>Resend Verification</span>
                                  </>
                                )}
                              </button>

                              {user.status !== 'revoked' ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await revokeClientPortalUser(user.id);
                                      fetch('/api/client-portal/invitation', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          user: { ...user, status: 'revoked' },
                                          client: activeClient,
                                          company: activeCompany,
                                        }),
                                      }).catch(() => {});
                                      setPortalActionSuccess(`Access revoked for ${user.email}`);
                                    } catch (err) {
                                      setPortalActionError('Failed to revoke access.');
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-medium transition-colors"
                                >
                                  Revoke Access
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await updateClientPortalUserRole(user.id, user.role);
                                      fetch('/api/client-portal/invitation', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          user: { ...user, status: 'active', invitedAt: Date.now() },
                                          client: activeClient,
                                          company: activeCompany,
                                        }),
                                      }).catch(() => {});
                                      setPortalActionSuccess(`Access restored for ${user.email}`);
                                    } catch (err) {
                                      setPortalActionError('Failed to restore access.');
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[11px] font-medium transition-colors"
                                >
                                  Restore Access
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await deleteClientPortalUser(user.id);
                                    setPortalActionSuccess(`User ${user.email} removed from organization.`);
                                  } catch (err) {
                                    setPortalActionError('Failed to delete user.');
                                  }
                                }}
                                className="p-1 rounded text-muted-foreground hover:text-rose-500 transition-colors"
                                title="Remove User"
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
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            No client selected.
          </div>
        )}
      </div>

      {/* Modals for Adding, Editing and Deleting Clients */}
      <AddClientModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={(clientId) => {
          setSelectedClientId(clientId);
          setActiveTab('overview');
        }}
      />

      <EditClientModal
        isOpen={editModalOpen}
        client={actionClient || activeClient}
        onClose={() => {
          setEditModalOpen(false);
          setActionClient(null);
        }}
      />

      <DeleteClientModal
        isOpen={deleteModalOpen}
        client={actionClient || activeClient}
        onClose={() => {
          setDeleteModalOpen(false);
          setActionClient(null);
        }}
      />

      <ClientPortalManageModal
        isOpen={portalModalOpen}
        client={actionClient || activeClient}
        companyName={activeCompany ? activeCompany.name : 'Client'}
        onClose={() => {
          setPortalModalOpen(false);
          setActionClient(null);
        }}
      />
    </div>
  );
};
