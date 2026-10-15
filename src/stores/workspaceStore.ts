import { create } from 'zustand';
import { Page, Workspace, Database, SaveStatus, UserProfile, DatabaseRecord, DatabaseProperty, DatabaseView } from '@/types';
import { fetchAllStorageData, savePageToDB, saveDatabaseToDB, deletePageFromDB, saveWorkspaceToDB } from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface WorkspaceState {
  isInitialized: boolean;
  theme: 'light' | 'dark';
  saveStatus: SaveStatus;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  pages: Record<string, Page>;
  databases: Record<string, Database>;
  activePageId: string | null;
  currentUser: UserProfile | null;
  searchOpen: boolean;
  sidebarOpen: boolean;

  // Actions
  init: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSearchOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePageId: (id: string | null) => void;

  // Workspace Actions
  createWorkspace: (name: string, icon?: string) => Promise<Workspace>;
  switchWorkspace: (workspaceId: string) => void;

  // Page Actions
  createPage: (params: { parentId?: string | null; title?: string; icon?: string | null; type?: 'doc' | 'database' }) => Promise<Page>;
  updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
  updatePageContent: (pageId: string, content: any) => Promise<void>;
  toggleFavorite: (pageId: string) => Promise<void>;
  archivePage: (pageId: string) => Promise<void>;
  restorePage: (pageId: string) => Promise<void>;
  deletePagePermanently: (pageId: string) => Promise<void>;
  duplicatePage: (pageId: string) => Promise<Page | null>;

  // Database Actions
  updateDatabase: (db: Database) => Promise<void>;
  addDatabaseRecord: (databaseId: string, initialValues?: Record<string, any>) => Promise<DatabaseRecord>;
  updateDatabaseRecord: (databaseId: string, recordId: string, values: Record<string, any>) => Promise<void>;
  deleteDatabaseRecord: (databaseId: string, recordId: string) => Promise<void>;
  addDatabaseProperty: (databaseId: string, property: DatabaseProperty) => Promise<void>;
  addDatabaseView: (databaseId: string, view: DatabaseView) => Promise<void>;
}

