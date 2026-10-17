import { create } from 'zustand';
import {
  Company,
  Contact,
  LeadDeal,
  Client,
  Project,
  RevTask,
  Meeting,
  Proposal,
  ContentItem,
  IntegrationConfig,
  AutomationRule,
  TeamMember,
  TeamRole,
  KPITargets,
  RevRecoveryModule,
  LeadStage,
  VerificationStatus,
  IntegrationProvider,
  IntegrationStatus,
  ClientDiscoveryQuestionnaire,
  LeadActivity,
  OutreachSourceConfig,
  CustomModule,
  CustomRecord,
  ClientPortalSettings,
  ClientRole,
  ClientPortalUser,
  normalizeRole,
} from '@/types/revrecovery';
import {
  fetchRevRecoveryData,
  saveEntityToRevDB,
  deleteEntityFromRevDB,
} from '@/lib/revrecoveryStorage';
import { generateId } from '@/lib/utils';

interface RevRecoveryState {
  isInitialized: boolean;
  activeModule: RevRecoveryModule;
  saveStatus: 'saved' | 'saving' | 'error';

  // Selected Entities for Center Peek / Drawer
  selectedCompanyId: string | null;
  selectedLeadId: string | null;
  selectedClientId: string | null;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  selectedMeetingId: string | null;

  // Collections
  companies: Company[];
  contacts: Contact[];
  leads: LeadDeal[];
  clients: Client[];
  clientPortalUsers: ClientPortalUser[];
  projects: Project[];
  tasks: RevTask[];
  meetings: Meeting[];
  proposals: Proposal[];
  contentItems: ContentItem[];
  integrations: IntegrationConfig[];
  automationRules: AutomationRule[];
  teamMembers: TeamMember[];
  kpiTargets: KPITargets;
  activities: LeadActivity[];
  outreachSources: OutreachSourceConfig[];
  customModules: CustomModule[];
  customRecords: CustomRecord[];
  selectedCustomModuleId: string | null;
  selectedCustomRecordId: string | null;

  // Client Portal & Isolated Experience State
  portalClientId: string | null;
  portalClientUser: ClientPortalUser | null;
  isClientPortalMode: boolean;
  portalDateFilter: 'today' | 'week' | 'month' | 'quarter' | 'all';

  // UI Filters
  selectedTeamMemberFilter: string; // 'all' or teamMember name
  dateRangeFilter: 'today' | 'week' | 'month' | 'quarter' | 'all';

  // Navigation Actions
  init: () => Promise<void>;
  setActiveModule: (module: RevRecoveryModule) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setSelectedLeadId: (id: string | null) => void;
  setSelectedClientId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setSelectedMeetingId: (id: string | null) => void;
  setTeamMemberFilter: (filter: string) => void;
  setDateRangeFilter: (range: 'today' | 'week' | 'month' | 'quarter' | 'all') => void;

  // Company Actions
  addCompany: (data: Partial<Company>) => Promise<Company>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  verifyCompany: (
    id: string,
    status: VerificationStatus,
    evidenceUrl: string,
    reason: string,
    reviewer: string
  ) => Promise<void>;

