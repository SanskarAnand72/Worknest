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
  });
});