let saveTimeout: NodeJS.Timeout | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  isInitialized: false,
  theme: 'light',
  saveStatus: 'saved',
  workspaces: [],
  activeWorkspaceId: 'ws-main',
  pages: {},
  databases: {},
  activePageId: null,
  currentUser: null,
  searchOpen: false,
  sidebarOpen: true,

  init: async () => {
    try {
      const data = await fetchAllStorageData();
      const pagesMap: Record<string, Page> = {};
      data.pages.forEach((p) => {
        pagesMap[p.id] = p;
      });

      const databasesMap: Record<string, Database> = {};
      data.databases.forEach((d) => {
        databasesMap[d.id] = d;
      });

      // Default active page: first non-archived page
      const firstPage = data.pages.find((p) => !p.isArchived) || null;

      // Saved theme preference
      const savedTheme = typeof window !== 'undefined' ? (localStorage.getItem('novanotes_theme') as 'light' | 'dark') : null;
      const initialTheme = savedTheme || 'light';

      if (typeof document !== 'undefined') {
        if (initialTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      set({
        isInitialized: true,
        theme: initialTheme,
        workspaces: data.workspaces,
        activeWorkspaceId: data.workspaces[0]?.id || 'ws-main',
        pages: pagesMap,
        databases: databasesMap,
        activePageId: firstPage?.id || null,
        currentUser: data.currentUser,
      });
    } catch (err) {
      console.error('Failed to init storage', err);
      set({ isInitialized: true, saveStatus: 'error' });
    }
  },

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('novanotes_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  setSearchOpen: (open) => set({ searchOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePageId: (id) => set({ activePageId: id }),

  createWorkspace: async (name, icon = '📁') => {
    const newWs: Workspace = {
      id: generateId(),
      name,
      icon,
      ownerId: get().currentUser?.id || 'usr-default',
      members: get().currentUser ? [get().currentUser!] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...get().workspaces, newWs];
    set({ workspaces: updated, activeWorkspaceId: newWs.id });
    await saveWorkspaceToDB(newWs);
    return newWs;
  },

  switchWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),

  createPage: async ({ parentId = null, title = 'Untitled', icon = '📄', type = 'doc' }) => {
    const pageId = generateId();
    const newPage: Page = {
      id: pageId,
      workspaceId: get().activeWorkspaceId,
      parentId,
      title,
      icon,
      coverImage: null,
      isFavorite: false,
      isArchived: false,
      type,
      order: Object.values(get().pages).filter((p) => p.parentId === parentId).length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content:
        type === 'doc'
          ? {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: '' }],
                },
              ],
            }
          : undefined,
    };

    const newPages = { ...get().pages, [newPage.id]: newPage };
    set({ pages: newPages, activePageId: newPage.id });
    await savePageToDB(newPage);

    if (type === 'database') {
      const dbId = generateId();
      const newDb: Database = {
        id: dbId,
        pageId: newPage.id,
        title,
        properties: [
          { id: generateId(), name: 'Name', type: 'title' },
          {
            id: generateId(),
            name: 'Status',
            type: 'status',
            options: [
              { id: generateId(), name: 'Not Started', color: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
              { id: generateId(), name: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
              { id: generateId(), name: 'Done', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
            ],
          },
          { id: generateId(), name: 'Tags', type: 'select', options: [] },
        ],
        views: [
          {
            id: generateId(),
            name: 'Table',
            type: 'table',
            sorts: [],
            filters: [],
            visiblePropertyIds: [],
          },
          {
            id: generateId(),
            name: 'Board',
            type: 'board',
            sorts: [],
            filters: [],
            visiblePropertyIds: [],
          },
        ],
        records: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const newDbs = { ...get().databases, [newDb.id]: newDb };
      set({ databases: newDbs });
      await saveDatabaseToDB(newDb);
    }

    return newPage;
  },

  updatePage: async (pageId, updates) => {
    const page = get().pages[pageId];
    if (!page) return;

    const updatedPage: Page = {
      ...page,
      ...updates,
      updatedAt: Date.now(),
    };

    set({
      pages: { ...get().pages, [pageId]: updatedPage },
      saveStatus: 'saving',
    });

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await savePageToDB(updatedPage);
      set({ saveStatus: 'saved' });
    }, 400);
  },

  updatePageContent: async (pageId, content) => {
    const page = get().pages[pageId];
    if (!page) return;

    const updatedPage: Page = {
      ...page,
      content,
      updatedAt: Date.now(),
    };

    set({
      pages: { ...get().pages, [pageId]: updatedPage },
      saveStatus: 'saving',
    });

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await savePageToDB(updatedPage);
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Save failed', err);
        set({ saveStatus: 'error' });
      }
    }, 600);
  },

  toggleFavorite: async (pageId) => {
    const page = get().pages[pageId];
    if (!page) return;
    const isFavorite = !page.isFavorite;
    await get().updatePage(pageId, { isFavorite });
  },

  archivePage: async (pageId) => {
    await get().updatePage(pageId, { isArchived: true });
    // If active page was archived, switch to next available page
    if (get().activePageId === pageId) {
      const remaining = Object.values(get().pages).filter((p) => !p.isArchived && p.id !== pageId);
      set({ activePageId: remaining[0]?.id || null });
    }
  },

  restorePage: async (pageId) => {
    await get().updatePage(pageId, { isArchived: false });
    set({ activePageId: pageId });
  },

  deletePagePermanently: async (pageId) => {
    const { [pageId]: deleted, ...remainingPages } = get().pages;
    set({ pages: remainingPages });
    if (get().activePageId === pageId) {
      const nextActive = Object.values(remainingPages).find((p) => !p.isArchived) || null;
      set({ activePageId: nextActive ? nextActive.id : null });
    }
    await deletePageFromDB(pageId);
  },

  duplicatePage: async (pageId) => {
    const target = get().pages[pageId];
    if (!target) return null;

    const newPageId = generateId();
    const duplicatedPage: Page = {
      ...target,
      id: newPageId,
      title: `${target.title} (Copy)`,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set({
      pages: { ...get().pages, [newPageId]: duplicatedPage },
      activePageId: newPageId,
      saveStatus: 'saving',
    });
    await savePageToDB(duplicatedPage);

    // If this is a database page, duplicate its database collection as well
    if (target.type === 'database') {
      const targetDb = Object.values(get().databases).find((d) => d.pageId === pageId);
      if (targetDb) {
        const newDbId = generateId();
        const duplicatedDb: Database = {
          ...targetDb,
          id: newDbId,
          pageId: newPageId,
          records: targetDb.records.map((r) => ({
            ...r,
            id: generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({
          databases: { ...get().databases, [newDbId]: duplicatedDb },
        });
        await saveDatabaseToDB(duplicatedDb);
      }
    }

    set({ saveStatus: 'saved' });
    return duplicatedPage;
  },

  updateDatabase: async (db) => {
    const updated = { ...db, updatedAt: Date.now() };
    set({
      databases: { ...get().databases, [db.id]: updated },
      saveStatus: 'saving',
    });
    await saveDatabaseToDB(updated);
    set({ saveStatus: 'saved' });
  },

  addDatabaseRecord: async (databaseId, initialValues = {}) => {
    const db = get().databases[databaseId];
    if (!db) throw new Error('Database not found');

    const newRecord: DatabaseRecord = {
      id: generateId(),
      values: initialValues,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedDb: Database = {
      ...db,
      records: [newRecord, ...db.records],
      updatedAt: Date.now(),
    };

    await get().updateDatabase(updatedDb);
    return newRecord;
  },

  updateDatabaseRecord: async (databaseId, recordId, values) => {
    const db = get().databases[databaseId];
    if (!db) return;

    const updatedRecords = db.records.map((r) =>
      r.id === recordId ? { ...r, values: { ...r.values, ...values }, updatedAt: Date.now() } : r
    );

    const updatedDb: Database = {
      ...db,
      records: updatedRecords,
      updatedAt: Date.now(),
    };

    await get().updateDatabase(updatedDb);
  },

  deleteDatabaseRecord: async (databaseId, recordId) => {
    const db = get().databases[databaseId];
    if (!db) return;

    const updatedRecords = db.records.filter((r) => r.id !== recordId);
    const updatedDb: Database = {
      ...db,
      records: updatedRecords,
      updatedAt: Date.now(),
    };

    await get().updateDatabase(updatedDb);
  },

  addDatabaseProperty: async (databaseId, property) => {
    const db = get().databases[databaseId];
    if (!db) return;

    const updatedDb: Database = {
      ...db,
      properties: [...db.properties, property],
      updatedAt: Date.now(),
    };

    await get().updateDatabase(updatedDb);
  },

  addDatabaseView: async (databaseId, view) => {
    const db = get().databases[databaseId];
    if (!db) return;

    const updatedDb: Database = {
      ...db,
      views: [...db.views, view],
      updatedAt: Date.now(),
    };

    await get().updateDatabase(updatedDb);
  },
}));
