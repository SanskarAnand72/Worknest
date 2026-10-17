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
  KPITargets,
  LeadActivity,
  OutreachSourceConfig,
  CustomModule,
  CustomRecord,
  ClientPortalUser,
} from '@/types/revrecovery';
import { Page } from '@/types';

export const SEED_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'team-sanskar',
    name: 'Sanskar Anand',
    email: 'sanskar@revrecovery.io',
    role: 'owner',
    title: 'Founder & Managing Director',
    avatarUrl: '/avatars/sanskar-anand.jpg',
    status: 'active',
    isActive: true,
    joinedAt: Date.now() - 86400000 * 30,
    assignedAccountsCount: 0,
  },
];

export const DEFAULT_OUTREACH_SOURCES: OutreachSourceConfig[] = [
  { id: 'source-linkedin', name: 'LinkedIn', active: true, icon: 'Linkedin', color: '#0A66C2', description: 'LinkedIn InMail, connection outreach & Sales Navigator' },
  { id: 'source-cold-email', name: 'Cold Email', active: true, icon: 'Mail', color: '#EA4335', description: 'Direct outbound email campaigns & cold cadences' },
  { id: 'source-website', name: 'Website', active: true, icon: 'Globe', color: '#34A853', description: 'Inbound demo requests and website contact forms' },
  { id: 'source-referral', name: 'Referral', active: true, icon: 'Users', color: '#FBBC05', description: 'Client, partner or network referrals' },
  { id: 'source-inbound', name: 'Inbound', active: true, icon: 'ArrowDownLeft', color: '#4285F4', description: 'Inbound direct inquiries and content marketing leads' },
  { id: 'source-partner', name: 'Partner', active: true, icon: 'Handshake', color: '#9C27B0', description: 'Channel partners and co-marketing introductions' },
  { id: 'source-event', name: 'Event', active: true, icon: 'Calendar', color: '#E91E63', description: 'Conferences, summits, trade shows, and webinars' },
  { id: 'source-other', name: 'Other', active: true, icon: 'MoreHorizontal', color: '#607D8B', description: 'General or unclassified acquisition sources' },
];


export const SEED_COMPANIES: Company[] = [];
export const SEED_CONTACTS: Contact[] = [];
export const SEED_LEADS: LeadDeal[] = [];
export const SEED_CLIENTS: Client[] = [];
export const SEED_CLIENT_PORTAL_USERS: ClientPortalUser[] = [];
export const SEED_PROJECTS: Project[] = [];
export const SEED_TASKS: RevTask[] = [];
export const SEED_MEETINGS: Meeting[] = [];
export const SEED_PROPOSALS: Proposal[] = [];
export const SEED_CONTENT_ITEMS: ContentItem[] = [];
export const SEED_ACTIVITIES: LeadActivity[] = [];
export const SEED_CUSTOM_MODULES: CustomModule[] = [];
export const SEED_CUSTOM_RECORDS: CustomRecord[] = [];

