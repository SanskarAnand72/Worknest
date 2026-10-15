import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Workspace, Page, Database, UserProfile } from '@/types';

interface NovaDB extends DBSchema {
  workspaces: {
    key: string;
    value: Workspace;
  };
  pages: {
    key: string;
    value: Page;
    indexes: { 'by-workspace': string; 'by-parent': string };
  };
  databases: {
    key: string;
    value: Database;
    indexes: { 'by-page': string };
  };
  preferences: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'novanotes_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NovaDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<NovaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workspaces')) {
          db.createObjectStore('workspaces', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pages')) {
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('by-workspace', 'workspaceId');
          pageStore.createIndex('by-parent', 'parentId');
        }
        if (!db.objectStoreNames.contains('databases')) {
          const dbStore = db.createObjectStore('databases', { keyPath: 'id' });
          dbStore.createIndex('by-page', 'pageId');
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences');
        }
      },
    });
  }
  return dbPromise;
}

// Initial Seed Data
const DEFAULT_USER: UserProfile = {
  id: 'usr-default',
  name: 'Sanskar Anand',
  email: 'sanskar@revrecovery.io',
  role: 'owner',
  avatarUrl: '/avatars/sanskar-anand.jpg',
};

const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-main',
  name: "Nova's Workspace",
  icon: '🚀',
  ownerId: DEFAULT_USER.id,
  members: [DEFAULT_USER],
  createdAt: Date.now() - 86400000 * 7,
  updatedAt: Date.now(),
};

const SEED_PAGES: Page[] = [
  {
    id: 'page-welcome',
    workspaceId: 'ws-main',
    parentId: null,
    title: 'Welcome to NovaNotes',
    icon: '👋',
    coverImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1600&q=80',
    isFavorite: true,
    isArchived: false,
    type: 'doc',
    order: 0,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000,
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to NovaNotes 🚀' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'NovaNotes is a production-grade, offline-first productivity platform with hierarchical documents, interactive block editing, and unified database projections.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '✨ Core Features' }],
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich-text editing with slash commands (/)' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hierarchical nested pages with drag reordering' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Multi-view databases (Table, Kanban, Gallery, List)' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Full offline persistence via IndexedDB & local cache' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Invite teammates to collaborate in real-time' }] }],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '💡 Quick Tips' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Type "/" anywhere on an empty line to trigger the slash command palette. You can quickly insert headers, lists, code snippets, or quotes.',
                },
              ],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [
            {
              type: 'text',
              text: '// NovaNotes RecordMap reactive state model\nconst state = {\n  workspaces: Record<ID, Workspace>,\n  pages: Record<ID, Page>,\n  databases: Record<ID, Database>,\n  status: "saved"\n};',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'page-nested-guide',
    workspaceId: 'ws-main',
    parentId: 'page-welcome',
    title: 'Workspace Best Practices',
    icon: '📚',
    coverImage: null,
    isFavorite: false,
    isArchived: false,
    type: 'doc',
    order: 0,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 7200000,
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Organization Guidelines' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Keep your workspace structured with clear top-level categories and deep nested documents for sub-projects and meeting logs.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'page-roadmap',
    workspaceId: 'ws-main',
    parentId: null,
    title: 'Product Roadmap 2026',
    icon: '🎯',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    isFavorite: true,
    isArchived: false,
    type: 'database',
    order: 1,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now(),
  },
  {
    id: 'page-meeting-notes',
    workspaceId: 'ws-main',
    parentId: null,
    title: 'Engineering Architecture Notes',
    icon: '🛠️',
    coverImage: null,
    isFavorite: false,
    isArchived: false,
    type: 'doc',
    order: 2,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Clean-Room Architecture' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Designed with strict modular separation: State Store (Zustand) -> Storage Engine (IndexedDB) -> Reactive UI (React + Tailwind) -> TipTap ProseMirror Editor.',
            },
          ],
        },
      ],
    },
  },
];

