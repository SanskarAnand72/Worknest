import { openDB, DBSchema, IDBPDatabase } from 'idb';
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
import {
  SEED_COMPANIES,
  SEED_CONTACTS,
  SEED_LEADS,
  SEED_CLIENTS,
  SEED_CLIENT_PORTAL_USERS,
  SEED_PROJECTS,
  SEED_TASKS,
  SEED_MEETINGS,
  SEED_PROPOSALS,
  SEED_CONTENT_ITEMS,
  SEED_ACTIVITIES,
  SEED_INTEGRATIONS,
  SEED_AUTOMATION_RULES,
  SEED_TEAM_MEMBERS,
  SEED_KPI_TARGETS,
  DEFAULT_OUTREACH_SOURCES,
  SEED_CUSTOM_MODULES,
  SEED_CUSTOM_RECORDS,
} from './revrecoverySeed';
import { saveWorkspaceEntity, deleteWorkspaceEntity } from './firebase';

export interface RevRecoveryDB extends DBSchema {
  companies: { key: string; value: Company };
  contacts: { key: string; value: Contact };
  leads: { key: string; value: LeadDeal };
  clients: { key: string; value: Client };
  clientPortalUsers: { key: string; value: ClientPortalUser };
  projects: { key: string; value: Project };
  tasks: { key: string; value: RevTask };
  meetings: { key: string; value: Meeting };
  proposals: { key: string; value: Proposal };
  contentItems: { key: string; value: ContentItem };
  integrations: { key: string; value: IntegrationConfig };
  automationRules: { key: string; value: AutomationRule };
  teamMembers: { key: string; value: TeamMember };
  kpiTargets: { key: string; value: KPITargets };
  activities: { key: string; value: LeadActivity };
  outreachSources: { key: string; value: OutreachSourceConfig };
  customModules: { key: string; value: CustomModule };
  customRecords: { key: string; value: CustomRecord };
}

const DB_NAME = 'revrecovery_os_v2';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<RevRecoveryDB>> | null = null;