export const SEED_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'int-1',
    provider: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync scheduled discovery calls, kickoff meetings, and client follow-ups directly to calendar.',
    category: 'Calendar & Meetings',
    status: 'Not Connected',
  },
  {
    id: 'int-2',
    provider: 'google_sheets',
    name: 'Google Sheets',
    description: 'Export verified leads, CRM pipeline snapshots, and client reporting metrics to Google Sheets.',
    category: 'CRM & Data',
    status: 'Not Connected',
  },
  {
    id: 'int-3',
    provider: 'gmail',
    name: 'Gmail / Google Workspace',
    description: 'Send manual follow-ups, sync client communication threads, and track meeting invites.',
    category: 'Outreach & Email',
    status: 'Not Connected',
  },
  {
    id: 'int-4',
    provider: 'calendly',
    name: 'Calendly',
    description: 'Capture inbound discovery call bookings automatically into RevRecovery Meetings.',
    category: 'Calendar & Meetings',
    status: 'Not Connected',
  },
  {
    id: 'int-5',
    provider: 'hubspot',
    name: 'HubSpot CRM',
    description: 'Two-way sync of verified companies, qualified contacts, and closed-won deals.',
    category: 'CRM & Data',
    status: 'Not Connected',
  },
  {
    id: 'int-6',
    provider: 'instantly',
    name: 'Instantly.ai',
    description: 'Connect email warm-up, lead campaign uploads, and reply sentiment webhooks.',
    category: 'Outreach & Email',
    status: 'Not Connected',
  },
  {
    id: 'int-7',
    provider: 'linkedin',
    name: 'LinkedIn Sales Navigator',
    description: 'Track outreach connection requests, message responses, and profile enrichment.',
    category: 'Outreach & Email',
    status: 'Not Connected',
  },
  {
    id: 'int-8',
    provider: 'n8n',
    name: 'n8n Workflow Automation',
    description: 'Trigger autonomous research webhooks, verification cascades, and multi-tool notifications.',
    category: 'Automation & AI',
    status: 'Not Connected',
  },
  {
    id: 'int-9',
    provider: 'openai',
    name: 'OpenAI API',
    description: 'AI-assisted lead verification reasoning, company positioning analysis, and personalized outreach drafts.',
    category: 'Automation & AI',
    status: 'Not Connected',
  },
];

export const SEED_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'auto-1',
    name: 'Lead Verified -> Create Outreach Preparation Task',
    trigger: 'Lead moves to "Verified" stage',
    condition: 'Verification Status is "Verified"',
    action: 'Create task assigned to Outbound Specialist: "Draft personalized outreach touchpoint"',
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'auto-2',
    name: 'Meeting Booked -> Schedule Discovery Call in Meetings',
    trigger: 'Lead moves to "Meeting Booked" stage',
    condition: 'Next Follow-up date is populated',
    action: 'Create new Discovery Meeting record and assign to Owner',
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'auto-3',
    name: 'Deal Won -> Trigger Client Onboarding Checklist',
    trigger: 'Lead moves to "Won" stage',
    condition: 'Value > 0',
    action: 'Convert lead to Client record and generate 10-step Onboarding Checklist',
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'auto-4',
    name: 'Overdue Follow-up -> Urgent Dashboard Alert',
    trigger: 'Follow-up date < Today and Status != Completed',
    condition: 'Follow-up is pending',
    action: 'Flag lead as Overdue on RevRecovery HQ dashboard and notify owner',
    enabled: true,
    executionCount: 0,
  },
];

export const SEED_KPI_TARGETS: KPITargets = {
  period: 'Q4 2026',
  targetCompaniesResearched: 0,
  targetLeadsVerified: 0,
  targetOutreachSent: 0,
  targetMeetingsBooked: 0,
  targetDealsWon: 0,
  targetRevenue: 0,
};

