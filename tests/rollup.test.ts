import { describe, it, expect } from 'vitest';
import { evaluateRollup } from '../src/lib/rollup';
import { Database } from '../src/types';

describe('Cross-Database Rollup Evaluation Engine', () => {
  const targetDatabase: Database = {
    id: 'db-tasks',
    pageId: 'page-tasks',
    title: 'Tasks Database',
    properties: [
      { id: 'prop-task-title', name: 'Task Name', type: 'title' },
      { id: 'prop-task-estimate', name: 'Story Points', type: 'number' },
      { id: 'prop-task-status', name: 'Status', type: 'status' },
    ],
    views: [],
    records: [
      {
        id: 'rec-1',
        values: {
          'prop-task-title': 'Setup DB Schema',
          'prop-task-estimate': 5,
          'prop-task-status': 'Done',
        },
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'rec-2',
        values: {
          'prop-task-title': 'Build API Endpoints',
          'prop-task-estimate': 8,
          'prop-task-status': 'In Progress',
        },
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: 'rec-3',
        values: {
          'prop-task-title': 'Write Integration Tests',
          'prop-task-estimate': 3,
          'prop-task-status': 'Backlog',
        },
        createdAt: 3000,
        updatedAt: 3000,
      },
    ],
    createdAt: 1000,
    updatedAt: 1000,
  };

  const currentDatabase: Database = {
    id: 'db-projects',
    pageId: 'page-projects',
    title: 'Projects Database',
    properties: [
      { id: 'prop-proj-title', name: 'Project Name', type: 'title' },
      {
        id: 'prop-proj-tasks',
        name: 'Linked Tasks',
        type: 'relation',
        relationDatabaseId: 'db-tasks',
      },
      {
        id: 'prop-proj-count',
        name: 'Total Tasks',
        type: 'rollup',
        rollupRelationId: 'prop-proj-tasks',
        rollupPropertyId: 'prop-task-title',
        rollupFunction: 'count',
      },
      {
        id: 'prop-proj-points',
        name: 'Total Story Points',
        type: 'rollup',
        rollupRelationId: 'prop-proj-tasks',
        rollupPropertyId: 'prop-task-estimate',
        rollupFunction: 'sum',
      },
      {
        id: 'prop-proj-avg',
        name: 'Average Points',
        type: 'rollup',
        rollupRelationId: 'prop-proj-tasks',
        rollupPropertyId: 'prop-task-estimate',
        rollupFunction: 'avg',
      },
      {
        id: 'prop-proj-min',
        name: 'Min Points',
        type: 'rollup',
        rollupRelationId: 'prop-proj-tasks',
        rollupPropertyId: 'prop-task-estimate',
        rollupFunction: 'min',
      },
      {
        id: 'prop-proj-max',
        name: 'Max Points',
        type: 'rollup',
        rollupRelationId: 'prop-proj-tasks',
        rollupPropertyId: 'prop-task-estimate',
        rollupFunction: 'max',
      },
      {
        id: 'prop-proj-names',
        name: 'Task Names',
        type: 'rollup',
        rollupRelationId: 'prop-proj-tasks',
        rollupPropertyId: 'prop-task-title',
        rollupFunction: 'show_original',
      },
    ],
    views: [],
    records: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  const allDatabases: Record<string, Database> = {
    'db-tasks': targetDatabase,
    'db-projects': currentDatabase,
  };

  it('aggregates count of linked records correctly', () => {
    const recordValues = {
      'prop-proj-tasks': ['rec-1', 'rec-2'],
    };
    const countProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-count')!;
    expect(
      evaluateRollup(countProp, {
        currentDatabase,
        recordValues,
        allDatabases,
      })
    ).toBe(2);
  });

  it('aggregates sum of related number property correctly', () => {
    const recordValues = {
      'prop-proj-tasks': ['rec-1', 'rec-2', 'rec-3'],
    };
    const sumProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-points')!;
    // 5 + 8 + 3 = 16
    expect(
      evaluateRollup(sumProp, {
        currentDatabase,
        recordValues,
        allDatabases,
      })
    ).toBe(16);
  });

  it('calculates average, min, and max accurately', () => {
    const recordValues = {
      'prop-proj-tasks': ['rec-1', 'rec-2', 'rec-3'],
    };
    const avgProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-avg')!;
    const minProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-min')!;
    const maxProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-max')!;

    // 16 / 3 = 5.33
    expect(
      evaluateRollup(avgProp, {
        currentDatabase,
        recordValues,
        allDatabases,
      })
    ).toBe(5.33);

    expect(
      evaluateRollup(minProp, {
        currentDatabase,
        recordValues,
        allDatabases,
      })
    ).toBe(3);

    expect(
      evaluateRollup(maxProp, {
        currentDatabase,
        recordValues,
        allDatabases,
      })
    ).toBe(8);
  });

  it('concatenates original values into comma-separated list', () => {
    const recordValues = {
      'prop-proj-tasks': ['rec-1', 'rec-3'],
    };
    const namesProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-names')!;
    expect(
      evaluateRollup(namesProp, {
        currentDatabase,
        recordValues,
        allDatabases,
      })
    ).toBe('Setup DB Schema, Write Integration Tests');
  });

  it('handles empty or missing relation safely without errors', () => {
    const emptyRecordValues = {
      'prop-proj-tasks': [],
    };
    const sumProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-points')!;
    expect(
      evaluateRollup(sumProp, {
        currentDatabase,
        recordValues: emptyRecordValues,
        allDatabases,
      })
    ).toBe(0);

    const minProp = currentDatabase.properties.find((p) => p.id === 'prop-proj-min')!;
    expect(
      evaluateRollup(minProp, {
        currentDatabase,
        recordValues: emptyRecordValues,
        allDatabases,
      })
    ).toBe('—');
  });

  it('handles invalid or non-existent target database gracefully', () => {
    const invalidProp = {
      ...currentDatabase.properties.find((p) => p.id === 'prop-proj-points')!,
      rollupRelationId: 'non-existent-prop',
    };
    expect(
      evaluateRollup(invalidProp, {
        currentDatabase,
        recordValues: { 'prop-proj-tasks': ['rec-1'] },
        allDatabases,
      })
    ).toBe('—');
  });
});