export function getRevDB() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<RevRecoveryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('companies')) db.createObjectStore('companies', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('contacts')) db.createObjectStore('contacts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('leads')) db.createObjectStore('leads', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('clients')) db.createObjectStore('clients', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('clientPortalUsers')) db.createObjectStore('clientPortalUsers', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meetings')) db.createObjectStore('meetings', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('proposals')) db.createObjectStore('proposals', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('contentItems')) db.createObjectStore('contentItems', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('integrations')) db.createObjectStore('integrations', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('automationRules')) db.createObjectStore('automationRules', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('teamMembers')) db.createObjectStore('teamMembers', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('kpiTargets')) db.createObjectStore('kpiTargets', { keyPath: 'period' });
        if (!db.objectStoreNames.contains('activities')) db.createObjectStore('activities', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('outreachSources')) db.createObjectStore('outreachSources', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('customModules')) db.createObjectStore('customModules', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('customRecords')) db.createObjectStore('customRecords', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export interface RevRecoveryDataBundle {
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
}

// Demo IDs that were preloaded in older versions and should be cleanly migrated away
const DEMO_IDS = new Set([
  'comp-1', 'comp-2', 'comp-3', 'comp-4', 'comp-5', 'comp-6',
  'cont-1', 'cont-2', 'cont-3', 'cont-4', 'cont-5', 'cont-6',
  'lead-1', 'lead-2', 'lead-3', 'lead-4', 'lead-5', 'lead-6',
  'client-1', 'client-2', 'client-3', 'client-4',
  'proj-1', 'proj-2', 'proj-3', 'proj-4',
  'task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6',
  'meet-1', 'meet-2', 'meet-3', 'meet-4',
  'prop-1', 'prop-2', 'prop-3',
  'ci-1', 'cnt-2', 'cnt-3',
  'team-2', 'team-3', 'team-4', // Only keep genuine founder
]);

async function cleanDemoDataMigration(db: IDBPDatabase<RevRecoveryDB>): Promise<void> {
  const storesToClean: (keyof RevRecoveryDB)[] = [
    'companies', 'contacts', 'leads', 'clients', 'projects',
    'tasks', 'meetings', 'proposals', 'contentItems', 'teamMembers',
  ];

  try {
    for (const store of storesToClean) {
      const all = await db.getAll(store as any);
      for (const item of all) {
        const id = (item as any)?.id;
        if (id && DEMO_IDS.has(id)) {
          await db.delete(store as any, id);
        }
      }
    }
  } catch (err) {
    console.warn('Migration non-critical notice:', err);
  }
}

export async function fetchRevRecoveryData(): Promise<RevRecoveryDataBundle> {
  const db = await getRevDB();
  if (!db) {
    return {
      companies: SEED_COMPANIES,
      contacts: SEED_CONTACTS,
      leads: SEED_LEADS,
      clients: SEED_CLIENTS,
      clientPortalUsers: SEED_CLIENT_PORTAL_USERS,
      projects: SEED_PROJECTS,
      tasks: SEED_TASKS,
      meetings: SEED_MEETINGS,
      proposals: SEED_PROPOSALS,
      contentItems: SEED_CONTENT_ITEMS,
      integrations: SEED_INTEGRATIONS,
      automationRules: SEED_AUTOMATION_RULES,
      teamMembers: SEED_TEAM_MEMBERS,
      kpiTargets: SEED_KPI_TARGETS,
      activities: SEED_ACTIVITIES,
      outreachSources: DEFAULT_OUTREACH_SOURCES,
      customModules: SEED_CUSTOM_MODULES,
      customRecords: SEED_CUSTOM_RECORDS,
    };
  }

  try {
    // Run safe cleanup migration on older demo records
    await cleanDemoDataMigration(db);

    let companies = await db.getAll('companies');
    let contacts = await db.getAll('contacts');
    let leads = await db.getAll('leads');
    let clients = await db.getAll('clients');
    let clientPortalUsers = await db.getAll('clientPortalUsers');
    let projects = await db.getAll('projects');
    let tasks = await db.getAll('tasks');
    let meetings = await db.getAll('meetings');
    let proposals = await db.getAll('proposals');
    let contentItems = await db.getAll('contentItems');
    let integrations = await db.getAll('integrations');
    let automationRules = await db.getAll('automationRules');
    let teamMembers = await db.getAll('teamMembers');
    let kpiTargets = await db.get('kpiTargets', 'Q4 2026');
    let activities = await db.getAll('activities');
    let outreachSources = await db.getAll('outreachSources');
    let customModules = await db.getAll('customModules');
    let customRecords = await db.getAll('customRecords');

    // Ensure integrations exist
    if (integrations.length === 0) {
      for (const i of SEED_INTEGRATIONS) await db.put('integrations', i);
      integrations = SEED_INTEGRATIONS;
    }

    // Ensure automation rules templates exist
    if (automationRules.length === 0) {
      for (const a of SEED_AUTOMATION_RULES) await db.put('automationRules', a);
      automationRules = SEED_AUTOMATION_RULES;
    }

    // Ensure genuine founder exists in team members with updated photo
    if (teamMembers.length === 0) {
      for (const tm of SEED_TEAM_MEMBERS) await db.put('teamMembers', tm);
      teamMembers = SEED_TEAM_MEMBERS;
    } else {
      const founder = teamMembers.find((m) => m.name === 'Sanskar Anand' || m.id === 'team-sanskar');
      if (founder && !founder.avatarUrl) {
        founder.avatarUrl = '/avatars/sanskar-anand.jpg';
        await db.put('teamMembers', founder);
      }
    }

    // Migrate any legacy 'co-owner' roles safely to 'co-founder'
    for (const m of teamMembers) {
      if ((m.role as string) === 'co-owner') {
        m.role = 'co-founder';
        await db.put('teamMembers', m);
      }
    }

    // Ensure default outreach sources exist
    if (outreachSources.length === 0) {
      for (const s of DEFAULT_OUTREACH_SOURCES) await db.put('outreachSources', s);
      outreachSources = DEFAULT_OUTREACH_SOURCES;
    }

    // Ensure default client & portal invitation exist if DB is fresh
    if (companies.length === 0 && SEED_COMPANIES.length > 0) {
      for (const c of SEED_COMPANIES) await db.put('companies', c);
      companies = await db.getAll('companies');
    }

    if (clients.length === 0 && SEED_CLIENTS.length > 0) {
      for (const cl of SEED_CLIENTS) await db.put('clients', cl);
      clients = await db.getAll('clients');
    }

    if (clientPortalUsers.length === 0 && SEED_CLIENT_PORTAL_USERS.length > 0) {
      for (const u of SEED_CLIENT_PORTAL_USERS) await db.put('clientPortalUsers', u);
      clientPortalUsers = await db.getAll('clientPortalUsers');
    }

    // Ensure KPI targets record exists
    if (!kpiTargets) {
      await db.put('kpiTargets', SEED_KPI_TARGETS);
      kpiTargets = SEED_KPI_TARGETS;
    }

    return {
      companies,
      contacts,
      leads,
      clients,
      clientPortalUsers,
      projects,
      tasks,
      meetings,
      proposals,
      contentItems,
      integrations,
      automationRules,
      teamMembers,
      kpiTargets,
      activities,
      outreachSources,
      customModules,
      customRecords,
    };
  } catch (err) {
    console.error('Failed to load RevRecovery OS data from IndexedDB, falling back to clean seed:', err);
    return {
      companies: SEED_COMPANIES,
      contacts: SEED_CONTACTS,
      leads: SEED_LEADS,
      clients: SEED_CLIENTS,
      clientPortalUsers: SEED_CLIENT_PORTAL_USERS,
      projects: SEED_PROJECTS,
      tasks: SEED_TASKS,
      meetings: SEED_MEETINGS,
      proposals: SEED_PROPOSALS,
      contentItems: SEED_CONTENT_ITEMS,
      integrations: SEED_INTEGRATIONS,
      automationRules: SEED_AUTOMATION_RULES,
      teamMembers: SEED_TEAM_MEMBERS,
      kpiTargets: SEED_KPI_TARGETS,
      activities: SEED_ACTIVITIES,
      outreachSources: DEFAULT_OUTREACH_SOURCES,
      customModules: SEED_CUSTOM_MODULES,
      customRecords: SEED_CUSTOM_RECORDS,
    };
  }
}

export async function saveEntityToRevDB<T extends { id?: string; period?: string }>(
  storeName: keyof RevRecoveryDB,
  entity: T
): Promise<void> {
  const db = await getRevDB();
  if (db) {
    try {
      await db.put(storeName as any, entity);
    } catch (err) {
      console.error(`Failed to save to ${storeName}:`, err);
    }
  }

  // Non-blocking real-time sync to Cloud Firestore
  const entityId = (entity as any)?.id || (entity as any)?.period;
  if (entityId) {
    saveWorkspaceEntity('ws-main', storeName as string, { ...(entity as any), id: entityId }).catch(() => {});
  }
}

export async function deleteEntityFromRevDB(
  storeName: keyof RevRecoveryDB,
  id: string
): Promise<void> {
  const db = await getRevDB();
  if (db) {
    try {
      await db.delete(storeName as any, id);
    } catch (err) {
      console.error(`Failed to delete from ${storeName}:`, err);
    }
  }

  // Non-blocking real-time delete from Cloud Firestore
  deleteWorkspaceEntity('ws-main', storeName as string, id).catch(() => {});
}
