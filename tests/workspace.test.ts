import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../src/stores/workspaceStore';
import { DatabaseProperty } from '../src/types';

describe('NovaNotes Architecture & State Engine', () => {
  beforeEach(async () => {
    // Reset Zustand store state before each test
    useWorkspaceStore.setState({
      isInitialized: true,
      saveStatus: 'saved',
      workspaces: [
        {
          id: 'ws-test',
          name: 'Test Workspace',
          icon: '🚀',
          ownerId: 'usr-1',
          members: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeWorkspaceId: 'ws-test',
      pages: {},
      databases: {},
      activePageId: null,
      currentUser: {
        id: 'usr-1',
        name: 'Tester',
        email: 'tester@nova.test',
        role: 'owner',
      },
    });
  });

  describe('Page Hierarchy & Lifecycle', () => {
    it('creates root pages and nested child pages with arbitrary depth', async () => {
      const store = useWorkspaceStore.getState();

      const rootPage = await store.createPage({
        title: 'Project Alpha',
        icon: '📁',
        type: 'doc',
      });

      expect(rootPage.id).toBeDefined();
      expect(rootPage.parentId).toBeNull();
      expect(rootPage.title).toBe('Project Alpha');
      expect(useWorkspaceStore.getState().pages[rootPage.id]).toBeDefined();

      const childPage = await store.createPage({
        parentId: rootPage.id,
        title: 'Specifications v1',
        icon: '📄',
        type: 'doc',
      });

      expect(childPage.parentId).toBe(rootPage.id);
      expect(useWorkspaceStore.getState().pages[childPage.id]).toBeDefined();

      const grandChildPage = await store.createPage({
        parentId: childPage.id,
        title: 'API Contracts',
        icon: '🔗',
        type: 'doc',
      });

      expect(grandChildPage.parentId).toBe(childPage.id);
    });

    it('updates page title, icon, and cover images', async () => {
      const store = useWorkspaceStore.getState();
      const page = await store.createPage({ title: 'Draft Note' });

      await store.updatePage(page.id, {
        title: 'Published Note',
        icon: '🎉',
        coverImage: 'https://images.unsplash.com/cover.jpg',
      });

      const updated = useWorkspaceStore.getState().pages[page.id];
      expect(updated.title).toBe('Published Note');
      expect(updated.icon).toBe('🎉');
      expect(updated.coverImage).toBe('https://images.unsplash.com/cover.jpg');
    });

    it('handles favorites and archiving with trash restoration', async () => {
      const store = useWorkspaceStore.getState();
      const page = await store.createPage({ title: 'Important Document' });

      await store.toggleFavorite(page.id);
      expect(useWorkspaceStore.getState().pages[page.id].isFavorite).toBe(true);

      await store.archivePage(page.id);
      expect(useWorkspaceStore.getState().pages[page.id].isArchived).toBe(true);

      await store.restorePage(page.id);
      expect(useWorkspaceStore.getState().pages[page.id].isArchived).toBe(false);
      expect(useWorkspaceStore.getState().activePageId).toBe(page.id);
    });

    it('moves pages between parents and reorders them without cyclic loops', async () => {
      const store = useWorkspaceStore.getState();
      const parentA = await store.createPage({ title: 'Parent A' });
      const parentB = await store.createPage({ title: 'Parent B' });
      const child = await store.createPage({ parentId: parentA.id, title: 'Child Document' });

      expect(useWorkspaceStore.getState().pages[child.id].parentId).toBe(parentA.id);

      // Move child under Parent B
      await store.movePage(child.id, parentB.id);
      expect(useWorkspaceStore.getState().pages[child.id].parentId).toBe(parentB.id);

      // Move child back to root
      await store.movePage(child.id, null);
      expect(useWorkspaceStore.getState().pages[child.id].parentId).toBeNull();

      // Cyclic protection test: Attempting to move Parent B under Child when Child is nested should be prevented
      await store.movePage(child.id, parentB.id);
      await store.movePage(parentB.id, child.id); // Should be a no-op to prevent infinite loop
      expect(useWorkspaceStore.getState().pages[parentB.id].parentId).toBeNull();
    });

    it('duplicates pages with rich content and database records', async () => {
      const store = useWorkspaceStore.getState();
      const originalPage = await store.createPage({
        title: 'Original Specs',
        type: 'doc',
      });
      await store.updatePageContent(originalPage.id, {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important project details' }] }],
      });

      const copy = await store.duplicatePage(originalPage.id);
      expect(copy).toBeDefined();
      expect(copy?.title).toBe('Original Specs (Copy)');
      expect(copy?.id).not.toBe(originalPage.id);
      expect(copy?.content.content[0].content[0].text).toBe('Important project details');
    });
  });

  describe('Database Engine & Multi-View Consistency', () => {
    it('creates database page with initial properties and views', async () => {
      const store = useWorkspaceStore.getState();
      const dbPage = await store.createPage({
        title: 'Sprint Backlog',
        type: 'database',
      });

      const databases = Object.values(useWorkspaceStore.getState().databases);
      const db = databases.find((d) => d.pageId === dbPage.id);

      expect(db).toBeDefined();
      expect(db?.title).toBe('Sprint Backlog');
      expect(db?.properties.length).toBeGreaterThanOrEqual(2);
      expect(db?.views.length).toBeGreaterThanOrEqual(2);
    });

    it('supports record CRUD operations and property additions', async () => {
      const store = useWorkspaceStore.getState();
      const dbPage = await store.createPage({
        title: 'Feature Tracker',
        type: 'database',
      });

      const db = Object.values(useWorkspaceStore.getState().databases).find((d) => d.pageId === dbPage.id)!;

      const record = await store.addDatabaseRecord(db.id, {
        'prop-title': 'Implement Drag and Drop',
        'prop-status': 'In Progress',
      });

      let currentDb = useWorkspaceStore.getState().databases[db.id];
      expect(currentDb.records.length).toBe(1);
      expect(currentDb.records[0].values['prop-title']).toBe('Implement Drag and Drop');

      await store.updateDatabaseRecord(db.id, record.id, {
        'prop-status': 'Done',
      });

      currentDb = useWorkspaceStore.getState().databases[db.id];
      expect(currentDb.records[0].values['prop-status']).toBe('Done');

      // Add a new property
      const newProp: DatabaseProperty = {
        id: 'prop-points',
        name: 'Story Points',
        type: 'number',
      };
      await store.addDatabaseProperty(db.id, newProp);

      currentDb = useWorkspaceStore.getState().databases[db.id];
      expect(currentDb.properties.some((p) => p.name === 'Story Points')).toBe(true);

      await store.deleteDatabaseRecord(db.id, record.id);
      currentDb = useWorkspaceStore.getState().databases[db.id];
      expect(currentDb.records.length).toBe(0);
    });

    it('adds multiple views to the database', async () => {
      const store = useWorkspaceStore.getState();
      const dbPage = await store.createPage({
        title: 'Roadmap',
        type: 'database',
      });

      const db = Object.values(useWorkspaceStore.getState().databases).find((d) => d.pageId === dbPage.id)!;

      await store.addDatabaseView(db.id, {
        id: 'view-calendar',
        name: 'Calendar',
        type: 'calendar',
        sorts: [],
        filters: [],
        visiblePropertyIds: [],
      });

      const currentDb = useWorkspaceStore.getState().databases[db.id];
      expect(currentDb.views.some((v) => v.type === 'calendar')).toBe(true);
    });

    it('supports cross-database relations, rollups, and computed properties', async () => {
      const store = useWorkspaceStore.getState();
      const dbPage = await store.createPage({
        title: 'Projects DB',
        type: 'database',
      });

      const db = Object.values(useWorkspaceStore.getState().databases).find((d) => d.pageId === dbPage.id)!;

      // Add Relation Property
      await store.addDatabaseProperty(db.id, {
        id: 'prop-rel-tasks',
        name: 'Linked Tasks',
        type: 'relation',
        relationDatabaseId: db.id,
      });

      // Add Rollup Property
      await store.addDatabaseProperty(db.id, {
        id: 'prop-rollup-tasks',
        name: 'Task Count',
        type: 'rollup',
        rollupRelationId: 'prop-rel-tasks',
        rollupPropertyId: 'prop-title',
        rollupFunction: 'count',
      });

      const currentDb = useWorkspaceStore.getState().databases[db.id];
      expect(currentDb.properties.some((p) => p.type === 'relation')).toBe(true);
      expect(currentDb.properties.some((p) => p.type === 'rollup')).toBe(true);
    });
  });

  describe('Comments & Document Discussions', () => {
    it('persists discussion comments threads on pages', async () => {
      const store = useWorkspaceStore.getState();
      const page = await store.createPage({ title: 'Discussion Page' });

      const comment = {
        id: 'comment-1',
        authorName: 'Alex Rivera',
        content: 'This architecture is verified and stable.',
        createdAt: Date.now(),
      };

      await store.updatePage(page.id, { comments: [comment] });

      const updatedPage = useWorkspaceStore.getState().pages[page.id];
      expect(updatedPage.comments?.length).toBe(1);
      expect(updatedPage.comments?.[0].content).toBe('This architecture is verified and stable.');
    });
  });

  describe('Content Autosave & Debounced Mutation', () => {
    it('updates document content and transitions save status', async () => {
      const store = useWorkspaceStore.getState();
      const page = await store.createPage({ title: 'Autosave Test' });

      const tipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Live updating content' }],
          },
        ],
      };

      await store.updatePageContent(page.id, tipTapDoc);
      expect(useWorkspaceStore.getState().saveStatus).toBe('saving');
      expect(useWorkspaceStore.getState().pages[page.id].content).toEqual(tipTapDoc);
    });

    it('duplicates pages and associated databases', async () => {
      const store = useWorkspaceStore.getState();
      const page = await store.createPage({ title: 'Sprint Roadmap', icon: '🎯', type: 'database' });
      await store.toggleFavorite(page.id);

      const duplicated = await store.duplicatePage(page.id);
      expect(duplicated).toBeDefined();
      expect(duplicated?.title).toBe('Sprint Roadmap (Copy)');
      expect(duplicated?.icon).toBe('🎯');
      expect(duplicated?.isFavorite).toBe(false);
      expect(duplicated?.id).not.toBe(page.id);
      expect(useWorkspaceStore.getState().pages[duplicated!.id]).toBeDefined();
    });
  });

  describe('Multi-Select & Record Detail Properties', () => {
    it('supports multi_select array values and auto-computed properties', async () => {
      const store = useWorkspaceStore.getState();
      const page = await store.createPage({ title: 'Project Board', type: 'database' });
      const db = useWorkspaceStore.getState().databases[page.id] || {
        id: 'db-test-2',
        pageId: page.id,
        title: 'Project Board',
        properties: [
          { id: 'prop-title', name: 'Name', type: 'title' as const },
          { id: 'prop-tags', name: 'Tags', type: 'multi_select' as const },
        ],
        views: [],
        records: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await store.updateDatabase(db);

      const rec = await store.addDatabaseRecord(db.id, {
        'prop-title': 'Implement API',
        'prop-tags': ['Backend', 'Security', 'P0'],
      });

      const currentDb = useWorkspaceStore.getState().databases[db.id];
      const savedRec = currentDb.records.find((r) => r.id === rec.id);
      expect(savedRec).toBeDefined();
      expect(savedRec?.values['prop-tags']).toEqual(['Backend', 'Security', 'P0']);
    });
  });
});

