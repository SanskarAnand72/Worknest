'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Client, ClientDiscoveryQuestionnaire } from '@/types/revrecovery';
import { EditClientModal } from './EditClientModal';
import { DeleteClientModal } from './DeleteClientModal';

export const ClientsView: React.FC = () => {
  const {
    clients,
    companies,
    selectedClientId,
    setSelectedClientId,
    toggleOnboardingItem,
    updateDiscoveryQuestionnaire,
    archiveClient,
    restoreClient,
    deleteClient,
    projects,
    tasks,
    setActiveModule,
  } = useRevRecoveryStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'onboarding' | 'questionnaire' | 'projects'>('overview');
  const [editingQuestionnaire, setEditingQuestionnaire] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<'active' | 'archived'>('active');

  // Modals & Action State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionClient, setActionClient] = useState<Client | null>(null);
  const [openMenuClientId, setOpenMenuClientId] = useState<string | null>(null);

  // Filtered Client Sets
  const nonArchivedClients = clients.filter((c) => !c.archived);
  const archivedClients = clients.filter((c) => !!c.archived);
  const displayedClients = directoryFilter === 'active' ? nonArchivedClients : archivedClients;

  // Active client
  const activeClient = displayedClients.find((c) => c.id === selectedClientId) || displayedClients[0] || nonArchivedClients[0] || null;
  const activeCompany = activeClient ? companies.find((c) => c.id === activeClient.companyId) : null;

  // Questionnaire form state
  const [qForm, setQForm] = useState<Partial<ClientDiscoveryQuestionnaire>>({});

  const handleOpenQuestionnaire = (client: Client) => {
    setQForm(client.discoveryQuestionnaire || {
      targetMarket: 'Enterprise B2B',
      idealCustomerProfile: 'Founders / CROs of $2M-$50M ARR Tech Companies',
      targetGeographies: 'US & UK',
      dealSizeAverage: '$25,000 ARR',
      currentSalesProcess: 'Inbound only, no outbound',
      monthlyMeetingGoal: '15 qualified calls/month',
      monthlyBudget: '$6,500/mo',
      constraintsAndRequirements: 'Requires HIPAA compliance awareness',
    });
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

  // Metrics
  const activeClientsCount = nonArchivedClients.filter((c) => c.contractStatus === 'Active').length;
  const totalRetainerMRR = nonArchivedClients
    .filter((c) => c.contractStatus === 'Active')
    .reduce((sum, c) => sum + (c.monthlyValue || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Client Management & Onboarding</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-500 font-semibold font-mono">
              {clients.length} accounts
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            10-Step Onboarding Protocols, Discovery Questionnaires, Retainers & Campaign Delivery
          </p>
        </div>

        {/* Top Metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border">
            <span className="text-muted-foreground">Active Retainers: </span>
            <span className="font-bold text-foreground">${totalRetainerMRR.toLocaleString()}/mo</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <span className="font-medium">Active Accounts: </span>
            <strong className="font-bold">{activeClientsCount}</strong>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout: Master List + Detail View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Master Client List */}
        <div className="w-80 border-r border-border bg-muted/20 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 border-b border-border bg-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
              <span>Client Directory</span>
              <span className="font-mono text-[10px] text-muted-foreground">{displayedClients.length}</span>
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
              <div className="p-6 text-center text-xs text-muted-foreground">
                {directoryFilter === 'active' ? 'No active clients.' : 'No archived clients.'}
              </div>
            ) : (
              displayedClients.map((client) => {
                const comp = companies.find((c) => c.id === client.companyId);
                const completedSteps = client.onboardingChecklist.filter((s) => s.completed).length;
                const totalSteps = client.onboardingChecklist.length;
                const onboardingPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

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
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-foreground truncate max-w-[150px]">
                        {comp?.name || 'Client Account'}
                      </span>
                      <div className="flex items-center gap-1 relative">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            client.contractStatus === 'Active' && !client.archived
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {client.archived ? 'Archived' : client.contractStatus}
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
                            className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-xl shadow-xl py-1 z-30 space-y-0.5 text-xs"
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
                      <span>${client.monthlyValue?.toLocaleString()}/mo</span>
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
            {/* Detail Sub-Navigation */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent text-lg">
                  {activeCompany.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">{activeCompany.name}</h2>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
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

              {/* Actions & Tab Selector */}
              <div className="flex items-center gap-3">
                {/* Tab Selector */}
                <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border text-xs">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      activeTab === 'overview' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('onboarding')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      activeTab === 'onboarding' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Onboarding Checklist
                  </button>
                  <button
                    onClick={() => setActiveTab('questionnaire')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      activeTab === 'questionnaire' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Discovery Questionnaire
                  </button>
                  <button
                    onClick={() => setActiveTab('projects')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      activeTab === 'projects' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Delivery Projects
                  </button>
                </div>

                {/* Direct Action Buttons on Detail Header */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setActionClient(activeClient);
                      setEditModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-xs transition-colors"
                    title="Edit Client Details"
                  >
                    <Pencil className="w-3.5 h-3.5 text-accent" />
                    <span>Edit Client</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (activeClient.archived) {
                        await restoreClient(activeClient.id);
                      } else {
                        setActionClient(activeClient);
                        setDeleteModalOpen(true);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground shadow-xs transition-colors"
                    title={activeClient.archived ? 'Restore Client to Active' : 'Archive Client'}
                  >
                    {activeClient.archived ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Restore</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionClient(activeClient);
                      setDeleteModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 shadow-xs transition-colors"
                    title="Delete Client Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Commercial Terms & Target Profile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                        Commercial Terms & Engagement
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Monthly Retainer:</span>
                          <span className="font-bold text-foreground text-sm">
                            ${activeClient.monthlyValue?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Contract Status:</span>
                          <span className="font-semibold text-emerald-500">{activeClient.contractStatus}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Start Date:</span>
                          <span>{activeClient.startDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Renewal Date:</span>
                          <span>{activeClient.renewalDate}</span>
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

                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                        Account Goals & Targets
                      </h3>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Commercial Terms:</span>
                          <span className="font-medium text-foreground">{activeClient.commercialTerms}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Current Objectives:</span>
                          <p className="text-foreground italic">{activeClient.currentObjectives}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Success Metric:</span>
                          <p className="font-semibold text-accent">{activeClient.successMetrics}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Communication & Internal Notes */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Strategic Account Objectives & Notes
                    </h3>
                    <p className="text-xs text-foreground leading-relaxed">{activeClient.notes}</p>
                  </div>
                </div>
              )}

              {/* TAB 2: ONBOARDING CHECKLIST */}
              {activeTab === 'onboarding' && (
                <div className="max-w-3xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h3 className="text-sm font-bold">RevRecovery Client Onboarding Protocol</h3>
                      <p className="text-xs text-muted-foreground">
                        Standardized operational workflow executed whenever a new prospect is converted to client.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent font-mono">
                      {activeClient.onboardingChecklist.filter((s) => s.completed).length} / {activeClient.onboardingChecklist.length} Completed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeClient.onboardingChecklist.map((step) => (
                      <div
                        key={step.id}
                        onClick={() => toggleOnboardingItem(activeClient.id, step.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          step.completed
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-card border-border hover:border-accent/40'
                        }`}
                      >
                        <div className="mt-0.5">
                          {step.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-semibold text-xs ${
                                step.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              {step.title}
                            </span>
                            {step.completed && step.completedAt && (
                              <span className="text-[10px] text-emerald-500 font-mono">
                                Completed {new Date(step.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CLIENT DISCOVERY QUESTIONNAIRE */}
              {activeTab === 'questionnaire' && (
                <div className="max-w-3xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h3 className="text-sm font-bold">Client Discovery Questionnaire</h3>
                      <p className="text-xs text-muted-foreground">
                        Comprehensive requirements intake documented during sales discovery and client kickoff.
                      </p>
                    </div>
                    {!editingQuestionnaire ? (
                      <button
                        onClick={() => handleOpenQuestionnaire(activeClient)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-medium flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit Responses
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveQuestionnaire}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Changes
                      </button>
                    )}
                  </div>

                  {!editingQuestionnaire ? (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
                          <span className="text-muted-foreground block text-[11px] font-medium mb-1">
                            Target Market
                          </span>
                          <span className="font-semibold text-foreground text-sm">
                            {activeClient.discoveryQuestionnaire?.targetMarket || 'B2B Tech / SaaS'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
                          <span className="text-muted-foreground block text-[11px] font-medium mb-1">
                            Ideal Customer Profile (ICP)
                          </span>
                          <span className="font-semibold text-foreground text-sm">
                            {activeClient.discoveryQuestionnaire?.idealCustomerProfile || 'Founders / CROs of $2M-$50M ARR Tech Companies'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
                        <span className="text-muted-foreground block text-[11px] font-medium mb-1">
                          Target Geographies
                        </span>
                        <span className="text-foreground">
                          {activeClient.discoveryQuestionnaire?.targetGeographies || 'US, Canada, UK'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
                        <span className="text-muted-foreground block text-[11px] font-medium mb-1">
                          Current Sales Acquisition Process & Challenges
                        </span>
                        <p className="text-foreground leading-relaxed">
                          {activeClient.discoveryQuestionnaire?.currentSalesProcess ||
                            'Relying solely on founder networks and inbound referrals. Pipeline is lumpy and unpredictable.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
                          <span className="text-muted-foreground block text-[11px] font-medium mb-1">
                            Monthly Meeting Goal
                          </span>
                          <span className="font-semibold text-accent">
                            {activeClient.discoveryQuestionnaire?.monthlyMeetingGoal || '12-15 qualified calls/month'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
                          <span className="text-muted-foreground block text-[11px] font-medium mb-1">
                            Monthly Budget
                          </span>
                          <span className="font-semibold text-foreground">
                            {activeClient.discoveryQuestionnaire?.monthlyBudget || '$6,500/mo'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
                        <span className="text-muted-foreground block text-[11px] font-medium mb-1">
                          Constraints & Requirements
                        </span>
                        <p className="text-foreground">
                          {activeClient.discoveryQuestionnaire?.constraintsAndRequirements || 'No aggressive spam tactics.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Questionnaire Edit Form */
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Target Market</label>
                        <input
                          type="text"
                          value={qForm.targetMarket || ''}
                          onChange={(e) => setQForm({ ...qForm, targetMarket: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Ideal Customer Profile</label>
                        <input
                          type="text"
                          value={qForm.idealCustomerProfile || ''}
                          onChange={(e) => setQForm({ ...qForm, idealCustomerProfile: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground block mb-1">Current Sales Process</label>
                        <textarea
                          rows={3}
                          value={qForm.currentSalesProcess || ''}
                          onChange={(e) => setQForm({ ...qForm, currentSalesProcess: e.target.value })}
                          className="w-full p-2.5 text-xs bg-background border border-border rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-medium text-muted-foreground block mb-1">Meeting Goal</label>
                          <input
                            type="text"
                            value={qForm.monthlyMeetingGoal || ''}
                            onChange={(e) => setQForm({ ...qForm, monthlyMeetingGoal: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-muted-foreground block mb-1">Monthly Budget</label>
                          <input
                            type="text"
                            value={qForm.monthlyBudget || ''}
                            onChange={(e) => setQForm({ ...qForm, monthlyBudget: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DELIVERY PROJECTS */}
              {activeTab === 'projects' && (
                <div className="max-w-4xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h3 className="text-sm font-bold">Delivery Projects for {activeCompany.name}</h3>
                    <button
                      onClick={() => setActiveModule('projects')}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      Open Project Manager →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {projects
                      .filter((p) => p.clientId === activeClient.id)
                      .map((proj) => (
                        <div key={proj.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{proj.name}</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-accent/15 text-accent font-semibold font-mono">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{proj.description}</p>
                          <div className="space-y-1.5 pt-2 border-t border-border">
                            <span className="text-[11px] font-semibold text-muted-foreground block">Milestones:</span>
                            {proj.milestones.map((m) => (
                              <div key={m.id} className="flex items-center justify-between text-xs py-1">
                                <span className={m.completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
                                  {m.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {m.dueDate}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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

      {/* Modals for Editing and Deleting Clients */}
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
    </div>
  );
};
