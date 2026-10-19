export type LeadStage =
  | 'New'
  | 'Researching'
  | 'Awaiting Verification'
  | 'Verified'
  | 'Qualified'
  | 'Ready for Outreach'
  | 'Contacted'
  | 'Follow-up Due'
  | 'Replied'
  | 'Interested'
  | 'Meeting Booked'
  | 'Meeting Completed'
  | 'Proposal Sent'
  | 'Won'
  | 'Lost'
  | 'Disqualified'
  | 'Nurture';

export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected' | 'Needs Review';
export type ICPMatchStatus = 'matched' | 'partial' | 'unmatched' | 'unreviewed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Todo' | 'In Progress' | 'In Review' | 'Done';
export type ProjectStatus = 'Planning' | 'Active' | 'In Review' | 'Completed' | 'On Hold';
export type ProposalStatus = 'Draft' | 'Ready' | 'Sent' | 'Negotiation' | 'Accepted' | 'Rejected' | 'Expired';
export type MeetingType =
  | 'Weekly Team Sync'
  | 'Sales Discovery'
  | 'Client Kickoff'
  | 'Campaign Review'
  | 'Monthly Review'
  | 'One-to-One';
export type MeetingOutcome = 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'No Show';

export interface Company {
  id: string;
  name: string;
  website: string;
  linkedinUrl: string;
  industry: string;
  country: string;
  city: string;
  size: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  type: string;
  servicesOffered: string;
  icpCriteria: string;
  icpMatchStatus: ICPMatchStatus;
  researchSource: string;
  verificationStatus: VerificationStatus;
  verificationEvidenceUrl?: string;
  verificationReason?: string;
  verifiedBy?: string;
  assignedResearcher: string;
  notes: string;
  tags?: string[];
  customFields?: Record<string, any>;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  title: string;
  email: string;
  linkedinUrl: string;
  phone?: string;
  source: string;
  verificationStatus: 'Pending' | 'Verified' | 'Invalid' | 'Catch-All';
  assignedOwner: string;
  notes: string;
  customFields?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export type ConnectionRequestStatus = 'Not Sent' | 'Sent' | 'Accepted' | 'Ignored';
export type MessageStatus = 'Not Contacted' | 'Sent' | 'Awaiting Reply' | 'Replied' | 'Follow-up Needed';

export interface LeadDeal {
  id: string;
  companyId: string;
  clientId?: string;
  primaryContactId?: string;
  title: string;
  stage: LeadStage;
  value: number;
  expectedValue?: number;
  currency: string;
  assignedTo: string;
  nextFollowUpDate?: string; // YYYY-MM-DD
  outreachChannel?: 'Email' | 'LinkedIn' | 'Multi-Channel' | string;
  outreachSource?: string; // 'LinkedIn', 'Cold Email', 'Website', 'Referral', etc.
  campaignName?: string;
  connectionStatus?: ConnectionRequestStatus;
  messageStatus?: MessageStatus;
  lastContactDate?: string;
  lastReplyDate?: string;
  isPositiveReply?: boolean;
  meetingStatus?: 'None' | 'Booked' | 'Completed' | 'Cancelled' | 'Attended';
  proposalStatus?: ProposalStatus;
  dealStatus?: 'Open' | 'Won' | 'Lost';
  closedAt?: number;
  notes: string;
  tags?: string[];
  customFields?: Record<string, any>;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: number;
}

export interface ClientDiscoveryQuestionnaire {
  targetMarket: string;
  idealCustomerProfile: string;
  targetGeographies: string;
  dealSizeAverage: string;
  currentSalesProcess: string;
  monthlyMeetingGoal: string;
  monthlyBudget: string;
  constraintsAndRequirements: string;
}

export type PortalAccessStatus = 'Not Invited' | 'Invitation Pending' | 'Active' | 'Revoked';

export interface ClientOperationalMetrics {
  id: string;
  clientId: string;
  reportingPeriod: string; // e.g. "October 2026", "Q4 2026"
  campaignStatus: 'Active' | 'Pacing Well' | 'Optimizing' | 'On Hold' | 'Completed';
  targetAccounts: number;
  contactsReached: number;
  totalReplies: number;
  positiveReplies: number;
  qualifiedProspects: number;
  meetingsBooked: number;
  meetingsCompleted: number;
  dealsClosed: number;
  revenueGenerated: number;
  internalNotes?: string;
  updatedBy: string;
  updatedAt: number;
  createdAt: number;
}

export interface ClientPortalSettings {
  enabled: boolean;
  allowedMetrics: ('leads' | 'outreach' | 'replies' | 'qualified' | 'meetings' | 'conversions' | 'revenue' | 'deals')[];
  allowedTabs: ('overview' | 'campaigns' | 'meetings' | 'projects' | 'documents')[];
  kpiTargets: {
    monthlyLeads?: number;
    monthlyOutreach?: number;
    monthlyMeetings?: number;
    monthlyQualified?: number;
    targetConversionRate?: number;
    targetRevenue?: number;
  };
  sharedDocIds: string[];
  sharedNotes?: string;
  portalPasswordHash?: string;
}

export type ClientRole = 'client_guest' | 'client_admin';

export interface ClientPortalUser {
  id: string;
  email: string;
  name: string;
  clientId: string;
  clientName?: string;
  role: ClientRole;
  status: 'active' | 'invited' | 'pending' | 'revoked';
  invitedBy: string;
  invitedAt: number;
  lastLoginAt?: number;
  portalPasswordHash?: string;
  createdAt: number;
}

export interface Client {
  id: string;
  companyId: string;
  primaryContactId?: string;
  contactEmail?: string;
  servicesPurchased: string[];
  commercialTerms: string;
  contractStatus: 'Active' | 'Pending Renewal' | 'Paused' | 'Terminated';
  portalAccessStatus?: PortalAccessStatus;
  operationalMetrics?: ClientOperationalMetrics;
  monthlyValue: number;
  currency?: string;
  startDate: string;
  renewalDate: string;
  accountOwner: string;
  currentObjectives: string;
  successMetrics: string;
  onboardingChecklist: OnboardingChecklistItem[];
  discoveryQuestionnaire: ClientDiscoveryQuestionnaire;
  notes: string;
  portalSettings?: ClientPortalSettings;
  portalPasswordHash?: string;
  portalUserIds?: string[];
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export function getClientPortalAccessStatus(client: Client, portalUsers: ClientPortalUser[]): PortalAccessStatus {
  if (client.portalAccessStatus && client.portalAccessStatus !== 'Not Invited') {
    // If explicitly stored
    if (client.portalSettings && !client.portalSettings.enabled) return 'Revoked';
  }
  const usersForClient = portalUsers.filter(
    (u) =>
      u.clientId === client.id ||
      client.portalUserIds?.includes(u.id) ||
      (client.contactEmail && u.email.toLowerCase() === client.contactEmail.toLowerCase())
  );
  if (usersForClient.length === 0) return 'Not Invited';
  if (client.portalSettings && !client.portalSettings.enabled) return 'Revoked';
  const hasActive = usersForClient.some((u) => u.status === 'active');
  if (hasActive) return 'Active';
  const hasRevoked = usersForClient.every((u) => u.status === 'revoked');
  if (hasRevoked) return 'Revoked';
  return 'Invitation Pending';
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientId?: string;
  owner: string;
  teamMembers: string[];
  status: ProjectStatus;
  priority: TaskPriority;
  startDate: string;
  targetDate: string;
  milestones: ProjectMilestone[];
  createdAt: number;
  updatedAt: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RevTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  creator: string;
  dueDate?: string;
  relatedProjectId?: string;
  relatedClientId?: string;
  relatedCompanyId?: string;
  relatedMeetingId?: string;
  labels: string[];
  subtasks: Subtask[];
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MeetingActionItem {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  convertedToTaskId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  date: string;
  time: string;
  durationMinutes: number;
  attendees: string[];
  relatedCompanyId?: string;
  relatedClientId?: string;
  relatedProjectId?: string;
  agenda: string;
  notes: string;
  decisions: string;
  actionItems: MeetingActionItem[];
  outcome: MeetingOutcome;
  followUpDate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Proposal {
  id: string;
  companyId: string;
  contactId?: string;
  meetingId?: string;
  title: string;
  amount: number;
  currency: string;
  status: ProposalStatus;
  sentDate?: string;
  expectedDecisionDate?: string;
  nextAction: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContentItem {
  id: string;
  title: string;
  channel: 'LinkedIn' | 'Email Newsletter' | 'Blog' | 'Case Study' | 'Outreach Template';
  type: 'Post' | 'Sequence' | 'Article' | 'Testimonial' | 'Framework';
  topicOrCampaign: string;
  targetAudience: string;
  draft: string;
  owner: string;
  status: 'Idea' | 'Brief' | 'Draft' | 'Review' | 'Approved' | 'Scheduled' | 'Published';
  plannedDate: string;
  publishedUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type IntegrationProvider =
  | 'google_calendar'
  | 'google_sheets'
  | 'gmail'
  | 'calendly'
  | 'hubspot'
  | 'instantly'
  | 'linkedin'
  | 'n8n'
  | 'openai';

export type IntegrationStatus = 'Not Connected' | 'Setup Required' | 'Connected' | 'Error';

export interface IntegrationConfig {
  id: string;
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: 'Calendar & Meetings' | 'Outreach & Email' | 'CRM & Data' | 'Automation & AI';
  status: IntegrationStatus;
  lastSyncAt?: number;
  config?: Record<string, string>;
  errorMessage?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  executionCount: number;
  lastExecutedAt?: number;
}

export type TeamRole = 'owner' | 'co-founder' | 'admin' | 'member' | 'viewer' | 'co-owner';
export type MemberStatus = 'active' | 'invited' | 'pending' | 'revoked';

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  'co-founder': 'Co-Founder',
  'co-owner': 'Co-Founder', // backward-compatible mapping
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Primary workspace founder and legal owner.',
  'co-founder': 'Full administrative authority and governance, with access to authorized workspace management features.',
  'co-owner': 'Full administrative authority and governance, with access to authorized workspace management features.',
  admin: 'Full access to CRM, verification, onboarding & modules.',
  member: 'Can research leads, log outreach, manage tasks & meetings.',
  viewer: 'Read-only access to dashboards, SOPs, and reports.',
};

export function getRoleLabel(role: string): string {
  if (role === 'co-owner' || role === 'co-founder') return 'Co-Founder';
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  if (role === 'viewer') return 'Viewer';
  return 'Member';
}

export function normalizeRole(role: string): TeamRole {
  if (role === 'co-owner') return 'co-founder';
  if (['owner', 'co-founder', 'admin', 'member', 'viewer'].includes(role)) {
    return role as TeamRole;
  }
  return 'member';
}

export interface TeamMember {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  role: TeamRole;
  avatarUrl: string;
  title: string;
  status?: MemberStatus;
  isActive?: boolean;
  inviteToken?: string;
  invitedAt?: number;
  joinedAt?: number;
  updatedAt?: number;
  assignedAccountsCount?: number;
}

export type ActivityType =
  | 'connection_request_sent'
  | 'connection_request_accepted'
  | 'message_sent'
  | 'reply_received'
  | 'positive_reply'
  | 'followup_completed'
  | 'meeting_booked'
  | 'meeting_completed'
  | 'meeting_cancelled'
  | 'proposal_sent'
  | 'deal_won'
  | 'deal_lost'
  | 'note_added'
  | 'status_changed';

export interface LeadActivity {
  id: string;
  companyId: string;
  clientId?: string;
  leadId?: string;
  contactId?: string;
  type: ActivityType;
  title: string;
  notes?: string;
  recordedBy: string;
  outreachSource?: string;
  campaign?: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface OutreachSourceConfig {
  id: string;
  name: string;
  active: boolean;
  isCustom?: boolean;
  icon?: string;
  color?: string;
  description?: string;
}

// Custom Operating Modules System Types
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'multi-select'
  | 'url'
  | 'currency'
  | 'email'
  | 'relation';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: CustomFieldType;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // for select / multi-select
  appearsInTable: boolean;
  searchable: boolean;
  filterable: boolean;
  reportable?: boolean;
  editableByRoles?: TeamRole[];
  relationModuleId?: string;
}

export interface CustomModuleStage {
  id: string;
  name: string;
  color: string;
  order: number;
  isWon?: boolean;
  isLost?: boolean;
}

export type CustomModuleType =
  | 'database'
  | 'kanban'
  | 'project'
  | 'crm'
  | 'task_list'
  | 'content_calendar'
  | 'wiki'
  | 'kpi_dashboard'
  | 'simple_form';

export type CustomModuleViewType = 'table' | 'board' | 'list' | 'calendar' | 'gallery';

export interface CustomModuleViewConfig {
  id: string;
  name: string;
  type: CustomModuleViewType;
  filterField?: string;
  filterValue?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  groupByField?: string;
  visibleFields: string[];
}

export interface CustomModuleRelation {
  targetModuleId: string;
  targetModuleName: string;
  relationType: 'one-to-many' | 'many-to-one' | 'many-to-many';
}

export interface CustomModule {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  type: CustomModuleType;
  accessRoles: TeamRole[];
  fields: CustomFieldDefinition[];
  stages: CustomModuleStage[];
  views: CustomModuleViewConfig[];
  relations?: CustomModuleRelation[];
  createdAt: number;
  updatedAt: number;
}

export interface CustomRecord {
  id: string;
  moduleId: string;
  title: string;
  stageId?: string;
  data: Record<string, any>;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface KPITargets {
  period: string; // e.g. "Q4 2026"
  targetCompaniesResearched: number;
  targetLeadsVerified: number;
  targetOutreachSent: number;
  targetMeetingsBooked: number;
  targetDealsWon: number;
  targetRevenue: number;
}

export type RevRecoveryModule =
  | 'hq'
  | 'crm'
  | 'clients'
  | 'projects'
  | 'tasks'
  | 'meetings'
  | 'marketing'
  | 'sops'
  | 'goals'
  | 'reports'
  | 'integrations'
  | 'team'
  | 'settings'
  | string; // Allows dynamic custom module IDs