const SEED_DATABASE: Database = {
  id: 'db-roadmap',
  pageId: 'page-roadmap',
  title: 'Product Roadmap 2026',
  properties: [
    { id: 'prop-title', name: 'Task Name', type: 'title' },
    {
      id: 'prop-status',
      name: 'Status',
      type: 'status',
      options: [
        { id: 'opt-backlog', name: 'Backlog', color: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
        { id: 'opt-in-progress', name: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
        { id: 'opt-in-review', name: 'In Review', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
        { id: 'opt-done', name: 'Done', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
      ],
    },
    {
      id: 'prop-priority',
      name: 'Priority',
      type: 'select',
      options: [
        { id: 'opt-low', name: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        { id: 'opt-med', name: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
        { id: 'opt-high', name: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
        { id: 'opt-crit', name: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
      ],
    },
    { id: 'prop-owner', name: 'Assignee', type: 'person' },
    { id: 'prop-due', name: 'Due Date', type: 'date' },
    { id: 'prop-estimate', name: 'Story Points', type: 'number' },
    {
      id: 'prop-hours',
      name: 'Est. Hours',
      type: 'formula',
      formulaExpression: 'prop("Story Points") * 8',
    },
    {
      id: 'prop-deps',
      name: 'Dependencies',
      type: 'relation',
      relationDatabaseId: 'db-roadmap',
    },
    {
      id: 'prop-dep-points',
      name: 'Dep. Points',
      type: 'rollup',
      rollupRelationId: 'prop-deps',
      rollupPropertyId: 'prop-estimate',
      rollupFunction: 'sum',
    },
    { id: 'prop-complete', name: 'Completed', type: 'checkbox' },
  ],
  views: [
    {
      id: 'view-table',
      name: 'Table View',
      type: 'table',
      sorts: [],
      filters: [],
      visiblePropertyIds: ['prop-title', 'prop-status', 'prop-priority', 'prop-owner', 'prop-due', 'prop-estimate', 'prop-hours', 'prop-deps', 'prop-dep-points', 'prop-complete'],
    },
    {
      id: 'view-board',
      name: 'Status Board',
      type: 'board',
      groupBy: 'prop-status',
      sorts: [],
      filters: [],
      visiblePropertyIds: ['prop-title', 'prop-priority', 'prop-owner', 'prop-due'],
    },
    {
      id: 'view-gallery',
      name: 'Gallery',
      type: 'gallery',
      sorts: [],
      filters: [],
      visiblePropertyIds: ['prop-title', 'prop-status', 'prop-priority', 'prop-due'],
    },
  ],
  records: [
    {
      id: 'rec-1',
      values: {
        'prop-title': 'Hierarchical Block Editor & Slash Command Menu',
        'prop-status': 'Done',
        'prop-priority': 'Critical',
        'prop-owner': 'Alex Rivera',
        'prop-due': '2026-10-20',
        'prop-estimate': 8,
        'prop-complete': true,
      },
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: 'rec-2',
      values: {
        'prop-title': 'Relational Database Engine with Multi-View Sync',
        'prop-status': 'In Progress',
        'prop-priority': 'Critical',
        'prop-owner': 'Dev Team',
        'prop-due': '2026-10-24',
        'prop-estimate': 13,
        'prop-deps': ['rec-1'],
        'prop-complete': false,
      },
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now(),
    },
    {
      id: 'rec-3',
      values: {
        'prop-title': 'Global Full-Text Search with Instant Indexing',
        'prop-status': 'In Progress',
        'prop-priority': 'High',
        'prop-owner': 'Alex Rivera',
        'prop-due': '2026-10-28',
        'prop-estimate': 5,
        'prop-deps': ['rec-1', 'rec-2'],
        'prop-complete': false,
      },
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
    },
    {
      id: 'rec-4',
      values: {
        'prop-title': 'Offline Draft Recovery & Conflict Reconciliation',
        'prop-status': 'Backlog',
        'prop-priority': 'Medium',
        'prop-owner': 'Infra Team',
        'prop-due': '2026-11-05',
        'prop-estimate': 8,
        'prop-complete': false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  createdAt: Date.now() - 86400000 * 4,
  updatedAt: Date.now(),
};

export async function initStorage() {
  const db = await getDB();
  if (!db) return;

  const existingWorkspaces = await db.getAll('workspaces');
  if (existingWorkspaces.length === 0) {
    // Seed database
    await db.put('workspaces', DEFAULT_WORKSPACE);
    for (const page of SEED_PAGES) {
      await db.put('pages', page);
    }
    await db.put('databases', SEED_DATABASE);
    await db.put('preferences', DEFAULT_USER, 'current_user');
  }
}

export async function fetchAllStorageData() {
  const db = await getDB();
  if (!db) {
    return {
      workspaces: [DEFAULT_WORKSPACE],
      pages: SEED_PAGES,
      databases: [SEED_DATABASE],
      currentUser: DEFAULT_USER,
    };
  }

  await initStorage();

  const workspaces = await db.getAll('workspaces');
  const pages = await db.getAll('pages');
  const databases = await db.getAll('databases');
  const currentUser = (await db.get('preferences', 'current_user')) || DEFAULT_USER;

  return { workspaces, pages, databases, currentUser };
}

export async function saveWorkspaceToDB(workspace: Workspace) {
  const db = await getDB();
  if (db) await db.put('workspaces', workspace);
}

export async function savePageToDB(page: Page) {
  const db = await getDB();
  if (db) await db.put('pages', page);
}

export async function deletePageFromDB(pageId: string) {
  const db = await getDB();
  if (db) await db.delete('pages', pageId);
}

export async function saveDatabaseToDB(database: Database) {
  const db = await getDB();
  if (db) await db.put('databases', database);
}

export async function saveCurrentUserToDB(user: UserProfile) {
  const db = await getDB();
  if (db) await db.put('preferences', user, 'current_user');
}
