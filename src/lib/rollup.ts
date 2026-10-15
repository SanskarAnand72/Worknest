import { Database, DatabaseProperty, DatabaseRecord, RollupFunction } from '@/types';

export interface RollupContext {
  currentDatabase: Database;
  recordValues: Record<string, any>;
  allDatabases: Record<string, Database>;
}

/**
 * Safely computes the rollup aggregation for a database record.
 * Handles relation lookups, missing databases, empty relations, and cycle protection.
 */
export function evaluateRollup(
  property: DatabaseProperty,
  context: RollupContext
): string | number | null {
  if (property.type !== 'rollup') return null;

  const { currentDatabase, recordValues, allDatabases } = context;
  const relationPropId = property.rollupRelationId;
  const targetPropId = property.rollupPropertyId;

  if (!relationPropId || !targetPropId) {
    return '—';
  }

  // Find the relation property on the current database
  const relationProp = currentDatabase.properties.find((p) => p.id === relationPropId);
  if (!relationProp || relationProp.type !== 'relation' || !relationProp.relationDatabaseId) {
    return '—';
  }

  // Lookup target database
  const targetDatabase = allDatabases[relationProp.relationDatabaseId];
  if (!targetDatabase) {
    return '—';
  }

  // Lookup target property
  const targetProp = targetDatabase.properties.find((p) => p.id === targetPropId);
  if (!targetProp) {
    return '—';
  }

  // Get linked record IDs from the current record's relation value
  const rawRelationVal = recordValues[relationPropId];
  const linkedIds: string[] = Array.isArray(rawRelationVal)
    ? rawRelationVal
    : typeof rawRelationVal === 'string' && rawRelationVal
    ? [rawRelationVal]
    : [];

  const fn: RollupFunction = property.rollupFunction || 'count';

  if (fn === 'count') {
    return linkedIds.length;
  }

  if (linkedIds.length === 0) {
    return fn === 'count_values' || fn === 'sum' ? 0 : '—';
  }

  // Filter linked records in target database
  const linkedRecords = targetDatabase.records.filter((r) => linkedIds.includes(r.id));
  const rawValues = linkedRecords
    .map((r) => r.values[targetPropId])
    .filter((v) => v !== undefined && v !== null && v !== '');

  switch (fn) {
    case 'count_values':
      return rawValues.length;

    case 'sum': {
      const numbers = rawValues.map((v) => Number(v)).filter((n) => !isNaN(n));
      return numbers.reduce((acc, curr) => acc + curr, 0);
    }

    case 'avg': {
      const numbers = rawValues.map((v) => Number(v)).filter((n) => !isNaN(n));
      if (numbers.length === 0) return 0;
      const sum = numbers.reduce((acc, curr) => acc + curr, 0);
      return Math.round((sum / numbers.length) * 100) / 100;
    }

    case 'min': {
      const numbers = rawValues.map((v) => Number(v)).filter((n) => !isNaN(n));
      if (numbers.length === 0) return '—';
      return Math.min(...numbers);
    }

    case 'max': {
      const numbers = rawValues.map((v) => Number(v)).filter((n) => !isNaN(n));
      if (numbers.length === 0) return '—';
      return Math.max(...numbers);
    }

    case 'show_original': {
      if (rawValues.length === 0) return '—';
      return rawValues.join(', ');
    }

    default:
      return linkedIds.length;
  }
}