export const SEED_SOP_PAGES: Page[] = [
  {
    id: 'sop-company-overview',
    workspaceId: 'ws-main',
    parentId: null,
    title: '1. RevRecovery Company Overview & Value Proposition',
    icon: '⚡',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    isFavorite: true,
    isArchived: false,
    type: 'doc',
    order: 0,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 3600000 * 5,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '⚡ RevRecovery Company Overview' }] },
        {
          type: 'callout',
          attrs: { icon: '🎯' },
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Mission: ' },
                { type: 'text', text: 'To build the most disciplined, predictable, and qualified B2B outbound acquisition engine for high-growth tech companies.' },
              ],
            },
          ],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What We Do' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'RevRecovery helps B2B SaaS, IT services, and consultancies acquire qualified enterprise clients without wasting thousands of hours on unverified lead lists or spammy cold emails.' },
          ],
        },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'The RevRecovery 6-Pillar Framework' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Pillar 1: Deep ICP Research' }, { type: 'text', text: ' — We only target companies with verified revenue, headcount, and hiring triggers.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Pillar 2: 4-Layer Verification' }, { type: 'text', text: ' — Every lead must be verified manually and programmatically before outreach.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Pillar 3: Bespoke Multi-Channel Sequences' }, { type: 'text', text: ' — Hyper-personalized email + LinkedIn connection touchpoints.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Pillar 4: Active Follow-Up Cadence' }, { type: 'text', text: ' — 80% of meetings are booked on touchpoints 2–4.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Pillar 5: Qualified Meeting Delivery' }, { type: 'text', text: ' — Direct calendar bookings with verified decision-makers.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Pillar 6: Closed-Loop Performance Reporting' }, { type: 'text', text: ' — Tracking real revenue, not vanity open rates.' }] }] },
          ],
        },
      ],
    },
  },
  {
    id: 'sop-icp-definitions',
    workspaceId: 'ws-main',
    parentId: null,
    title: '2. Ideal Customer Profile (ICP) Definitions',
    icon: '🎯',
    coverImage: null,
    isFavorite: false,
    isArchived: false,
    type: 'doc',
    order: 1,
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now() - 86400000 * 2,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🎯 RevRecovery ICP Standards' }] },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This document defines the strict qualification parameters that any company or contact must satisfy before entering our sales pipeline or our clients campaigns.' }],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Primary ICP Tier: B2B SaaS & Tech' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Annual Revenue: ' }, { type: 'text', text: '$2,000,000 to $50,000,000 ARR' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Headcount: ' }, { type: 'text', text: '15 to 250 employees on LinkedIn' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Target Geographies: ' }, { type: 'text', text: 'United States, Canada, United Kingdom, Northern Europe, Australia' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Average Contract Value (ACV): ' }, { type: 'text', text: 'Minimum $10,000/year (ideal $25,000 - $100,000)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Key Decision-Maker Personas: ' }, { type: 'text', text: 'Founder, CEO, Chief Revenue Officer, VP of Sales, Head of Growth' }] }] },
          ],
        },
      ],
    },
  },
  {
    id: 'sop-lead-verification',
    workspaceId: 'ws-main',
    parentId: null,
    title: '3. Lead Verification SOP (Quality Standard)',
    icon: '✅',
    coverImage: null,
    isFavorite: true,
    isArchived: false,
    type: 'doc',
    order: 2,
    createdAt: Date.now() - 86400000 * 13,
    updatedAt: Date.now() - 86400000 * 1,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '✅ Step-by-Step Lead Verification SOP' }] },
        {
          type: 'callout',
          attrs: { icon: '⚠️' },
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'RULE OF THUMB: ' },
                { type: 'text', text: 'Never mark a company "Verified" without a clickable evidence URL demonstrating ICP qualification.' },
              ],
            },
          ],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Verification Checklist' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step 1: Check website SSL, domain activity, and pricing page' }] }] },
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step 2: Confirm LinkedIn employee count is within ICP bracket' }] }] },
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step 3: Verify decision-maker has posted or been active on LinkedIn in last 6 months' }] }] },
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step 4: Verify business email deliverability via ZeroBounce / NeverBounce' }] }] },
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step 5: Record evidence link and reasoning directly in RevRecovery CRM' }] }] },
          ],
        },
      ],
    },
  },
  {
    id: 'sop-sales-process',
    workspaceId: 'ws-main',
    parentId: null,
    title: '4. Cold Outbound & Sales Outreach Process',
    icon: '📬',
    coverImage: null,
    isFavorite: false,
    isArchived: false,
    type: 'doc',
    order: 3,
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 3,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '📬 Outbound Outreach Standard' }] },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Outreach must be concise, relevant, and focused on commercial value rather than generic sales pitches.' }],
        },
      ],
    },
  },
  {
    id: 'sop-client-onboarding',
    workspaceId: 'ws-main',
    parentId: null,
    title: '5. Client Onboarding Standard Operating Procedure',
    icon: '🚀',
    coverImage: null,
    isFavorite: true,
    isArchived: false,
    type: 'doc',
    order: 4,
    createdAt: Date.now() - 86400000 * 11,
    updatedAt: Date.now() - 86400000 * 1,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🚀 Client Onboarding SOP' }] },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'When a prospect is marked Won in RevRecovery OS, the 10-step onboarding protocol triggers automatically.' }],
        },
      ],
    },
  },
];