  // Contact Actions
  addContact: (data: Partial<Contact>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  // Lead Actions
  addLead: (data: Partial<LeadDeal>) => Promise<LeadDeal>;
  updateLead: (id: string, updates: Partial<LeadDeal>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  changeLeadStage: (id: string, stage: LeadStage) => Promise<void>;
  convertLeadToClient: (leadId: string) => Promise<Client | null>;

  // Client Actions
  addClient: (data: Partial<Client>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  archiveClient: (id: string) => Promise<void>;
  restoreClient: (id: string) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  toggleOnboardingItem: (clientId: string, itemId: string) => Promise<void>;
  updateDiscoveryQuestionnaire: (
    clientId: string,
    questionnaire: Partial<ClientDiscoveryQuestionnaire>
  ) => Promise<void>;

  // Client Portal & Isolated Experience Actions
  setPortalClientId: (clientId: string | null) => void;
  setPortalClientUser: (user: ClientPortalUser | null) => void;
  setIsClientPortalMode: (mode: boolean) => void;
  setPortalDateFilter: (filter: 'today' | 'week' | 'month' | 'quarter' | 'all') => void;
  inviteClientPortalUser: (clientId: string, data: { email: string; name: string; role?: ClientRole }) => Promise<{ user: ClientPortalUser; inviteLink: string }>;
  updateClientPortalUserRole: (id: string, role: ClientRole) => Promise<void>;
  revokeClientPortalUser: (id: string) => Promise<void>;
  deleteClientPortalUser: (id: string) => Promise<void>;
  updateClientPortalSettings: (clientId: string, settings: Partial<ClientPortalSettings>) => Promise<void>;
  getClientPortalData: (clientId: string, dateFilter?: 'today' | 'week' | 'month' | 'quarter' | 'all') => {
    client: Client | null;
    company: Company | null;
    settings: ClientPortalSettings;
    metrics: {
      leadsGenerated: number;
      outreachSent: number;
      repliesReceived: number;
      qualifiedProspects: number;
      meetingsBooked: number;
      meetingsCompleted: number;
      conversions: number;
      conversionRate: number;
    };
    leads: LeadDeal[];
    meetings: Meeting[];
    projects: Project[];
    activities: LeadActivity[];
    sharedDocuments: Array<{ id: string; title: string; type: string; url?: string; updatedAt: number }>;
  };

  // Project Actions
  addProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>;

  // Task Actions
  addTask: (data: Partial<RevTask>) => Promise<RevTask>;
  updateTask: (id: string, updates: Partial<RevTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  // Meeting Actions
  addMeeting: (data: Partial<Meeting>) => Promise<Meeting>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  convertActionItemToTask: (meetingId: string, actionItemId: string) => Promise<RevTask | null>;

  // Proposal Actions
  addProposal: (data: Partial<Proposal>) => Promise<Proposal>;
  updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;

  // Content Actions
  addContentItem: (data: Partial<ContentItem>) => Promise<ContentItem>;
  updateContentItem: (id: string, updates: Partial<ContentItem>) => Promise<void>;
  deleteContentItem: (id: string) => Promise<void>;

  // Integration Actions
  updateIntegration: (
    provider: IntegrationProvider,
    status: IntegrationStatus,
    config?: Record<string, string>,
    errorMessage?: string
  ) => Promise<void>;

  // Automation Actions
  toggleAutomation: (id: string) => Promise<void>;

  // Team Member Management Actions
  inviteTeamMember: (data: { email: string; role: TeamRole; name?: string; title?: string }) => Promise<{ member: TeamMember; inviteLink: string }>;
  updateTeamMemberRole: (id: string, role: TeamRole) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  resendInvitation: (id: string) => Promise<{ inviteLink: string }>;
  cancelInvitation: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<TeamMember>) => Promise<TeamMember | undefined>;

  // Activity Tracking Actions
  logActivity: (activity: Omit<LeadActivity, 'id' | 'createdAt'>) => Promise<LeadActivity>;
  deleteActivity: (id: string) => Promise<void>;

  // Outreach Sources Management Actions
  addOutreachSource: (data: Omit<OutreachSourceConfig, 'id'>) => Promise<OutreachSourceConfig>;
  updateOutreachSource: (id: string, updates: Partial<OutreachSourceConfig>) => Promise<void>;
  deleteOutreachSource: (id: string) => Promise<void>;

  // Custom Operating Modules Actions
  setSelectedCustomModuleId: (id: string | null) => void;
  setSelectedCustomRecordId: (id: string | null) => void;
  addCustomModule: (data: Omit<CustomModule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CustomModule>;
  updateCustomModule: (id: string, updates: Partial<CustomModule>) => Promise<void>;
  deleteCustomModule: (id: string) => Promise<void>;
  duplicateCustomModule: (id: string) => Promise<CustomModule>;
  addCustomRecord: (data: Omit<CustomRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CustomRecord>;
  updateCustomRecord: (id: string, updates: Partial<CustomRecord>) => Promise<void>;
  deleteCustomRecord: (id: string) => Promise<void>;
  archiveCustomRecord: (id: string) => Promise<void>;

  // CSV Import / Export
  importLeadsFromCSV: (csvText: string) => { imported: number; duplicates: number; errors: string[] };
  exportLeadsToCSV: () => string;
}

export const useRevRecoveryStore = create<RevRecoveryState>((set, get) => ({
  isInitialized: false,
  activeModule: 'hq',
  saveStatus: 'saved',

  selectedCompanyId: null,
  selectedLeadId: null,
  selectedClientId: null,
  selectedProjectId: null,
  selectedTaskId: null,
  selectedMeetingId: null,

  companies: [],
  contacts: [],
  leads: [],
  clients: [],
  clientPortalUsers: [],
  projects: [],
  tasks: [],
  meetings: [],
  proposals: [],
  contentItems: [],
  integrations: [],
  automationRules: [],
  teamMembers: [],
  kpiTargets: {
    period: 'Q4 2026',
    targetCompaniesResearched: 0,
    targetLeadsVerified: 0,
    targetOutreachSent: 0,
    targetMeetingsBooked: 0,
    targetDealsWon: 0,
    targetRevenue: 0,
  },
  activities: [],
  outreachSources: [],
  customModules: [],
  customRecords: [],
  selectedCustomModuleId: null,
  selectedCustomRecordId: null,

  // Client Portal & Isolated Experience State
  portalClientId: null,
  portalClientUser: null,
  isClientPortalMode: false,
  portalDateFilter: 'all',

  selectedTeamMemberFilter: 'all',
  dateRangeFilter: 'all',

  init: async () => {
    if (get().isInitialized) return;
    try {
      const data = await fetchRevRecoveryData();
      set({
        isInitialized: true,
        companies: data.companies,
        contacts: data.contacts,
        leads: data.leads,
        clients: data.clients,
        clientPortalUsers: data.clientPortalUsers || [],
        projects: data.projects,
        tasks: data.tasks,
        meetings: data.meetings,
        proposals: data.proposals,
        contentItems: data.contentItems,
        integrations: data.integrations,
        automationRules: data.automationRules,
        teamMembers: (data.teamMembers || []).map((m) =>
          m.name === 'Sanskar Anand' || m.id === 'team-sanskar'
            ? { ...m, avatarUrl: '/avatars/sanskar-anand.jpg' }
            : m
        ),
        kpiTargets: data.kpiTargets,
        activities: data.activities || [],
        outreachSources: data.outreachSources || [],
        customModules: data.customModules || [],
        customRecords: data.customRecords || [],
      });
    } catch (err) {
      console.error('Failed to init RevRecovery store', err);
      set({ isInitialized: true, saveStatus: 'error' });
    }
  },

  setActiveModule: (module) => set({ activeModule: module }),
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
  setSelectedClientId: (id) => set({ selectedClientId: id }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedMeetingId: (id) => set({ selectedMeetingId: id }),
  setTeamMemberFilter: (filter) => set({ selectedTeamMemberFilter: filter }),
  setDateRangeFilter: (range) => set({ dateRangeFilter: range }),
  setPortalClientId: (clientId) => set({ portalClientId: clientId }),
  setPortalClientUser: (user) =>
    set({
      portalClientUser: user,
      isClientPortalMode: !!user,
      portalClientId: user ? user.clientId : get().portalClientId,
    }),
  setIsClientPortalMode: (mode) => set({ isClientPortalMode: mode }),
  setPortalDateFilter: (filter) => set({ portalDateFilter: filter }),

  // Company Actions
  addCompany: async (data) => {
    const newCompany: Company = {
      id: generateId(),
      name: data.name || 'Untitled Company',
      website: data.website || '',
      linkedinUrl: data.linkedinUrl || '',
      industry: data.industry || 'B2B Tech',
      country: data.country || 'United States',
      city: data.city || '',
      size: data.size || '11-50',
      type: data.type || 'B2B SaaS',
      servicesOffered: data.servicesOffered || '',
      icpCriteria: data.icpCriteria || '',
      icpMatchStatus: data.icpMatchStatus || 'unreviewed',
      researchSource: data.researchSource || 'Manual Research',
      verificationStatus: data.verificationStatus || 'Pending',
      assignedResearcher: data.assignedResearcher || 'Elena Rostova',
      notes: data.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newCompany, ...get().companies];
    set({ companies: updated });
    await saveEntityToRevDB('companies', newCompany);
    return newCompany;
  },

  updateCompany: async (id, updates) => {
    const updated = get().companies.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    set({ companies: updated });
    const target = updated.find((c) => c.id === id);
    if (target) await saveEntityToRevDB('companies', target);
  },

  deleteCompany: async (id) => {
    const updated = get().companies.filter((c) => c.id !== id);
    set({ companies: updated });
    await deleteEntityFromRevDB('companies', id);
  },

  verifyCompany: async (id, status, evidenceUrl, reason, reviewer) => {
    const target = get().companies.find((c) => c.id === id);
    if (!target) return;

    const updates: Partial<Company> = {
      verificationStatus: status,
      verificationEvidenceUrl: evidenceUrl,
      verificationReason: reason,
      verifiedBy: reviewer,
      icpMatchStatus: status === 'Verified' ? 'matched' : status === 'Rejected' ? 'unmatched' : 'partial',
    };

    await get().updateCompany(id, updates);

    // If verified, automatically update corresponding lead stage to 'Verified' if it was in verification stage
    if (status === 'Verified') {
      const relatedLead = get().leads.find((l) => l.companyId === id);
      if (relatedLead && (relatedLead.stage === 'Awaiting Verification' || relatedLead.stage === 'Researching' || relatedLead.stage === 'New')) {
        await get().changeLeadStage(relatedLead.id, 'Verified');
      }
    }
  },

  // Contact Actions
  addContact: async (data) => {
    const newContact: Contact = {
      id: generateId(),
      companyId: data.companyId || '',
      name: data.name || 'Untitled Contact',
      title: data.title || 'Decision Maker',
      email: data.email || '',
      linkedinUrl: data.linkedinUrl || '',
      phone: data.phone || '',
      source: data.source || 'LinkedIn',
      verificationStatus: data.verificationStatus || 'Pending',
      assignedOwner: data.assignedOwner || 'Marcus Vance',
      notes: data.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newContact, ...get().contacts];
    set({ contacts: updated });
    await saveEntityToRevDB('contacts', newContact);
    return newContact;
  },

  updateContact: async (id, updates) => {
    const updated = get().contacts.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    set({ contacts: updated });
    const target = updated.find((c) => c.id === id);
    if (target) await saveEntityToRevDB('contacts', target);
  },

  deleteContact: async (id) => {
    const updated = get().contacts.filter((c) => c.id !== id);
    set({ contacts: updated });
    await deleteEntityFromRevDB('contacts', id);
  },

  // Lead Actions
  addLead: async (data) => {
    const newLead: LeadDeal = {
      id: generateId(),
      companyId: data.companyId || '',
      clientId: data.clientId,
      primaryContactId: data.primaryContactId,
      title: data.title || 'New Outbound Opportunity',
      stage: data.stage || 'New',
      value: data.value || 5000,
      currency: data.currency || 'USD',
      assignedTo: data.assignedTo || 'Sanskar Anand',
      nextFollowUpDate: data.nextFollowUpDate || new Date().toISOString().split('T')[0],
      outreachChannel: data.outreachChannel || 'Email',
      outreachSource: data.outreachSource || 'LinkedIn',
      campaignName: data.campaignName || 'Q4 Outbound Campaign',
      connectionStatus: data.connectionStatus || 'Not Sent',
      messageStatus: data.messageStatus || 'Not Contacted',
      expectedValue: data.expectedValue || (data.value ? data.value * 0.3 : 1500),
      notes: data.notes || '',
      customFields: data.customFields || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newLead, ...get().leads];
    set({ leads: updated });
    await saveEntityToRevDB('leads', newLead);
    return newLead;
  },

  updateLead: async (id, updates) => {
    const updated = get().leads.map((l) =>
      l.id === id ? { ...l, ...updates, updatedAt: Date.now() } : l
    );
    set({ leads: updated });
    const target = updated.find((l) => l.id === id);
    if (target) await saveEntityToRevDB('leads', target);
  },

  deleteLead: async (id) => {
    const updated = get().leads.filter((l) => l.id !== id);
    set({ leads: updated });
    await deleteEntityFromRevDB('leads', id);
  },

  changeLeadStage: async (id, stage) => {
    const lead = get().leads.find((l) => l.id === id);
    if (!lead) return;

    await get().updateLead(id, { stage });

    // Automation rule: if converted to Won, trigger lead conversion
    if (stage === 'Won') {
      await get().convertLeadToClient(id);
    }
  },

  convertLeadToClient: async (leadId) => {
    const lead = get().leads.find((l) => l.id === leadId);
    if (!lead) return null;

    const company = get().companies.find((c) => c.id === lead.companyId);
    if (!company) return null;

    // Check if client already exists for this company (avoid duplicate client creation)
    const existingClient = get().clients.find((cl) => cl.companyId === company.id);
    if (existingClient) {
      return existingClient;
    }

    const newClient: Client = {
      id: generateId(),
      companyId: company.id,
      primaryContactId: lead.primaryContactId,
      servicesPurchased: ['Lead Research & Verification', 'Outbound Outreach', 'Discovery Call Booking'],
      commercialTerms: `$${lead.value.toLocaleString()}/mo retainer commitment`,
      contractStatus: 'Active',
      monthlyValue: lead.value,
      startDate: new Date().toISOString().split('T')[0],
      renewalDate: new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
      accountOwner: lead.assignedTo || 'Sarah Jenkins',
      currentObjectives: `Deliver qualified discovery calls for ${company.name}`,
      successMetrics: 'Minimum 15 verified meetings/month with 85%+ ICP accuracy.',
      onboardingChecklist: [
        { id: generateId(), title: 'Prospect converted to client record', completed: true, completedAt: Date.now() },
        { id: generateId(), title: 'Onboarding checklist created & assigned', completed: true, completedAt: Date.now() },
        { id: generateId(), title: 'Client requirements collected via discovery form', completed: false },
        { id: generateId(), title: 'ICP and target audience criteria documented', completed: false },
        { id: generateId(), title: 'Offer, pricing, and campaign objectives recorded', completed: false },
        { id: generateId(), title: 'Required email domain & tool access tracked', completed: false },
        { id: generateId(), title: 'Delivery project created in RevRecovery OS', completed: false },
        { id: generateId(), title: 'Kickoff meeting scheduled with account owner', completed: false },
        { id: generateId(), title: 'First batch of 250 verified leads approved', completed: false },
        { id: generateId(), title: 'Client marked Ready for Outbound Launch', completed: false },
      ],
      discoveryQuestionnaire: {
        targetMarket: `${company.industry} Mid-Market`,
        idealCustomerProfile: company.icpCriteria || 'B2B tech decision makers',
        targetGeographies: company.country || 'United States',
        dealSizeAverage: `$${lead.value.toLocaleString()}`,
        currentSalesProcess: 'Outbound pipeline expansion',
        monthlyMeetingGoal: '15 qualified calls/month',
        monthlyBudget: `$${lead.value.toLocaleString()}`,
        constraintsAndRequirements: 'Strict ICP verification required before outreach.',
      },
      notes: `Converted from Lead: ${lead.title}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedClients = [newClient, ...get().clients];
    set({ clients: updatedClients });
    await saveEntityToRevDB('clients', newClient);

    // Also create initial delivery Project for client
    const newProject: Project = {
      id: generateId(),
      name: `${company.name} Client Delivery & Growth Sprint`,
      description: `B2B lead generation and meeting acquisition sprint for ${company.name}`,
      clientId: newClient.id,
      owner: newClient.accountOwner,
      teamMembers: [newClient.accountOwner, 'Elena Rostova', 'Marcus Vance'],
      status: 'Active',
      priority: 'High',
      startDate: newClient.startDate,
      targetDate: newClient.renewalDate,
      milestones: [
        { id: generateId(), title: 'Complete Client Onboarding Questionnaire', dueDate: newClient.startDate, completed: false },
        { id: generateId(), title: 'Research & Verify First 250 ICP Accounts', dueDate: newClient.startDate, completed: false },
        { id: generateId(), title: 'Deploy Multi-Channel Outreach Sequence', dueDate: newClient.startDate, completed: false },
        { id: generateId(), title: 'Deliver 15 Qualified Discovery Meetings', dueDate: newClient.renewalDate, completed: false },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedProjects = [newProject, ...get().projects];
    set({ projects: updatedProjects });
    await saveEntityToRevDB('projects', newProject);

    return newClient;
  },

  // Client Actions
  addClient: async (data) => {
    const newClient: Client = {
      id: generateId(),
      companyId: data.companyId || '',
      primaryContactId: data.primaryContactId,
      servicesPurchased: data.servicesPurchased || ['Lead Research', 'Outbound Outreach'],
      commercialTerms: data.commercialTerms || '$5,000/mo retainer',
      contractStatus: data.contractStatus || 'Active',
      monthlyValue: data.monthlyValue || 5000,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      renewalDate: data.renewalDate || new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
      accountOwner: data.accountOwner || 'Sarah Jenkins',
      currentObjectives: data.currentObjectives || '',
      successMetrics: data.successMetrics || '',
      onboardingChecklist: data.onboardingChecklist || [
        { id: generateId(), title: 'Prospect converted to client record', completed: true, completedAt: Date.now() },
        { id: generateId(), title: 'Onboarding checklist created & assigned', completed: true, completedAt: Date.now() },
        { id: generateId(), title: 'Client requirements collected via discovery form', completed: false },
        { id: generateId(), title: 'ICP and target audience criteria documented', completed: false },
        { id: generateId(), title: 'Offer, pricing, and campaign objectives recorded', completed: false },
        { id: generateId(), title: 'Required email domain & tool access tracked', completed: false },
        { id: generateId(), title: 'Delivery project created in RevRecovery OS', completed: false },
        { id: generateId(), title: 'Kickoff meeting scheduled with account owner', completed: false },
        { id: generateId(), title: 'First batch of 250 verified leads approved', completed: false },
        { id: generateId(), title: 'Client marked Ready for Outbound Launch', completed: false },
      ],
      discoveryQuestionnaire: data.discoveryQuestionnaire || {
        targetMarket: '',
        idealCustomerProfile: '',
        targetGeographies: '',
        dealSizeAverage: '',
        currentSalesProcess: '',
        monthlyMeetingGoal: '15 qualified calls/month',
        monthlyBudget: '$5,000',
        constraintsAndRequirements: '',
      },
      notes: data.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newClient, ...get().clients];
    set({ clients: updated });
    await saveEntityToRevDB('clients', newClient);
    return newClient;
  },

  updateClient: async (id, updates) => {
    const updated = get().clients.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    set({ clients: updated });
    const target = updated.find((c) => c.id === id);
    if (target) await saveEntityToRevDB('clients', target);
  },

  archiveClient: async (id) => {
    const target = get().clients.find((c) => c.id === id);
    if (!target) return;
    const updated = get().clients.map((c) =>
      c.id === id ? { ...c, archived: true, updatedAt: Date.now() } : c
    );
    set({ clients: updated });
    const saved = updated.find((c) => c.id === id);
    if (saved) await saveEntityToRevDB('clients', saved);
  },

  restoreClient: async (id) => {
    const target = get().clients.find((c) => c.id === id);
    if (!target) return;
    const updated = get().clients.map((c) =>
      c.id === id ? { ...c, archived: false, updatedAt: Date.now() } : c
    );
    set({ clients: updated });
    const saved = updated.find((c) => c.id === id);
    if (saved) await saveEntityToRevDB('clients', saved);
  },

  deleteClient: async (id) => {
    const updated = get().clients.filter((c) => c.id !== id);
    set({
      clients: updated,
      selectedClientId: get().selectedClientId === id ? null : get().selectedClientId,
    });
    await deleteEntityFromRevDB('clients', id);
  },

  toggleOnboardingItem: async (clientId, itemId) => {
    const client = get().clients.find((c) => c.id === clientId);
    if (!client) return;

    const updatedChecklist = client.onboardingChecklist.map((item) =>
      item.id === itemId
        ? { ...item, completed: !item.completed, completedAt: !item.completed ? Date.now() : undefined }
        : item
    );

    await get().updateClient(clientId, { onboardingChecklist: updatedChecklist });
  },

  updateDiscoveryQuestionnaire: async (clientId, questionnaire) => {
    const client = get().clients.find((c) => c.id === clientId);
    if (!client) return;

    const updatedQ = {
      ...client.discoveryQuestionnaire,
      ...questionnaire,
    };

    await get().updateClient(clientId, { discoveryQuestionnaire: updatedQ });
  },

  // Client Portal & Isolated Experience Actions
  inviteClientPortalUser: async (clientId, data) => {
    const client = get().clients.find((c) => c.id === clientId);
    const company = client ? get().companies.find((comp) => comp.id === client.companyId) : null;
    const clientName = company?.name || 'Client';

    const newUser: ClientPortalUser = {
      id: generateId(),
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      clientId,
      clientName,
      role: data.role || 'client_admin',
      status: 'active',
      invitedBy: 'Sanskar Anand',
      invitedAt: Date.now(),
      createdAt: Date.now(),
    };

    const updatedUsers = [newUser, ...get().clientPortalUsers];
    set({ clientPortalUsers: updatedUsers });
    await saveEntityToRevDB('clientPortalUsers', newUser);

    if (client) {
      const existingUserIds = client.portalUserIds || [];
      if (!existingUserIds.includes(newUser.id)) {
        await get().updateClient(clientId, {
          portalUserIds: [...existingUserIds, newUser.id],
        });
      }
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const inviteLink = `${origin}/?portalClientId=${clientId}&portalEmail=${encodeURIComponent(newUser.email)}`;
    return { user: newUser, inviteLink };
  },

  updateClientPortalUserRole: async (id, role) => {
    const updated = get().clientPortalUsers.map((u) =>
      u.id === id ? { ...u, role } : u
    );
    set({ clientPortalUsers: updated });
    const target = updated.find((u) => u.id === id);
    if (target) await saveEntityToRevDB('clientPortalUsers', target);
  },

  revokeClientPortalUser: async (id) => {
    const updated = get().clientPortalUsers.map((u) =>
      u.id === id ? { ...u, status: 'revoked' as const } : u
    );
    set({ clientPortalUsers: updated });
    const target = updated.find((u) => u.id === id);
    if (target) await saveEntityToRevDB('clientPortalUsers', target);
  },

  deleteClientPortalUser: async (id) => {
    const user = get().clientPortalUsers.find((u) => u.id === id);
    const updated = get().clientPortalUsers.filter((u) => u.id !== id);
    set({ clientPortalUsers: updated });
    await deleteEntityFromRevDB('clientPortalUsers', id);

    if (user?.clientId) {
      const client = get().clients.find((c) => c.id === user.clientId);
      if (client?.portalUserIds) {
        await get().updateClient(client.id, {
          portalUserIds: client.portalUserIds.filter((uid) => uid !== id),
        });
      }
    }
  },

  updateClientPortalSettings: async (clientId, settings) => {
    const client = get().clients.find((c) => c.id === clientId);
    if (!client) return;

    const currentSettings: ClientPortalSettings = client.portalSettings || {
      enabled: true,
      allowedMetrics: ['leads', 'outreach', 'replies', 'qualified', 'meetings', 'conversions'],
      allowedTabs: ['overview', 'campaigns', 'meetings', 'projects', 'documents'],
      kpiTargets: {},
      sharedDocIds: [],
    };

    const updatedSettings: ClientPortalSettings = {
      ...currentSettings,
      ...settings,
      kpiTargets: {
        ...currentSettings.kpiTargets,
        ...(settings.kpiTargets || {}),
      },
    };

    await get().updateClient(clientId, { portalSettings: updatedSettings });
  },

  getClientPortalData: (clientId, dateFilter = 'all') => {
    const client = get().clients.find((c) => c.id === clientId) || null;
    const company = client ? get().companies.find((comp) => comp.id === client.companyId) || null : null;

    const defaultSettings: ClientPortalSettings = {
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
    };

    const settings: ClientPortalSettings = client?.portalSettings || defaultSettings;

    // Date filtering helper
    const now = Date.now();
    const isWithinDate = (timestamp: number | string | undefined): boolean => {
      if (!timestamp) return false;
      const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
      if (isNaN(time)) return false;
      if (dateFilter === 'all') return true;
      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return time >= today.getTime();
      }
      if (dateFilter === 'week') return time >= now - 7 * 86400000;
      if (dateFilter === 'month') return time >= now - 30 * 86400000;
      if (dateFilter === 'quarter') return time >= now - 90 * 86400000;
      return true;
    };

    // Client-isolated leads (internal notes sanitized)
    const rawLeads = get().leads.filter(
      (l) => (l.clientId === clientId || (client?.companyId && l.companyId === client.companyId)) && isWithinDate(l.createdAt || l.nextFollowUpDate)
    );
    const isolatedLeads: LeadDeal[] = rawLeads.map((l) => ({
      ...l,
      notes: '', // Strictly hide internal notes
      customFields: {},
    }));

    // Client-isolated activities (internal notes sanitized)
    const rawActivities = get().activities.filter(
      (a) => (a.clientId === clientId || (client?.companyId && a.companyId === client.companyId)) && isWithinDate(a.createdAt)
    );
    const isolatedActivities: LeadActivity[] = rawActivities.map((a) => ({
      ...a,
      notes: undefined, // Strictly hide internal notes
      metadata: undefined,
    }));

    // Client-isolated meetings (internal notes sanitized)
    const rawMeetings = get().meetings.filter(
      (m) => (m.relatedClientId === clientId || (client?.companyId && m.relatedCompanyId === client.companyId)) && isWithinDate(m.date)
    );
    const isolatedMeetings: Meeting[] = rawMeetings.map((m) => ({
      ...m,
      notes: '', // Strictly hide internal notes
      decisions: '',
      actionItems: (m.actionItems || []).map((ai) => ({ ...ai })),
    }));

    // Client-isolated delivery projects (team internal tasks strictly omitted)
    const rawProjects = get().projects.filter((p) => p.clientId === clientId);
    const isolatedProjects: Project[] = rawProjects.map((p) => ({
      ...p,
    }));

    // Metrics calculations from real stored records
    const outreachFromActivities = rawActivities.filter(
      (a) => a.type === 'message_sent' || a.type === 'connection_request_sent'
    ).length;
    const outreachFromLeads = rawLeads.filter(
      (l) => l.connectionStatus === 'Sent' || l.connectionStatus === 'Accepted' || l.messageStatus === 'Sent' || l.messageStatus === 'Replied'
    ).length;
    const outreachSent = Math.max(outreachFromActivities, outreachFromLeads);

    const repliesFromActivities = rawActivities.filter(
      (a) => a.type === 'reply_received' || a.type === 'positive_reply'
    ).length;
    const repliesFromLeads = rawLeads.filter(
      (l) => l.messageStatus === 'Replied' || l.isPositiveReply || Boolean(l.lastReplyDate)
    ).length;
    const repliesReceived = Math.max(repliesFromActivities, repliesFromLeads);

    const leadsGenerated = rawLeads.length;

    const qualifiedProspects = rawLeads.filter((l) =>
      ['Qualified', 'Interested', 'Meeting Booked', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage)
    ).length;

    const meetingsBookedFromList = rawMeetings.filter((m) => m.outcome === 'Scheduled' || m.outcome === 'Completed').length;
    const meetingsBookedFromLeads = rawLeads.filter((l) => l.meetingStatus === 'Booked' || l.meetingStatus === 'Completed' || l.stage === 'Meeting Booked' || l.stage === 'Meeting Completed').length;
    const meetingsBooked = Math.max(meetingsBookedFromList, meetingsBookedFromLeads);

    const meetingsCompletedFromList = rawMeetings.filter((m) => m.outcome === 'Completed').length;
    const meetingsCompletedFromLeads = rawLeads.filter((l) => l.meetingStatus === 'Completed' || l.stage === 'Meeting Completed').length;
    const meetingsCompleted = Math.max(meetingsCompletedFromList, meetingsCompletedFromLeads);

    const conversions = rawLeads.filter((l) => l.stage === 'Won' || l.dealStatus === 'Won').length;

    const conversionRate = leadsGenerated > 0 ? Number(((conversions / leadsGenerated) * 100).toFixed(1)) : 0;

    // Shared documents
    const sharedDocuments = [
      {
        id: 'doc-kickoff',
        title: `${company?.name || 'Client'} Outbound Campaign Strategy & Protocol`,
        type: 'Strategy Deck',
        updatedAt: client?.createdAt || Date.now(),
      },
      {
        id: 'doc-icp',
        title: 'Ideal Customer Profile (ICP) & Targeting Criteria',
        type: 'Specification',
        updatedAt: client?.updatedAt || Date.now(),
      },
      {
        id: 'doc-report-latest',
        title: 'Monthly Campaign Performance & Meeting Attribution Summary',
        type: 'Executive Report',
        updatedAt: Date.now() - 86400000 * 2,
      },
    ];

    return {
      client,
      company,
      settings,
      metrics: {
        leadsGenerated,
        outreachSent,
        repliesReceived,
        qualifiedProspects,
        meetingsBooked,
        meetingsCompleted,
        conversions,
        conversionRate,
      },
      leads: isolatedLeads,
      meetings: isolatedMeetings,
      projects: isolatedProjects,
      activities: isolatedActivities,
      sharedDocuments,
    };
  },

  // Project Actions
  addProject: async (data) => {
    const newProject: Project = {
      id: generateId(),
      name: data.name || 'New Client Growth Project',
      description: data.description || '',
      clientId: data.clientId,
      owner: data.owner || 'Sarah Jenkins',
      teamMembers: data.teamMembers || ['Sarah Jenkins', 'Elena Rostova'],
      status: data.status || 'Active',
      priority: data.priority || 'Medium',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      targetDate: data.targetDate || new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
      milestones: data.milestones || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newProject, ...get().projects];
    set({ projects: updated });
    await saveEntityToRevDB('projects', newProject);
    return newProject;
  },

  updateProject: async (id, updates) => {
    const updated = get().projects.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    set({ projects: updated });
    const target = updated.find((p) => p.id === id);
    if (target) await saveEntityToRevDB('projects', target);
  },

  deleteProject: async (id) => {
    const updated = get().projects.filter((p) => p.id !== id);
    set({ projects: updated });
    await deleteEntityFromRevDB('projects', id);
  },

  toggleMilestone: async (projectId, milestoneId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;

    const updatedMilestones = project.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );

    await get().updateProject(projectId, { milestones: updatedMilestones });
  },

  // Task Actions
  addTask: async (data) => {
    const newTask: RevTask = {
      id: generateId(),
      title: data.title || 'Untitled Task',
      description: data.description || '',
      status: data.status || 'Todo',
      priority: data.priority || 'Medium',
      assignedTo: data.assignedTo || 'Sanskar Anand',
      creator: data.creator || 'Sanskar Anand',
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      relatedProjectId: data.relatedProjectId,
      relatedClientId: data.relatedClientId,
      relatedCompanyId: data.relatedCompanyId,
      relatedMeetingId: data.relatedMeetingId,
      labels: data.labels || [],
      subtasks: data.subtasks || [],
      completedAt: data.status === 'Done' ? Date.now() : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newTask, ...get().tasks];
    set({ tasks: updated });
    await saveEntityToRevDB('tasks', newTask);
    return newTask;
  },

  updateTask: async (id, updates) => {
    const updated = get().tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            ...updates,
            completedAt: updates.status === 'Done' ? Date.now() : updates.status ? undefined : t.completedAt,
            updatedAt: Date.now(),
          }
        : t
    );
    set({ tasks: updated });
    const target = updated.find((t) => t.id === id);
    if (target) await saveEntityToRevDB('tasks', target);
  },

  deleteTask: async (id) => {
    const updated = get().tasks.filter((t) => t.id !== id);
    set({ tasks: updated });
    await deleteEntityFromRevDB('tasks', id);
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
    await get().updateTask(taskId, {
      subtasks: updatedSubtasks,
      status: allCompleted ? 'Done' : task.status === 'Done' ? 'In Progress' : task.status,
    });
  },

  // Meeting Actions
  addMeeting: async (data) => {
    const newMeeting: Meeting = {
      id: generateId(),
      title: data.title || 'Untitled Meeting',
      type: data.type || 'Sales Discovery',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '14:00 EST',
      durationMinutes: data.durationMinutes || 30,
      attendees: data.attendees || ['Sanskar Anand'],
      relatedCompanyId: data.relatedCompanyId,
      relatedClientId: data.relatedClientId,
      relatedProjectId: data.relatedProjectId,
      agenda: data.agenda || '',
      notes: data.notes || '',
      decisions: data.decisions || '',
      actionItems: data.actionItems || [],
      outcome: data.outcome || 'Scheduled',
      followUpDate: data.followUpDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newMeeting, ...get().meetings];
    set({ meetings: updated });
    await saveEntityToRevDB('meetings', newMeeting);
    return newMeeting;
  },

  updateMeeting: async (id, updates) => {
    const updated = get().meetings.map((m) =>
      m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
    );
    set({ meetings: updated });
    const target = updated.find((m) => m.id === id);
    if (target) await saveEntityToRevDB('meetings', target);
  },

  deleteMeeting: async (id) => {
    const updated = get().meetings.filter((m) => m.id !== id);
    set({ meetings: updated });
    await deleteEntityFromRevDB('meetings', id);
  },

  convertActionItemToTask: async (meetingId, actionItemId) => {
    const meeting = get().meetings.find((m) => m.id === meetingId);
    if (!meeting) return null;

    const actionItem = meeting.actionItems.find((ai) => ai.id === actionItemId);
    if (!actionItem) return null;

    // Create real Task linked to this meeting
    const newTask = await get().addTask({
      title: actionItem.title,
      description: `Action item created from meeting: "${meeting.title}" on ${meeting.date}`,
      assignedTo: actionItem.assignedTo,
      dueDate: actionItem.dueDate,
      priority: 'High',
      relatedMeetingId: meetingId,
      relatedCompanyId: meeting.relatedCompanyId,
      relatedClientId: meeting.relatedClientId,
      relatedProjectId: meeting.relatedProjectId,
      labels: ['Meeting Action Item', meeting.type],
    });

    // Mark action item as converted
    const updatedActionItems = meeting.actionItems.map((ai) =>
      ai.id === actionItemId ? { ...ai, convertedToTaskId: newTask.id } : ai
    );
    await get().updateMeeting(meetingId, { actionItems: updatedActionItems });

    return newTask;
  },

  // Proposal Actions
  addProposal: async (data) => {
    const newProposal: Proposal = {
      id: generateId(),
      companyId: data.companyId || '',
      contactId: data.contactId,
      meetingId: data.meetingId,
      title: data.title || 'Growth Proposal',
      amount: data.amount || 5000,
      currency: data.currency || 'USD',
      status: data.status || 'Draft',
      sentDate: data.sentDate,
      expectedDecisionDate: data.expectedDecisionDate,
      nextAction: data.nextAction || 'Follow up with decision-maker',
      notes: data.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newProposal, ...get().proposals];
    set({ proposals: updated });
    await saveEntityToRevDB('proposals', newProposal);
    return newProposal;
  },

  updateProposal: async (id, updates) => {
    const updated = get().proposals.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    set({ proposals: updated });
    const target = updated.find((p) => p.id === id);
    if (target) await saveEntityToRevDB('proposals', target);
  },

  deleteProposal: async (id) => {
    const updated = get().proposals.filter((p) => p.id !== id);
    set({ proposals: updated });
    await deleteEntityFromRevDB('proposals', id);
  },

  // Content Actions
  addContentItem: async (data) => {
    const newItem: ContentItem = {
      id: generateId(),
      title: data.title || 'Untitled Content',
      channel: data.channel || 'LinkedIn',
      type: data.type || 'Post',
      topicOrCampaign: data.topicOrCampaign || 'Lead Generation',
      targetAudience: data.targetAudience || 'B2B Tech Founders',
      draft: data.draft || '',
      owner: data.owner || 'Sanskar Anand',
      status: data.status || 'Draft',
      plannedDate: data.plannedDate || new Date().toISOString().split('T')[0],
      publishedUrl: data.publishedUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newItem, ...get().contentItems];
    set({ contentItems: updated });
    await saveEntityToRevDB('contentItems', newItem);
    return newItem;
  },

  updateContentItem: async (id, updates) => {
    const updated = get().contentItems.map((ci) =>
      ci.id === id ? { ...ci, ...updates, updatedAt: Date.now() } : ci
    );
    set({ contentItems: updated });
    const target = updated.find((ci) => ci.id === id);
    if (target) await saveEntityToRevDB('contentItems', target);
  },

  deleteContentItem: async (id) => {
    const updated = get().contentItems.filter((ci) => ci.id !== id);
    set({ contentItems: updated });
    await deleteEntityFromRevDB('contentItems', id);
  },

  // Integration Actions
  updateIntegration: async (provider, status, config, errorMessage) => {
    const updated = get().integrations.map((i) =>
      i.provider === provider
        ? {
            ...i,
            status,
            config: config || i.config,
            errorMessage,
            lastSyncAt: status === 'Connected' ? Date.now() : i.lastSyncAt,
          }
        : i
    );
    set({ integrations: updated });
    const target = updated.find((i) => i.provider === provider);
    if (target) await saveEntityToRevDB('integrations', target);
  },

  // Automation Actions
  toggleAutomation: async (id) => {
    const updated = get().automationRules.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    set({ automationRules: updated });
    const target = updated.find((a) => a.id === id);
    if (target) await saveEntityToRevDB('automationRules', target);
  },

  // CSV Import / Export
  importLeadsFromCSV: (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return { imported: 0, duplicates: 0, errors: ['CSV contains no data rows'] };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    let imported = 0;
    let duplicates = 0;
    const errors: string[] = [];

    const companyIndex = headers.findIndex((h) => h.includes('company'));
    const websiteIndex = headers.findIndex((h) => h.includes('website') || h.includes('url'));
    const contactIndex = headers.findIndex((h) => h.includes('contact') || h.includes('name'));
    const emailIndex = headers.findIndex((h) => h.includes('email'));
    const titleIndex = headers.findIndex((h) => h.includes('title'));
    const industryIndex = headers.findIndex((h) => h.includes('industry'));

    if (companyIndex === -1) {
      return { imported: 0, duplicates: 0, errors: ['Missing required column: "Company"'] };
    }

    const existingWebsites = new Set(get().companies.map((c) => c.website.toLowerCase().replace(/https?:\/\/(www\.)?/, '')));
    const existingEmails = new Set(get().contacts.map((c) => c.email.toLowerCase()));

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
      if (row.length === 0 || !row[companyIndex]) {
        errors.push(`Row ${i + 1}: Missing required Company Name`);
        continue;
      }

      const compName = row[companyIndex];
      const website = websiteIndex !== -1 ? row[websiteIndex] : '';
      const contactName = contactIndex !== -1 ? row[contactIndex] : '';
      const email = emailIndex !== -1 ? row[emailIndex] : '';
      const jobTitle = titleIndex !== -1 ? row[titleIndex] : 'Decision Maker';
      const industry = industryIndex !== -1 ? row[industryIndex] : 'B2B Tech';

      const cleanWebsite = website.toLowerCase().replace(/https?:\/\/(www\.)?/, '');
      if (cleanWebsite && existingWebsites.has(cleanWebsite)) {
        duplicates++;
        continue;
      }

      if (email && existingEmails.has(email.toLowerCase())) {
        duplicates++;
        continue;
      }

      // Create company
      const companyId = generateId();
      const newComp: Company = {
        id: companyId,
        name: compName,
        website: website.startsWith('http') ? website : website ? `https://${website}` : '',
        linkedinUrl: '',
        industry,
        country: 'United States',
        city: '',
        size: '11-50',
        type: 'B2B SaaS',
        servicesOffered: '',
        icpCriteria: 'Imported CSV prospect',
        icpMatchStatus: 'unreviewed',
        researchSource: 'CSV Import',
        verificationStatus: 'Pending',
        assignedResearcher: 'Elena Rostova',
        notes: 'Imported via CSV',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveEntityToRevDB('companies', newComp);

      // Create contact if provided
      let contactId: string | undefined;
      if (contactName) {
        contactId = generateId();
        const newCont: Contact = {
          id: contactId,
          companyId,
          name: contactName,
          title: jobTitle,
          email,
          linkedinUrl: '',
          source: 'CSV Import',
          verificationStatus: 'Pending',
          assignedOwner: 'Marcus Vance',
          notes: 'Imported via CSV',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveEntityToRevDB('contacts', newCont);
      }

      // Create lead
      const newLead: LeadDeal = {
        id: generateId(),
        companyId,
        primaryContactId: contactId,
        title: `${compName} — Outbound Opportunity`,
        stage: 'New',
        value: 5000,
        currency: 'USD',
        assignedTo: 'Marcus Vance',
        nextFollowUpDate: new Date().toISOString().split('T')[0],
        outreachChannel: 'Email',
        campaignName: 'CSV Import Campaign',
        notes: 'Imported from CSV list',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveEntityToRevDB('leads', newLead);
      imported++;
    }

    // Refresh store from DB
    get().init();
    return { imported, duplicates, errors };
  },

  // Team Member Management Actions
  inviteTeamMember: async (data) => {
    const inviteToken = generateId();
    const cleanRole = normalizeRole(data.role);
    const newMember: TeamMember = {
      id: generateId(),
      name: data.name || data.email.split('@')[0],
      email: data.email.trim().toLowerCase(),
      role: cleanRole,
      title: data.title || (cleanRole === 'co-founder' ? 'Co-Founder' : cleanRole === 'admin' ? 'Workspace Admin' : 'Outbound Specialist'),
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80`,
      status: 'invited',
      isActive: false,
      inviteToken,
      invitedAt: Date.now(),
      assignedAccountsCount: 0,
    };

    const updated = [...get().teamMembers, newMember];
    set({ teamMembers: updated });
    await saveEntityToRevDB('teamMembers', newMember);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite?token=${inviteToken}&email=${encodeURIComponent(newMember.email)}&role=${newMember.role}`;

    return { member: newMember, inviteLink };
  },

  updateTeamMemberRole: async (id, role) => {
    const target = get().teamMembers.find((m) => m.id === id);
    if (target?.role === 'owner' && role !== 'owner') {
      throw new Error('Cannot demote the primary workspace owner');
    }
    const cleanRole = normalizeRole(role);
    const updated = get().teamMembers.map((m) =>
      m.id === id ? { ...m, role: cleanRole, updatedAt: Date.now() } : m
    );
    set({ teamMembers: updated });
    const saved = updated.find((m) => m.id === id);
    if (saved) await saveEntityToRevDB('teamMembers', saved);
  },

  updateProfile: async (updates) => {
    const members = get().teamMembers;
    let target = members.find((m) => m.role === 'owner' || m.id === 'team-sanskar') || members[0];
    if (!target) return undefined;

    const updatedMember: TeamMember = {
      ...target,
      ...updates,
      updatedAt: Date.now(),
    };
    const updated = members.map((m) => (m.id === target.id ? updatedMember : m));
    set({ teamMembers: updated });
    await saveEntityToRevDB('teamMembers', updatedMember);
    return updatedMember;
  },

  removeTeamMember: async (id) => {
    // Prevent removing the primary owner
    const target = get().teamMembers.find((m) => m.id === id);
    if (target?.role === 'owner' && get().teamMembers.filter((m) => m.role === 'owner').length <= 1) {
      throw new Error('Cannot remove the primary workspace owner');
    }
    const updated = get().teamMembers.filter((m) => m.id !== id);
    set({ teamMembers: updated });
    await deleteEntityFromRevDB('teamMembers', id);
  },

  resendInvitation: async (id) => {
    const member = get().teamMembers.find((m) => m.id === id);
    if (!member) throw new Error('Member not found');
    const token = member.inviteToken || generateId();
    const updatedMember = { ...member, inviteToken: token, invitedAt: Date.now() };
    await saveEntityToRevDB('teamMembers', updatedMember);
    set({ teamMembers: get().teamMembers.map((m) => (m.id === id ? updatedMember : m)) });
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return { inviteLink: `${baseUrl}/invite?token=${token}&email=${encodeURIComponent(member.email)}&role=${member.role}` };
  },

  cancelInvitation: async (id) => {
    await get().removeTeamMember(id);
  },

  // Activity Tracking Actions
  logActivity: async (activityData) => {
    const newActivity: LeadActivity = {
      id: generateId(),
      companyId: activityData.companyId,
      clientId: activityData.clientId,
      leadId: activityData.leadId,
      contactId: activityData.contactId,
      type: activityData.type,
      title: activityData.title,
      notes: activityData.notes || '',
      recordedBy: activityData.recordedBy || 'Sanskar Anand',
      outreachSource: activityData.outreachSource || 'LinkedIn',
      campaign: activityData.campaign,
      metadata: activityData.metadata,
      createdAt: Date.now(),
    };

    const updatedActivities = [newActivity, ...get().activities];
    set({ activities: updatedActivities });
    await saveEntityToRevDB('activities', newActivity);

    // Derived updates on associated lead or company
    if (activityData.leadId) {
      const lead = get().leads.find((l) => l.id === activityData.leadId);
      if (lead) {
        const leadUpdates: Partial<LeadDeal> = {};
        const todayStr = new Date().toISOString().split('T')[0];

        if (activityData.type === 'message_sent') {
          leadUpdates.messageStatus = 'Sent';
          leadUpdates.lastContactDate = todayStr;
          if (lead.stage === 'New' || lead.stage === 'Verified' || lead.stage === 'Ready for Outreach') {
            leadUpdates.stage = 'Contacted';
          }
        } else if (activityData.type === 'reply_received' || activityData.type === 'positive_reply') {
          leadUpdates.messageStatus = 'Replied';
          leadUpdates.lastReplyDate = todayStr;
          if (activityData.type === 'positive_reply') {
            leadUpdates.isPositiveReply = true;
            leadUpdates.stage = 'Interested';
          } else if (lead.stage === 'Contacted' || lead.stage === 'Follow-up Due') {
            leadUpdates.stage = 'Replied';
          }
        } else if (activityData.type === 'connection_request_sent') {
          leadUpdates.connectionStatus = 'Sent';
        } else if (activityData.type === 'connection_request_accepted') {
          leadUpdates.connectionStatus = 'Accepted';
        } else if (activityData.type === 'meeting_booked') {
          leadUpdates.meetingStatus = 'Booked';
          leadUpdates.stage = 'Meeting Booked';
        } else if (activityData.type === 'meeting_completed') {
          leadUpdates.meetingStatus = 'Completed';
          leadUpdates.stage = 'Meeting Completed';
        } else if (activityData.type === 'proposal_sent') {
          leadUpdates.proposalStatus = 'Sent';
          leadUpdates.stage = 'Proposal Sent';
        } else if (activityData.type === 'deal_won') {
          leadUpdates.dealStatus = 'Won';
          leadUpdates.stage = 'Won';
          leadUpdates.closedAt = Date.now();
        } else if (activityData.type === 'deal_lost') {
          leadUpdates.dealStatus = 'Lost';
          leadUpdates.stage = 'Lost';
        }

        if (Object.keys(leadUpdates).length > 0) {
          await get().updateLead(lead.id, leadUpdates);
        }
      }
    }

    return newActivity;
  },

  deleteActivity: async (id) => {
    const updated = get().activities.filter((a) => a.id !== id);
    set({ activities: updated });
    await deleteEntityFromRevDB('activities', id);
  },

  // Outreach Sources Actions
  addOutreachSource: async (data) => {
    const newSource: OutreachSourceConfig = {
      id: generateId(),
      name: data.name,
      active: data.active ?? true,
      isCustom: true,
      icon: data.icon || 'Share2',
      color: data.color || '#4F46E5',
      description: data.description || '',
    };
    const updated = [...get().outreachSources, newSource];
    set({ outreachSources: updated });
    await saveEntityToRevDB('outreachSources', newSource);
    return newSource;
  },

  updateOutreachSource: async (id, updates) => {
    const updated = get().outreachSources.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    set({ outreachSources: updated });
    const target = updated.find((s) => s.id === id);
    if (target) await saveEntityToRevDB('outreachSources', target);
  },

  deleteOutreachSource: async (id) => {
    const updated = get().outreachSources.filter((s) => s.id !== id);
    set({ outreachSources: updated });
    await deleteEntityFromRevDB('outreachSources', id);
  },

  // Custom Operating Modules Actions
  setSelectedCustomModuleId: (id) => set({ selectedCustomModuleId: id }),
  setSelectedCustomRecordId: (id) => set({ selectedCustomRecordId: id }),

  addCustomModule: async (data) => {
    const id = `mod-${generateId()}`;
    const newModule: CustomModule = {
      id,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      description: data.description || '',
      icon: data.icon || 'Folder',
      category: data.category || 'Operations',
      type: data.type || 'database',
      accessRoles: data.accessRoles || ['owner', 'admin', 'member', 'viewer'],
      fields: data.fields || [],
      stages: data.stages || [],
      views: data.views || [
        { id: generateId(), name: 'All Records', type: 'table', visibleFields: [] }
      ],
      relations: data.relations || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...get().customModules, newModule];
    set({ customModules: updated });
    await saveEntityToRevDB('customModules', newModule);
    return newModule;
  },

  updateCustomModule: async (id, updates) => {
    const updated = get().customModules.map((m) =>
      m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
    );
    set({ customModules: updated });
    const target = updated.find((m) => m.id === id);
    if (target) await saveEntityToRevDB('customModules', target);
  },

  deleteCustomModule: async (id) => {
    const updated = get().customModules.filter((m) => m.id !== id);
    set({ customModules: updated });
    await deleteEntityFromRevDB('customModules', id);
    // Also remove associated records
    const remainingRecords = get().customRecords.filter((r) => r.moduleId !== id);
    set({ customRecords: remainingRecords });
  },

  duplicateCustomModule: async (id) => {
    const existing = get().customModules.find((m) => m.id === id);
    if (!existing) throw new Error('Module not found');
    const copy = await get().addCustomModule({
      name: `${existing.name} (Copy)`,
      slug: `${existing.slug}-copy-${Date.now()}`,
      description: existing.description,
      icon: existing.icon,
      category: existing.category,
      type: existing.type,
      accessRoles: [...existing.accessRoles],
      fields: existing.fields.map((f) => ({ ...f, id: generateId() })),
      stages: existing.stages.map((s) => ({ ...s, id: generateId() })),
      views: existing.views.map((v) => ({ ...v, id: generateId() })),
      relations: existing.relations ? [...existing.relations] : [],
    });
    return copy;
  },

  addCustomRecord: async (data) => {
    const newRecord: CustomRecord = {
      id: generateId(),
      moduleId: data.moduleId,
      title: data.title || 'Untitled Record',
      stageId: data.stageId,
      data: data.data || {},
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newRecord, ...get().customRecords];
    set({ customRecords: updated });
    await saveEntityToRevDB('customRecords', newRecord);
    return newRecord;
  },

  updateCustomRecord: async (id, updates) => {
    const updated = get().customRecords.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
    );
    set({ customRecords: updated });
    const target = updated.find((r) => r.id === id);
    if (target) await saveEntityToRevDB('customRecords', target);
  },

  deleteCustomRecord: async (id) => {
    const updated = get().customRecords.filter((r) => r.id !== id);
    set({ customRecords: updated });
    await deleteEntityFromRevDB('customRecords', id);
  },

  archiveCustomRecord: async (id) => {
    await get().updateCustomRecord(id, { archived: true });
  },

  exportLeadsToCSV: () => {
    const leads = get().leads;
    const companiesMap = new Map(get().companies.map((c) => [c.id, c]));
    const contactsMap = new Map(get().contacts.map((ct) => [ct.id, ct]));

    const headers = [
      'Lead Title',
      'Stage',
      'Value (USD)',
      'Assigned To',
      'Next Follow-Up',
      'Company Name',
      'Website',
      'Industry',
      'Verification Status',
      'Contact Name',
      'Contact Title',
      'Contact Email',
    ];

    const rows = leads.map((l) => {
      const comp = companiesMap.get(l.companyId);
      const cont = l.primaryContactId ? contactsMap.get(l.primaryContactId) : undefined;
      return [
        `"${l.title}"`,
        `"${l.stage}"`,
        l.value,
        `"${l.assignedTo}"`,
        `"${l.nextFollowUpDate || ''}"`,
        `"${comp?.name || ''}"`,
        `"${comp?.website || ''}"`,
        `"${comp?.industry || ''}"`,
        `"${comp?.verificationStatus || ''}"`,
        `"${cont?.name || ''}"`,
        `"${cont?.title || ''}"`,
        `"${cont?.email || ''}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },
}));
