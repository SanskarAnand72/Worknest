'use client';

import React, { useState } from 'react';
import {
  Table as TableIcon,
  Kanban,
  List,
  Calendar,
  Plus,
  Search,
  Filter,
  Trash2,
  Copy,
  Settings,
  MoreVertical,
  CheckCircle,
  Archive,
  ArrowUpDown,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { CustomModule, CustomRecord, CustomFieldDefinition } from '@/types/revrecovery';
import { generateId } from '@/lib/utils';

interface CustomModuleViewProps {
  moduleId: string;
}

export const CustomModuleView: React.FC<CustomModuleViewProps> = ({ moduleId }) => {
  const {
    customModules,
    customRecords,
    addCustomRecord,
    updateCustomRecord,
    deleteCustomRecord,
    archiveCustomRecord,
    duplicateCustomModule,
    deleteCustomModule,
    setActiveModule,
  } = useRevRecoveryStore();

  const module = customModules.find((m) => m.id === moduleId);

  const [activeViewType, setActiveViewType] = useState<'table' | 'board' | 'list'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [addRecordModalOpen, setAddRecordModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // New record form state
  const [newTitle, setNewTitle] = useState('');
  const [newStageId, setNewStageId] = useState('');
  const [newFormData, setNewFormData] = useState<Record<string, any>>({});

  if (!module) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <h2 className="text-lg font-bold text-foreground">Module not found</h2>
        <p className="text-xs text-muted-foreground mt-1">This custom operating module may have been deleted.</p>
        <button
          onClick={() => setActiveModule('hq')}
          className="mt-4 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold"
        >
          Return to HQ
        </button>
      </div>
    );
  }

  const moduleRecords = customRecords.filter((r) => r.moduleId === moduleId && !r.archived);

  // Filtered records
  const filteredRecords = moduleRecords.filter((r) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchData = Object.values(r.data || {}).some((val) =>
        String(val).toLowerCase().includes(q)
      );
      if (!matchTitle && !matchData) return false;
    }
    if (stageFilter !== 'all' && r.stageId !== stageFilter) return false;
    return true;
  });

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please provide a title for this record.');
      return;
    }

    try {
      await addCustomRecord({
        moduleId: module.id,
        title: newTitle.trim(),
        stageId: newStageId || (module.stages[0]?.id ?? ''),
        data: newFormData,
      });

      setNewTitle('');
      setNewFormData({});
      setAddRecordModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to create record');
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateCustomModule(module.id);
      setActiveModule(copy.id);
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate module');
    }
  };

  const handleDeleteModule = async () => {
    if (confirm(`Are you sure you want to delete module "${module.name}" and all its records?`)) {
      await deleteCustomModule(module.id);
      setActiveModule('hq');
    }
  };

  const activeRecord = selectedRecordId
    ? customRecords.find((r) => r.id === selectedRecordId)
    : null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-2xl p-2 rounded-xl bg-accent/15 text-accent border border-accent/20">
            {module.icon || '📁'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{module.name}</h1>
              <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono uppercase">
                {module.category}
              </span>
              <span className="px-2 py-0.5 text-[11px] rounded bg-muted text-muted-foreground font-mono">
                {filteredRecords.length} records
              </span>
            </div>
            {module.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{module.description}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setActiveViewType('table')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                activeViewType === 'table' ? 'bg-background shadow-xs text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setActiveViewType('board')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                activeViewType === 'board' ? 'bg-background shadow-xs text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setActiveViewType('list')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                activeViewType === 'list' ? 'bg-background shadow-xs text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
            title="Duplicate module template"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            Duplicate
          </button>

          <button
            onClick={handleDeleteModule}
            className="p-1.5 rounded-lg border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
            title="Delete custom module"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setNewStageId(module.stages[0]?.id || '');
              setAddRecordModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Record
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={`Search in ${module.name}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {module.stages.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px]">Workflow Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
            >
              <option value="all">All Stages</option>
              {module.stages.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Main Views Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {/* Empty State */}
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-border rounded-2xl p-8 text-center max-w-lg mx-auto my-12 bg-card/50">
              <div className="p-3.5 rounded-2xl bg-accent/10 text-accent mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">
                No records yet in {module.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Start adding your first record to track custom data, workflow stages, and properties.
              </p>
              <button
                onClick={() => {
                  setNewStageId(module.stages[0]?.id || '');
                  setAddRecordModalOpen(true);
                }}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold text-xs hover:opacity-90 shadow-sm transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Record</span>
              </button>
            </div>
          ) : (
            <>
              {/* Table View */}
              {activeViewType === 'table' && (
                <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/60 border-b border-border text-muted-foreground select-none">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Title / Record Name</th>
                        {module.stages.length > 0 && (
                          <th className="py-2.5 px-3 font-semibold">Stage</th>
                        )}
                        {module.fields.filter((f) => f.appearsInTable).map((field) => (
                          <th key={field.id} className="py-2.5 px-3 font-semibold">{field.name}</th>
                        ))}
                        <th className="py-2.5 px-3 font-semibold">Created</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRecords.map((record) => {
                        const currentStage = module.stages.find((s) => s.id === record.stageId);

                        return (
                          <tr
                            key={record.id}
                            onClick={() => setSelectedRecordId(record.id)}
                            className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                              selectedRecordId === record.id ? 'bg-accent/10' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-foreground">
                              {record.title}
                            </td>

                            {module.stages.length > 0 && (
                              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={record.stageId || ''}
                                  onChange={(e) => updateCustomRecord(record.id, { stageId: e.target.value })}
                                  className="bg-background border border-border rounded-md px-2 py-1 text-xs font-medium focus:outline-none"
                                >
                                  {module.stages.map((st) => (
                                    <option key={st.id} value={st.id}>{st.name}</option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {module.fields.filter((f) => f.appearsInTable).map((field) => {
                              const val = record.data?.[field.key];
                              return (
                                <td key={field.id} className="py-3 px-3 text-muted-foreground">
                                  {field.type === 'currency' && val != null ? (
                                    <span className="font-mono font-medium text-foreground">${Number(val).toLocaleString()}</span>
                                  ) : field.type === 'checkbox' ? (
                                    <span>{val ? '✓ Yes' : '✕ No'}</span>
                                  ) : (
                                    <span>{val !== undefined && val !== null ? String(val) : '—'}</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-3 px-3 text-muted-foreground text-[11px]">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => archiveCustomRecord(record.id)}
                                  title="Archive Record"
                                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteCustomRecord(record.id)}
                                  title="Delete Record"
                                  className="p-1 rounded text-muted-foreground hover:text-rose-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Board / Kanban View */}
              {activeViewType === 'board' && (
                <div className="flex gap-4 overflow-x-auto pb-6 h-full items-start">
                  {(module.stages.length > 0
                    ? module.stages
                    : [{ id: 'all', name: 'All Records', color: '#6366F1' }]
                  ).map((st) => {
                    const colRecords = module.stages.length > 0
                      ? filteredRecords.filter((r) => r.stageId === st.id)
                      : filteredRecords;

                    return (
                      <div
                        key={st.id}
                        className="w-72 shrink-0 bg-muted/40 border border-border rounded-xl flex flex-col max-h-[80vh] shadow-xs"
                      >
                        {/* Header */}
                        <div className="p-3 border-b border-border bg-card rounded-t-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                            <span className="font-bold text-xs text-foreground">{st.name}</span>
                          </div>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono text-muted-foreground font-bold">
                            {colRecords.length}
                          </span>
                        </div>

                        {/* Cards */}
                        <div className="p-2 space-y-2 overflow-y-auto flex-1">
                          {colRecords.map((rec) => (
                            <div
                              key={rec.id}
                              onClick={() => setSelectedRecordId(rec.id)}
                              className="p-3 rounded-lg bg-card border border-border hover:border-accent/40 cursor-pointer shadow-2xs space-y-2 transition-all"
                            >
                              <div className="font-bold text-xs text-foreground">{rec.title}</div>
                              {/* Preview First 2 Custom Fields */}
                              <div className="space-y-1 text-[11px] text-muted-foreground">
                                {module.fields.slice(0, 2).map((f) => {
                                  const val = rec.data?.[f.key];
                                  if (val == null) return null;
                                  return (
                                    <div key={f.id} className="flex items-center justify-between">
                                      <span>{f.name}:</span>
                                      <span className="font-medium text-foreground">{String(val)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List View */}
              {activeViewType === 'list' && (
                <div className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden">
                  {filteredRecords.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRecordId(r.id)}
                      className="p-3 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-foreground">{r.title}</span>
                        {r.stageId && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-medium">
                            {module.stages.find((s) => s.id === r.stageId)?.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomRecord(r.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Record Detail Drawer */}
        {activeRecord && (
          <div className="w-96 border-l border-border bg-card p-5 overflow-y-auto flex flex-col justify-between shrink-0 shadow-lg">
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    {module.name} Record
                  </span>
                  <h3 className="font-bold text-base text-foreground mt-0.5">{activeRecord.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedRecordId(null)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stage selector */}
              {module.stages.length > 0 && (
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Workflow Stage</label>
                  <select
                    value={activeRecord.stageId || ''}
                    onChange={(e) => updateCustomRecord(activeRecord.id, { stageId: e.target.value })}
                    className="w-full p-2 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    {module.stages.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Properties Editor */}
              <div className="space-y-3 pt-3 border-t border-border">
                <span className="font-semibold text-xs text-foreground block">Module Properties</span>
                {module.fields.map((field) => {
                  const val = activeRecord.data?.[field.key];

                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="text-[11px] text-muted-foreground block">{field.name}</label>
                      {field.type === 'select' ? (
                        <select
                          value={val || ''}
                          onChange={(e) => {
                            const updatedData = { ...activeRecord.data, [field.key]: e.target.value };
                            updateCustomRecord(activeRecord.id, { data: updatedData });
                          }}
                          className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                        >
                          <option value="">Select option...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!val}
                            onChange={(e) => {
                              const updatedData = { ...activeRecord.data, [field.key]: e.target.checked };
                              updateCustomRecord(activeRecord.id, { data: updatedData });
                            }}
                          />
                          <span>Checked</span>
                        </label>
                      ) : (
                        <input
                          type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          value={val !== undefined && val !== null ? val : ''}
                          onChange={(e) => {
                            const updatedData = { ...activeRecord.data, [field.key]: e.target.value };
                            updateCustomRecord(activeRecord.id, { data: updatedData });
                          }}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => {
                  archiveCustomRecord(activeRecord.id);
                  setSelectedRecordId(null);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
              <button
                onClick={() => {
                  deleteCustomRecord(activeRecord.id);
                  setSelectedRecordId(null);
                }}
                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Record Modal */}
      {addRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <h3 className="font-bold text-sm text-foreground">Add New Record to {module.name}</h3>
              <button onClick={() => setAddRecordModalOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div>
                <label className="text-[11px] font-medium text-foreground block mb-1">Title / Primary Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Record title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {module.stages.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium text-foreground block mb-1">Workflow Stage</label>
                  <select
                    value={newStageId}
                    onChange={(e) => setNewStageId(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                  >
                    {module.stages.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Inputs for Module's Custom Fields */}
              {module.fields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground block">
                    {field.name} {field.required && '*'}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={newFormData[field.key] || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, [field.key]: e.target.value })}
                      className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                    >
                      <option value="">Select option...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!newFormData[field.key]}
                        onChange={(e) => setNewFormData({ ...newFormData, [field.key]: e.target.checked })}
                      />
                      <span>Active / Enabled</span>
                    </label>
                  ) : (
                    <input
                      type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      placeholder={field.type === 'currency' ? '$0.00' : ''}
                      value={newFormData[field.key] || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                    />
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddRecordModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground font-semibold text-xs hover:opacity-90 shadow-sm"
                >
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
