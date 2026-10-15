'use client';

import React, { useState } from 'react';
import {
  Database,
  DatabaseRecord,
  DatabaseProperty,
  PropertyType,
  DatabaseView as IDatabaseView,
  RollupFunction,
} from '@/types';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { evaluateFormula } from '@/lib/formula';
import { evaluateRollup } from '@/lib/rollup';
import {
  Table as TableIcon,
  LayoutGrid,
  Kanban,
  List as ListIcon,
  Plus,
  Trash2,
  Copy,
  Search,
  Filter,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Clock,
  FileDown,
  Settings,
  X,
  Check,
  Calculator,
  ChevronDown,
  Link as LinkIcon,
  Mail,
  Phone,
  Layers,
} from 'lucide-react';
import { generateId, formatDate } from '@/lib/utils';

interface DatabaseViewProps {
  database: Database;
}

type CalculationType = 'none' | 'count' | 'count_values' | 'sum' | 'avg' | 'min' | 'max' | 'percent_checked';

export const DatabaseView: React.FC<DatabaseViewProps> = ({ database }) => {
  const {
    databases,
    addDatabaseRecord,
    updateDatabaseRecord,
    deleteDatabaseRecord,
    addDatabaseProperty,
    updateDatabase,
  } = useWorkspaceStore();

  const [activeViewId, setActiveViewId] = useState<string>(database.views[0]?.id || 'view-table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [addPropOpen, setAddPropOpen] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState<PropertyType>('text');
  const [newFormulaExpr, setNewFormulaExpr] = useState('');
  const [selectedRelationDbId, setSelectedRelationDbId] = useState<string>('');
  const [selectedRollupRelationId, setSelectedRollupRelationId] = useState<string>('');
  const [selectedRollupPropertyId, setSelectedRollupPropertyId] = useState<string>('');
  const [selectedRollupFunction, setSelectedRollupFunction] = useState<RollupFunction>('count');

  // Interactive Relation Picker Popover State
  const [relationPickerRecordId, setRelationPickerRecordId] = useState<string | null>(null);
  const [relationPickerPropId, setRelationPickerPropId] = useState<string | null>(null);
  const [relationSearchQuery, setRelationSearchQuery] = useState('');

  const [calculations, setCalculations] = useState<Record<string, CalculationType>>({
    'prop-estimate': 'sum',
    'prop-complete': 'percent_checked',
    'prop-title': 'count',
  });
  const [calcMenuOpenPropId, setCalcMenuOpenPropId] = useState<string | null>(null);

  const activeView = database.views.find((v) => v.id === activeViewId) || database.views[0];

  const titleProp = database.properties.find((p) => p.type === 'title') || database.properties[0];
  const statusProp = database.properties.find((p) => p.type === 'status');
  const dateProp = database.properties.find((p) => p.type === 'date');

  const handleAddRecord = async (extraValues: Record<string, any> = {}) => {
    const initial: Record<string, any> = { ...extraValues };
    if (titleProp && !initial[titleProp.id]) {
      initial[titleProp.id] = 'New Task';
    }
    await addDatabaseRecord(database.id, initial);
  };

  const handleDuplicateRecord = async (record: DatabaseRecord) => {
    const duplicated = { ...record.values };
    if (titleProp && duplicated[titleProp.id]) {
      duplicated[titleProp.id] = `${duplicated[titleProp.id]} (Copy)`;
    }
    await addDatabaseRecord(database.id, duplicated);
  };

  const handleAddProperty = async () => {
    if (!newPropName) return;
    const availableDbs = Object.values(databases);
    const targetDbId = selectedRelationDbId || (availableDbs.length > 0 ? availableDbs[0].id : database.id);

    const newProp: DatabaseProperty = {
      id: generateId(),
      name: newPropName,
      type: newPropType,
      formulaExpression: newPropType === 'formula' ? newFormulaExpr : undefined,
      relationDatabaseId: newPropType === 'relation' ? targetDbId : undefined,
      rollupRelationId: newPropType === 'rollup' ? selectedRollupRelationId : undefined,
      rollupPropertyId: newPropType === 'rollup' ? selectedRollupPropertyId : undefined,
      rollupFunction: newPropType === 'rollup' ? selectedRollupFunction : undefined,
      options:
        newPropType === 'select' || newPropType === 'status'
          ? [
              { id: generateId(), name: 'Option 1', color: 'bg-blue-100 text-blue-800' },
              { id: generateId(), name: 'Option 2', color: 'bg-zinc-200 text-zinc-800' },
            ]
          : undefined,
    };
    await addDatabaseProperty(database.id, newProp);
    setAddPropOpen(false);
    setNewPropName('');
    setNewFormulaExpr('');
    setSelectedRelationDbId('');
    setSelectedRollupRelationId('');
    setSelectedRollupPropertyId('');
  };

  const handleExportCSV = () => {
    const headers = database.properties.map((p) => `"${p.name}"`).join(',');
    const rows = database.records.map((r) =>
      database.properties.map((p) => `"${String(r.values[p.id] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${database.title || 'database'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort records
  let processedRecords = [...database.records];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    processedRecords = processedRecords.filter((rec) =>
      Object.values(rec.values).some((v) => String(v).toLowerCase().includes(q))
    );
  }

  if (filterStatus !== 'all' && statusProp) {
    processedRecords = processedRecords.filter((rec) => rec.values[statusProp.id] === filterStatus);
  }

  if (sortField) {
    processedRecords.sort((a, b) => {
      const valA = a.values[sortField] ?? '';
      const valB = b.values[sortField] ?? '';
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Calculate aggregation for a column
  const calculateAggregation = (prop: DatabaseProperty): string => {
    const calcType = calculations[prop.id];
    if (!calcType || calcType === 'none') return 'Calculate';

    if (calcType === 'count') {
      return `Count ${processedRecords.length}`;
    }

    if (calcType === 'count_values') {
      const nonNull = processedRecords.filter((r) => r.values[prop.id] !== undefined && r.values[prop.id] !== '').length;
      return `${nonNull} values`;
    }

    if (calcType === 'sum') {
      const sum = processedRecords.reduce((acc, r) => acc + (Number(r.values[prop.id]) || 0), 0);
      return `Sum ${sum}`;
    }

    if (calcType === 'avg') {
      if (processedRecords.length === 0) return 'Avg 0';
      const sum = processedRecords.reduce((acc, r) => acc + (Number(r.values[prop.id]) || 0), 0);
      return `Avg ${(sum / processedRecords.length).toFixed(1)}`;
    }

    if (calcType === 'min') {
      const nums = processedRecords.map((r) => Number(r.values[prop.id])).filter((n) => !isNaN(n));
      return nums.length ? `Min ${Math.min(...nums)}` : 'Min —';
    }

    if (calcType === 'max') {
      const nums = processedRecords.map((r) => Number(r.values[prop.id])).filter((n) => !isNaN(n));
      return nums.length ? `Max ${Math.max(...nums)}` : 'Max —';
    }

    if (calcType === 'percent_checked') {
      if (processedRecords.length === 0) return '0%';
      const checked = processedRecords.filter((r) => !!r.values[prop.id]).length;
      return `${Math.round((checked / processedRecords.length) * 100)}% checked`;
    }

    return 'Calculate';
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 md:px-12 pt-6 pb-24">
      {/* Top Header & Global Actions */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{database.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm"
            title="Export rows as CSV"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => handleAddRecord()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Item
          </button>
        </div>
      </div>

      {/* View Tabs & Filter/Sort Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-2 mb-4 gap-2">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {database.views.map((view) => {
            const Icon =
              view.type === 'board'
                ? Kanban
                : view.type === 'gallery'
                ? LayoutGrid
                : view.type === 'list'
                ? ListIcon
                : view.type === 'calendar'
                ? CalendarIcon
                : view.type === 'timeline'
                ? Clock
                : TableIcon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveViewId(view.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeView?.id === view.id
                    ? 'bg-muted text-foreground border-b-2 border-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {view.name}
              </button>
            );
          })}

          {/* Add View Tab */}
          <button
            onClick={() => {
              const types: ('table' | 'board' | 'gallery' | 'list' | 'calendar' | 'timeline')[] = [
                'table',
                'board',
                'gallery',
                'list',
                'calendar',
                'timeline',
              ];
              const unusedType = types.find((t) => !database.views.some((v) => v.type === t)) || 'timeline';
              const nameMap = {
                table: 'Table',
                board: 'Board',
                gallery: 'Gallery',
                list: 'List',
                calendar: 'Calendar',
                timeline: 'Timeline',
              };
              updateDatabase({
                ...database,
                views: [
                  ...database.views,
                  {
                    id: generateId(),
                    name: nameMap[unusedType],
                    type: unusedType,
                    sorts: [],
                    filters: [],
                    visiblePropertyIds: [],
                  },
                ],
              });
            }}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
            title="Add view"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toolbar: Filter, Sort, Search, Add Column */}
        <div className="flex items-center gap-2 text-xs">
          {/* Status Filter */}
          {statusProp && (
            <div className="flex items-center gap-1 bg-muted/60 border border-border px-2 py-1 rounded-md">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent outline-none text-xs cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {statusProp.options?.map((opt) => (
                  <option key={opt.id} value={opt.name}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-muted/60 border border-border px-2 py-1 rounded-md">
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-transparent outline-none text-xs cursor-pointer"
            >
              <option value="">Sort by</option>
              {database.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {sortField && (
              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="px-1 text-[10px] font-mono hover:text-accent"
              >
                {sortDirection.toUpperCase()}
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-2.5 py-1 text-xs rounded-md bg-muted/60 border border-border focus:outline-none focus:ring-1 focus:ring-accent w-28 md:w-36"
            />
          </div>

          {/* Add Property Button */}
          <button
            onClick={() => setAddPropOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground hover:text-foreground"
            title="Add column property"
          >
            <Plus className="w-3 h-3" />
            <span>Property</span>
          </button>
        </div>
      </div>

      {/* Add Property Modal */}
      {addPropOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-2xl max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-3 flex items-center justify-between">
              <span>Add New Property</span>
              <button onClick={() => setAddPropOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </h3>
            <div className="space-y-3 text-xs mb-4">
              <div>
                <label className="text-muted-foreground block mb-1">Property Name</label>
                <input
                  type="text"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  placeholder="e.g. Total Cost, Priority, Due Date"
                  className="w-full p-2 rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-accent text-foreground"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Type</label>
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value as PropertyType)}
                  className="w-full p-2 rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-accent text-foreground cursor-pointer"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="status">Status</option>
                  <option value="date">Date</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="person">Person</option>
                  <option value="url">URL</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="formula">Formula (Computed)</option>
                  <option value="relation">Relation (Linked Database)</option>
                  <option value="rollup">Rollup (Aggregate)</option>
                </select>
              </div>

              {newPropType === 'formula' && (
                <div>
                  <label className="text-muted-foreground block mb-1">Formula Expression</label>
                  <input
                    type="text"
                    value={newFormulaExpr}
                    onChange={(e) => setNewFormulaExpr(e.target.value)}
                    placeholder='e.g. prop("Story Points") * 2'
                    className="w-full p-2 rounded-lg bg-muted border border-border outline-none font-mono text-[11px]"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Use prop(&quot;Col&quot;) with arithmetic (+, -, *, /) or if(cond, a, b).
                  </span>
                </div>
              )}

              {newPropType === 'relation' && (
                <div>
                  <label className="text-muted-foreground block mb-1">Target Database</label>
                  <select
                    value={selectedRelationDbId || Object.keys(databases)[0] || database.id}
                    onChange={(e) => setSelectedRelationDbId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-accent text-foreground cursor-pointer"
                  >
                    {Object.values(databases).map((db) => (
                      <option key={db.id} value={db.id}>
                        {db.title} {db.id === database.id ? '(Self)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newPropType === 'rollup' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-muted-foreground block mb-1">Relation Property</label>
                    <select
                      value={selectedRollupRelationId}
                      onChange={(e) => {
                        setSelectedRollupRelationId(e.target.value);
                        const relProp = database.properties.find((p) => p.id === e.target.value);
                        if (relProp?.relationDatabaseId && databases[relProp.relationDatabaseId]) {
                          const targetDb = databases[relProp.relationDatabaseId];
                          if (targetDb.properties.length > 0) {
                            setSelectedRollupPropertyId(targetDb.properties[0].id);
                          }
                        }
                      }}
                      className="w-full p-2 rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-accent text-foreground cursor-pointer"
                    >
                      <option value="">Select a relation property...</option>
                      {database.properties
                        .filter((p) => p.type === 'relation')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  {selectedRollupRelationId && (
                    <>
                      <div>
                        <label className="text-muted-foreground block mb-1">Target Property</label>
                        <select
                          value={selectedRollupPropertyId}
                          onChange={(e) => setSelectedRollupPropertyId(e.target.value)}
                          className="w-full p-2 rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-accent text-foreground cursor-pointer"
                        >
                          {(() => {
                            const relProp = database.properties.find((p) => p.id === selectedRollupRelationId);
                            const targetDb = relProp?.relationDatabaseId ? databases[relProp.relationDatabaseId] : null;
                            return (targetDb?.properties || []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.type})
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                      <div>
                        <label className="text-muted-foreground block mb-1">Calculate</label>
                        <select
                          value={selectedRollupFunction}
                          onChange={(e) => setSelectedRollupFunction(e.target.value as RollupFunction)}
                          className="w-full p-2 rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-accent text-foreground cursor-pointer"
                        >
                          <option value="count">Count all linked records</option>
                          <option value="count_values">Count non-empty values</option>
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                          <option value="min">Min</option>
                          <option value="max">Max</option>
                          <option value="show_original">Show original values</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setAddPropOpen(false)}
                className="px-3 py-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProperty}
                disabled={!newPropName}
                className="px-3.5 py-1.5 rounded-lg bg-accent text-accent-foreground font-medium disabled:opacity-50"
              >
                Create Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TABLE VIEW WITH CALCULATIONS FOOTER */}
      {activeView?.type === 'table' && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  {database.properties.map((prop) => (
                    <th key={prop.id} className="py-2.5 px-3 min-w-[150px]">
                      {prop.name}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 w-14 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/60 hover:bg-muted/20 transition-colors group"
                  >
                    <td className="py-2 px-3 text-center text-muted-foreground">{index + 1}</td>
                    {database.properties.map((prop) => (
                      <td key={prop.id} className="py-1.5 px-3 border-r border-border/30 last:border-r-0">
                        {prop.type === 'title' || prop.type === 'text' || prop.type === 'person' ? (
                          <input
                            type="text"
                            value={record.values[prop.id] || ''}
                            onChange={(e) =>
                              updateDatabaseRecord(database.id, record.id, { [prop.id]: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-muted/50 rounded px-1.5 py-1 text-foreground"
                          />
                        ) : prop.type === 'number' ? (
                          <input
                            type="number"
                            value={record.values[prop.id] ?? ''}
                            onChange={(e) =>
                              updateDatabaseRecord(database.id, record.id, {
                                [prop.id]: e.target.value ? Number(e.target.value) : '',
                              })
                            }
                            className="w-full bg-transparent outline-none focus:bg-muted/50 rounded px-1.5 py-1 text-foreground"
                          />
                        ) : prop.type === 'checkbox' ? (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!!record.values[prop.id]}
                              onChange={(e) =>
                                updateDatabaseRecord(database.id, record.id, { [prop.id]: e.target.checked })
                              }
                              className="w-4 h-4 rounded text-accent accent-accent cursor-pointer"
                            />
                          </div>
                        ) : prop.type === 'status' || prop.type === 'select' ? (
                          <select
                            value={record.values[prop.id] || ''}
                            onChange={(e) =>
                              updateDatabaseRecord(database.id, record.id, { [prop.id]: e.target.value })
                            }
                            className="bg-muted text-xs font-medium px-2 py-1 rounded-md border border-border/50 outline-none cursor-pointer"
                          >
                            <option value="">Select</option>
                            {prop.options?.map((opt) => (
                              <option key={opt.id} value={opt.name}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        ) : prop.type === 'date' ? (
                          <input
                            type="date"
                            value={record.values[prop.id] || ''}
                            onChange={(e) =>
                              updateDatabaseRecord(database.id, record.id, { [prop.id]: e.target.value })
                            }
                            className="bg-transparent text-xs outline-none px-1 py-1 rounded"
                          />
                        ) : prop.type === 'formula' ? (
                          <div className="font-mono text-xs px-1.5 py-1 text-accent bg-muted/40 rounded flex items-center gap-1">
                            <span>
                              {String(
                                evaluateFormula(prop.formulaExpression || '', {
                                  properties: record.values,
                                }) ?? '—'
                              )}
                            </span>
                          </div>
                        ) : prop.type === 'rollup' ? (
                          <div className="font-mono text-xs px-1.5 py-1 text-foreground bg-muted/40 rounded flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-accent" />
                            <span>
                              {String(
                                evaluateRollup(prop, {
                                  currentDatabase: database,
                                  recordValues: record.values,
                                  allDatabases: databases,
                                }) ?? '—'
                              )}
                            </span>
                          </div>
                        ) : prop.type === 'relation' ? (
                          (() => {
                            const rawVal = record.values[prop.id];
                            const linkedIds: string[] = Array.isArray(rawVal) ? rawVal : rawVal ? [rawVal] : [];
                            const targetDb = databases[prop.relationDatabaseId || ''] || database;
                            const targetTitleProp =
                              targetDb?.properties.find((p) => p.type === 'title') || targetDb?.properties[0];

                            return (
                              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                                {linkedIds.map((id) => {
                                  const targetRecord = targetDb?.records.find((r) => r.id === id);
                                  const title = targetRecord
                                    ? targetRecord.values[targetTitleProp?.id] || 'Untitled'
                                    : id;
                                  return (
                                    <span
                                      key={id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border/60 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                                    >
                                      <LinkIcon className="w-2.5 h-2.5 text-accent" />
                                      <span className="max-w-[110px] truncate">{title}</span>
                                      <button
                                        onClick={() => {
                                          const updated = linkedIds.filter((x) => x !== id);
                                          updateDatabaseRecord(database.id, record.id, { [prop.id]: updated });
                                        }}
                                        className="text-muted-foreground hover:text-red-500 rounded p-0.5"
                                        title="Unlink"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  );
                                })}
                                <button
                                  onClick={() => {
                                    setRelationPickerRecordId(record.id);
                                    setRelationPickerPropId(prop.id);
                                    setRelationSearchQuery('');
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:border-border text-[11px]"
                                  title="Link record"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Link</span>
                                </button>
                              </div>
                            );
                          })()
                        ) : prop.type === 'email' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="email"
                              value={record.values[prop.id] || ''}
                              onChange={(e) =>
                                updateDatabaseRecord(database.id, record.id, { [prop.id]: e.target.value })
                              }
                              placeholder="name@example.com"
                              className="w-full bg-transparent outline-none focus:bg-muted/50 rounded px-1.5 py-1 text-foreground"
                            />
                            {record.values[prop.id] && (
                              <a
                                href={`mailto:${record.values[prop.id]}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-accent p-1"
                                title="Send email"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : prop.type === 'phone' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="tel"
                              value={record.values[prop.id] || ''}
                              onChange={(e) =>
                                updateDatabaseRecord(database.id, record.id, { [prop.id]: e.target.value })
                              }
                              placeholder="+1 (555) 000-0000"
                              className="w-full bg-transparent outline-none focus:bg-muted/50 rounded px-1.5 py-1 text-foreground"
                            />
                            {record.values[prop.id] && (
                              <a
                                href={`tel:${record.values[prop.id]}`}
                                className="text-muted-foreground hover:text-accent p-1"
                                title="Call phone"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{record.values[prop.id]}</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right">
                      <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end gap-1 transition-opacity">
                        <button
                          onClick={() => handleDuplicateRecord(record)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Duplicate row"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDatabaseRecord(database.id, record.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded text-red-500"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* CALCULATION SUMMARY FOOTER */}
              <tfoot>
                <tr className="border-t border-border bg-muted/20 text-muted-foreground font-medium text-[11px]">
                  <td className="py-2 px-3 text-center">Σ</td>
                  {database.properties.map((prop) => (
                    <td key={prop.id} className="py-1 px-3 border-r border-border/30 last:border-r-0 relative">
                      <button
                        onClick={() =>
                          setCalcMenuOpenPropId(calcMenuOpenPropId === prop.id ? null : prop.id)
                        }
                        className="flex items-center gap-1 hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors w-full justify-between"
                      >
                        <span className="truncate">{calculateAggregation(prop)}</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                      </button>

                      {/* Dropdown to select calculation */}
                      {calcMenuOpenPropId === prop.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-2 bottom-8 z-30 w-36 bg-card border border-border rounded-lg shadow-lg py-1 text-xs"
                        >
                          <button
                            onClick={() => {
                              setCalculations({ ...calculations, [prop.id]: 'none' });
                              setCalcMenuOpenPropId(null);
                            }}
                            className="w-full px-2.5 py-1 text-left hover:bg-muted"
                          >
                            None
                          </button>
                          <button
                            onClick={() => {
                              setCalculations({ ...calculations, [prop.id]: 'count' });
                              setCalcMenuOpenPropId(null);
                            }}
                            className="w-full px-2.5 py-1 text-left hover:bg-muted"
                          >
                            Count all
                          </button>
                          <button
                            onClick={() => {
                              setCalculations({ ...calculations, [prop.id]: 'count_values' });
                              setCalcMenuOpenPropId(null);
                            }}
                            className="w-full px-2.5 py-1 text-left hover:bg-muted"
                          >
                            Count values
                          </button>
                          {prop.type === 'number' && (
                            <>
                              <button
                                onClick={() => {
                                  setCalculations({ ...calculations, [prop.id]: 'sum' });
                                  setCalcMenuOpenPropId(null);
                                }}
                                className="w-full px-2.5 py-1 text-left hover:bg-muted"
                              >
                                Sum
                              </button>
                              <button
                                onClick={() => {
                                  setCalculations({ ...calculations, [prop.id]: 'avg' });
                                  setCalcMenuOpenPropId(null);
                                }}
                                className="w-full px-2.5 py-1 text-left hover:bg-muted"
                              >
                                Average
                              </button>
                              <button
                                onClick={() => {
                                  setCalculations({ ...calculations, [prop.id]: 'min' });
                                  setCalcMenuOpenPropId(null);
                                }}
                                className="w-full px-2.5 py-1 text-left hover:bg-muted"
                              >
                                Min
                              </button>
                              <button
                                onClick={() => {
                                  setCalculations({ ...calculations, [prop.id]: 'max' });
                                  setCalcMenuOpenPropId(null);
                                }}
                                className="w-full px-2.5 py-1 text-left hover:bg-muted"
                              >
                                Max
                              </button>
                            </>
                          )}
                          {prop.type === 'checkbox' && (
                            <button
                              onClick={() => {
                                setCalculations({ ...calculations, [prop.id]: 'percent_checked' });
                                setCalcMenuOpenPropId(null);
                              }}
                              className="w-full px-2.5 py-1 text-left hover:bg-muted"
                            >
                              Percent checked
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            onClick={() => handleAddRecord()}
            className="w-full py-2.5 px-4 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-1.5 border-t border-border transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add new row
          </button>
        </div>
      )}

      {/* 2. KANBAN BOARD VIEW */}
      {activeView?.type === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {statusProp?.options?.map((option) => {
            const columnRecords = processedRecords.filter((r) => r.values[statusProp.id] === option.name);
            return (
              <div
                key={option.id}
                className="w-72 flex-shrink-0 bg-muted/40 border border-border rounded-xl p-3 flex flex-col max-h-[70vh]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${option.color}`}>
                      {option.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{columnRecords.length}</span>
                  </div>
                  <button
                    onClick={() => handleAddRecord({ [statusProp.id]: option.name })}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
                  {columnRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-card border border-border p-3 rounded-lg shadow-sm hover:shadow transition-shadow group relative"
                    >
                      <input
                        type="text"
                        value={rec.values[titleProp?.id] || ''}
                        onChange={(e) =>
                          updateDatabaseRecord(database.id, rec.id, { [titleProp.id]: e.target.value })
                        }
                        className="w-full text-xs font-semibold bg-transparent outline-none mb-2 text-foreground"
                      />
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {rec.values['prop-priority'] && (
                          <span className="px-1.5 py-0.5 rounded bg-muted font-medium">
                            {rec.values['prop-priority']}
                          </span>
                        )}
                        {rec.values['prop-due'] && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {rec.values['prop-due']}
                          </span>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-card/80 rounded p-0.5">
                        <button
                          onClick={() => deleteDatabaseRecord(database.id, rec.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. GALLERY VIEW */}
      {activeView?.type === 'gallery' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {processedRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div>
                <input
                  type="text"
                  value={rec.values[titleProp?.id] || ''}
                  onChange={(e) => updateDatabaseRecord(database.id, rec.id, { [titleProp.id]: e.target.value })}
                  className="w-full text-sm font-bold bg-transparent outline-none mb-2 text-foreground"
                />
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {database.properties
                    .filter((p) => p.type !== 'title')
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="opacity-70">{p.name}:</span>
                        <span className="font-medium text-foreground">{String(rec.values[p.id] ?? '—')}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                <span>Created {formatDate(rec.createdAt)}</span>
                <button
                  onClick={() => deleteDatabaseRecord(database.id, rec.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded text-red-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. LIST VIEW */}
      {activeView?.type === 'list' && (
        <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
          {processedRecords.map((rec) => (
            <div
              key={rec.id}
              className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="text"
                  value={rec.values[titleProp?.id] || ''}
                  onChange={(e) => updateDatabaseRecord(database.id, rec.id, { [titleProp.id]: e.target.value })}
                  className="text-xs font-semibold bg-transparent outline-none text-foreground w-64 md:w-96 truncate"
                />
                {statusProp && rec.values[statusProp.id] && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                    {rec.values[statusProp.id]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {dateProp && rec.values[dateProp.id] && <span>{rec.values[dateProp.id]}</span>}
                <button
                  onClick={() => deleteDatabaseRecord(database.id, rec.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => handleAddRecord()}
            className="w-full p-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </button>
        </div>
      )}

      {/* 5. CALENDAR VIEW */}
      {activeView?.type === 'calendar' && (
        <div className="border border-border rounded-xl bg-card p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-muted-foreground uppercase">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const dateString = `2026-10-${day.toString().padStart(2, '0')}`;
              const dayRecords = processedRecords.filter((r) => r.values['prop-due'] === dateString);
              return (
                <div
                  key={day}
                  className="min-h-[85px] p-2 bg-muted/20 border border-border/40 rounded-lg flex flex-col justify-between"
                >
                  <span className="text-[11px] font-mono text-muted-foreground">{day}</span>
                  <div className="space-y-1">
                    {dayRecords.map((r) => (
                      <div
                        key={r.id}
                        className="text-[10px] bg-accent/15 text-accent border border-accent/20 rounded px-1.5 py-0.5 truncate font-medium"
                      >
                        {r.values[titleProp?.id] || 'Untitled'}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TIMELINE (GANTT) VIEW */}
      {activeView?.type === 'timeline' && (
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">October 2026 Timeline</span>
            <span>Days 1 – 31</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px] p-4">
              {/* Day header timeline ticks */}
              <div className="flex border-b border-border pb-2 mb-3 text-[10px] font-mono text-muted-foreground">
                <div className="w-56 flex-shrink-0 font-sans font-semibold">Task Name</div>
                <div className="flex-1 grid grid-cols-31 text-center">
                  {Array.from({ length: 31 }, (_, i) => (
                    <div key={i} className="text-center">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Gantt rows */}
              <div className="space-y-3">
                {processedRecords.map((rec) => {
                  const dueDate = rec.values['prop-due'];
                  // Parse day (1-31)
                  const dayNum = dueDate ? parseInt(dueDate.split('-')[2], 10) : 15;
                  const leftPercent = Math.max(0, Math.min(90, ((dayNum - 1) / 31) * 100));

                  return (
                    <div key={rec.id} className="flex items-center text-xs group">
                      <div className="w-56 flex-shrink-0 font-medium truncate pr-2">
                        {rec.values[titleProp?.id] || 'Untitled'}
                      </div>
                      <div className="flex-1 relative h-7 bg-muted/20 rounded border border-border/40">
                        <div
                          style={{ left: `${leftPercent}%` }}
                          className="absolute top-1 h-5 px-2 bg-accent text-accent-foreground rounded text-[10px] font-semibold flex items-center shadow-xs cursor-pointer hover:opacity-90"
                        >
                          {dueDate || 'Scheduled'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RELATION RECORD PICKER MODAL */}
      {relationPickerRecordId && relationPickerPropId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-2xl max-w-md w-full">
            {(() => {
              const prop = database.properties.find((p) => p.id === relationPickerPropId);
              const targetDb = prop?.relationDatabaseId ? databases[prop.relationDatabaseId] : database;
              const targetTitleProp =
                targetDb?.properties.find((p) => p.type === 'title') || targetDb?.properties[0];
              const record = database.records.find((r) => r.id === relationPickerRecordId);
              const currentLinked: string[] = Array.isArray(record?.values[relationPickerPropId])
                ? record!.values[relationPickerPropId]
                : record?.values[relationPickerPropId]
                ? [record!.values[relationPickerPropId]]
                : [];

              const targetRecords = (targetDb?.records || []).filter((r) => {
                if (!relationSearchQuery) return true;
                const title = String(r.values[targetTitleProp?.id] || '');
                return title.toLowerCase().includes(relationSearchQuery.toLowerCase());
              });

              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Link Records</h3>
                      <p className="text-xs text-muted-foreground">From {targetDb?.title || 'Target Database'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setRelationPickerRecordId(null);
                        setRelationPickerPropId(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={relationSearchQuery}
                      onChange={(e) => setRelationSearchQuery(e.target.value)}
                      placeholder="Search records to link..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-accent text-foreground"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
                    {targetRecords.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">No records found.</div>
                    ) : (
                      targetRecords.map((tr) => {
                        const isLinked = currentLinked.includes(tr.id);
                        const title = tr.values[targetTitleProp?.id] || 'Untitled';
                        return (
                          <div
                            key={tr.id}
                            onClick={() => {
                              const updated = isLinked
                                ? currentLinked.filter((id) => id !== tr.id)
                                : [...currentLinked, tr.id];
                              updateDatabaseRecord(database.id, relationPickerRecordId, {
                                [relationPickerPropId]: updated,
                              });
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                              isLinked
                                ? 'bg-accent/10 border-accent/30 text-foreground font-medium'
                                : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{title}</span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isLinked ? 'bg-accent border-accent text-accent-foreground' : 'border-border'
                              }`}
                            >
                              {isLinked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setRelationPickerRecordId(null);
                        setRelationPickerPropId(null);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium"
                    >
                      Done
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
