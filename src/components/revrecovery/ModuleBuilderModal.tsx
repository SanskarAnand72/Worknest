'use client';

import React, { useState } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Table,
  Kanban,
  CheckSquare,
  FolderGit2,
  Calendar,
  BookOpen,
  BarChart3,
  FileText,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Tag,
  Sliders,
  Link as LinkIcon,
  Copy,
} from 'lucide-react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  CustomModule,
  CustomModuleType,
  CustomFieldDefinition,
  CustomFieldType,
  CustomModuleStage,
  CustomModuleViewConfig,
  CustomModuleRelation,
  TeamRole,
} from '@/types/revrecovery';
import { generateId } from '@/lib/utils';

interface ModuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (moduleId: string) => void;
}

const MODULE_TYPE_OPTIONS: {
  type: CustomModuleType;
  label: string;
  desc: string;
  icon: any;
  defaultStages: string[];
}[] = [
  {
    type: 'database',
    label: 'Database / Table',
    desc: 'Structured multi-property spreadsheet with filtering, sorting & saved views',
    icon: Table,
    defaultStages: ['Active', 'Archived'],
  },
  {
    type: 'kanban',
    label: 'Kanban Workflow',
    desc: 'Visual drag-and-drop workflow pipeline across custom stages and statuses',
    icon: Kanban,
    defaultStages: ['Backlog', 'In Progress', 'In Review', 'Done'],
  },
  {
    type: 'crm',
    label: 'CRM / Pipeline',
    desc: 'Relationship and opportunity tracker with deal value, contacts & qualification',
    icon: Layers,
    defaultStages: ['New', 'Contacted', 'Interested', 'Won', 'Lost'],
  },
  {
    type: 'project',
    label: 'Project Tracker',
    desc: 'Deliverables tracker with milestones, priority tags, dates & client links',
    icon: FolderGit2,
    defaultStages: ['Planning', 'Active', 'In Review', 'Completed'],
  },
  {
    type: 'task_list',
    label: 'Task List',
    desc: 'Checklist and execution backlog with assignees, due dates and priority',
    icon: CheckSquare,
    defaultStages: ['Todo', 'In Progress', 'Completed'],
  },
  {
    type: 'content_calendar',
    label: 'Content Calendar',
    desc: 'Editorial scheduling for LinkedIn, newsletter, blog & case studies',
    icon: Calendar,
    defaultStages: ['Idea', 'Draft', 'Review', 'Scheduled', 'Published'],
  },
  {
    type: 'wiki',
    label: 'Documentation / Wiki',
    desc: 'Knowledge base and SOPs with categories, tags and rich-text docs',
    icon: BookOpen,
    defaultStages: ['Draft', 'Approved', 'Archived'],
  },
  {
    type: 'kpi_dashboard',
    label: 'KPI Dashboard',
    desc: 'Performance metric registry with target thresholds, periods & progress',
    icon: BarChart3,
    defaultStages: ['On Track', 'At Risk', 'Behind', 'Achieved'],
  },
  {
    type: 'simple_form',
    label: 'Simple Form & Intake',
    desc: 'Structured request form capturing inbound submissions and requirements',
    icon: FileText,
    defaultStages: ['Submitted', 'Processing', 'Approved', 'Rejected'],
  },
];

const CATEGORY_OPTIONS = [
  'Sales & Acquisition',
  'Client Delivery',
  'Operations',
  'Marketing & Growth',
  'HR & Hiring',
  'Finance & Commercials',
  'Engineering & Product',
  'General',
];

const STAGE_COLORS = [
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export const ModuleBuilderModal: React.FC<ModuleBuilderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addCustomModule, customModules, setActiveModule } = useRevRecoveryStore();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step A: Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📊');
  const [category, setCategory] = useState('Operations');
  const [accessRoles, setAccessRoles] = useState<TeamRole[]>(['owner', 'admin', 'member', 'viewer']);

  // Step B: Type
  const [moduleType, setModuleType] = useState<CustomModuleType>('kanban');

  // Step C: Custom Fields
  const [fields, setFields] = useState<CustomFieldDefinition[]>([
    {
      id: generateId(),
      name: 'Owner',
      key: 'owner',
      type: 'text',
      required: false,
      appearsInTable: true,
      searchable: true,
      filterable: true,
    },
    {
      id: generateId(),
      name: 'Priority',
      key: 'priority',
      type: 'select',
      required: false,
      options: ['Low', 'Medium', 'High', 'Critical'],
      defaultValue: 'Medium',
      appearsInTable: true,
      searchable: true,
      filterable: true,
    },
    {
      id: generateId(),
      name: 'Target Date',
      key: 'targetDate',
      type: 'date',
      required: false,
      appearsInTable: true,
      searchable: false,
      filterable: true,
    },
  ]);

  // Step D: Workflow Stages
  const [stages, setStages] = useState<CustomModuleStage[]>([
    { id: generateId(), name: 'Backlog', color: '#6366F1', order: 0 },
    { id: generateId(), name: 'In Progress', color: '#3B82F6', order: 1 },
    { id: generateId(), name: 'In Review', color: '#F59E0B', order: 2 },
    { id: generateId(), name: 'Completed', color: '#10B981', order: 3, isWon: true },
  ]);

  // Step E: Views
  const [enabledViews, setEnabledViews] = useState<{ table: boolean; board: boolean; list: boolean; calendar: boolean }>({
    table: true,
    board: true,
    list: true,
    calendar: false,
  });

  // Step F: Relations
  const [relations, setRelations] = useState<CustomModuleRelation[]>([]);

  // Helpers for adding fields & stages
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [newStageName, setNewStageName] = useState('');

  if (!isOpen) return null;

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const key = newFieldName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const options = ['select', 'multi-select'].includes(newFieldType)
      ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    const newField: CustomFieldDefinition = {
      id: generateId(),
      name: newFieldName.trim(),
      key,
      type: newFieldType,
      required: false,
      options,
      appearsInTable: true,
      searchable: true,
      filterable: true,
    };

    setFields([...fields, newField]);
    setNewFieldName('');
    setNewFieldOptions('');
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const color = STAGE_COLORS[stages.length % STAGE_COLORS.length];
    const newStage: CustomModuleStage = {
      id: generateId(),
      name: newStageName.trim(),
      color,
      order: stages.length,
    };
    setStages([...stages, newStage]);
    setNewStageName('');
  };

  const handleRemoveStage = (id: string) => {
    setStages(stages.filter((s) => s.id !== id));
  };

  const handleSelectModuleType = (type: CustomModuleType) => {
    setModuleType(type);
    const opt = MODULE_TYPE_OPTIONS.find((o) => o.type === type);
    if (opt && opt.defaultStages.length > 0) {
      setStages(
        opt.defaultStages.map((name, idx) => ({
          id: generateId(),
          name,
          color: STAGE_COLORS[idx % STAGE_COLORS.length],
          order: idx,
          isWon: idx === opt.defaultStages.length - 1,
        }))
      );
    }
  };

  const handleSaveModule = async () => {
    if (!name.trim()) {
      alert('Module name is required.');
      setCurrentStep(1);
      return;
    }

    const views: CustomModuleViewConfig[] = [];
    if (enabledViews.table) views.push({ id: generateId(), name: 'Table View', type: 'table', visibleFields: [] });
    if (enabledViews.board) views.push({ id: generateId(), name: 'Board View', type: 'board', visibleFields: [] });
    if (enabledViews.list) views.push({ id: generateId(), name: 'List View', type: 'list', visibleFields: [] });
    if (enabledViews.calendar) views.push({ id: generateId(), name: 'Calendar View', type: 'calendar', visibleFields: [] });

    try {
      const created = await addCustomModule({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: description.trim(),
        icon: icon || '📁',
        category,
        type: moduleType,
        accessRoles,
        fields,
        stages,
        views,
        relations,
      });

      setActiveModule(created.id);
      if (onSuccess) onSuccess(created.id);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to create module');
    }
  };

  const STEPS = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Type' },
    { num: 3, label: 'Fields' },
    { num: 4, label: 'Stages' },
    { num: 5, label: 'Views' },
    { num: 6, label: 'Relations' },
    { num: 7, label: 'Save' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/15 text-accent border border-accent/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Custom Operating Module Builder</h2>
              <p className="text-[11px] text-muted-foreground">
                Build databases, kanbans, client trackers, and custom business processes without code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-2.5 border-b border-border bg-muted/10 flex items-center justify-between shrink-0 overflow-x-auto">
          {STEPS.map((s) => (
            <div
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium py-1 px-2 rounded-md transition-colors ${
                currentStep === s.num
                  ? 'bg-accent/15 text-accent font-bold'
                  : currentStep > s.num
                  ? 'text-foreground'
                  : 'text-muted-foreground opacity-60'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
                  currentStep === s.num
                    ? 'bg-accent text-accent-foreground font-bold'
                    : currentStep > s.num
                    ? 'bg-muted text-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > s.num ? <Check className="w-3 h-3" /> : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {/* STEP 1: Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Step A — Module Identity & Details</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Give your custom operating module a name, purpose, icon, and organizational category.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-[11px] text-muted-foreground block mb-1">Icon</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full text-center text-xl py-1.5 bg-background border border-border rounded-lg"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] text-muted-foreground block mb-1">Module Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client Onboarding, Campaign Tracker, Hiring Pipeline"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Description & Objective</label>
                <textarea
                  rows={2}
                  placeholder="Explain what business workflows and records this module tracks..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Module Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Who Can Access</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {(['owner', 'admin', 'member', 'viewer'] as TeamRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          if (accessRoles.includes(r)) {
                            if (accessRoles.length > 1) setAccessRoles(accessRoles.filter((x) => x !== r));
                          } else {
                            setAccessRoles([...accessRoles, r]);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                          accessRoles.includes(r)
                            ? 'bg-accent/20 text-accent border border-accent/40'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Type */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Step B — Choose a Module Type</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select the structural paradigm. Each type offers tailored layouts, cards, and default properties.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MODULE_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = moduleType === opt.type;

                  return (
                    <div
                      key={opt.type}
                      onClick={() => handleSelectModuleType(opt.type)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent'
                          : 'border-border bg-card hover:border-accent/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Custom Fields */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Step C — Define Custom Fields</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add custom data fields without writing code. Supported types: text, number, date, select, checkbox, currency, url, email.
                </p>
              </div>

              {/* Add Field Bar */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 flex flex-wrap items-end gap-2.5">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] text-muted-foreground block mb-1">Field Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Budget, LinkedIn URL, Status"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  />
                </div>

                <div className="w-36">
                  <label className="text-[10px] text-muted-foreground block mb-1">Field Type</label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                    className="w-full p-1.5 bg-background border border-border rounded-lg text-xs"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency ($)</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown Select</option>
                    <option value="multi-select">Multi-Select</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="url">URL Link</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                {['select', 'multi-select'].includes(newFieldType) && (
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[10px] text-muted-foreground block mb-1">Dropdown Options (comma separated)</label>
                    <input
                      type="text"
                      placeholder="High, Medium, Low"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>

              {/* Fields Table */}
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Field Name</th>
                      <th className="py-2 px-3 font-semibold">Type</th>
                      <th className="py-2 px-3 font-semibold">Options / Defaults</th>
                      <th className="py-2 px-3 font-semibold text-center">In Table</th>
                      <th className="py-2 px-3 font-semibold text-center">Filterable</th>
                      <th className="py-2 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fields.map((f) => (
                      <tr key={f.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-medium text-foreground">{f.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                            {f.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-[10px]">
                          {f.options ? f.options.join(', ') : f.defaultValue || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={f.appearsInTable}
                            onChange={(e) => {
                              setFields(fields.map((x) => x.id === f.id ? { ...x, appearsInTable: e.target.checked } : x));
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={f.filterable}
                            onChange={(e) => {
                              setFields(fields.map((x) => x.id === f.id ? { ...x, filterable: e.target.checked } : x));
                            }}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveField(f.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Configure Stages */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Step D — Configure Workflow Stages</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Define your own workflow stages and columns. Custom modules are never forced into sales stages.
                </p>
              </div>

              {/* Add Stage Input */}
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="e.g. Screening, Interview, Offer, Hired"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="px-3 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stage</span>
                </button>
              </div>

              {/* Stages List */}
              <div className="space-y-2 max-w-lg">
                {stages.map((st, idx) => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      <span className="font-semibold text-xs text-foreground">{st.name}</span>
                      {st.isWon && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-500">
                          Final / Completed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStages(stages.map((s) => s.id === st.id ? { ...s, isWon: !s.isWon } : s));
                        }}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {st.isWon ? 'Mark Normal' : 'Mark Success'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(st.id)}
                        className="p-1 text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Configure Views */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Step E — Select Supported Views</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Choose which views users can switch between inside this module.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md">
                <label className="p-3 rounded-lg border border-border bg-card flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledViews.table}
                    onChange={(e) => setEnabledViews({ ...enabledViews, table: e.target.checked })}
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">Table View</span>
                    <span className="text-[10px] text-muted-foreground">High-density data grid</span>
                  </div>
                </label>

                <label className="p-3 rounded-lg border border-border bg-card flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledViews.board}
                    onChange={(e) => setEnabledViews({ ...enabledViews, board: e.target.checked })}
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">Board / Kanban View</span>
                    <span className="text-[10px] text-muted-foreground">Columns for each stage</span>
                  </div>
                </label>

                <label className="p-3 rounded-lg border border-border bg-card flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledViews.list}
                    onChange={(e) => setEnabledViews({ ...enabledViews, list: e.target.checked })}
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">List View</span>
                    <span className="text-[10px] text-muted-foreground">Focused minimalist list</span>
                  </div>
                </label>

                <label className="p-3 rounded-lg border border-border bg-card flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledViews.calendar}
                    onChange={(e) => setEnabledViews({ ...enabledViews, calendar: e.target.checked })}
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">Calendar View</span>
                    <span className="text-[10px] text-muted-foreground">Date-scheduled cards</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 6: Relations */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Step F — Relations & Linking</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Link records in this module to existing business entities (e.g. Clients, Projects, Leads).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <span className="font-semibold text-xs text-foreground block">Standard Available Relations:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs">
                    <span className="font-bold text-foreground block">Clients</span>
                    <span className="text-[10px] text-muted-foreground">Link records to client accounts</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs">
                    <span className="font-bold text-foreground block">Projects</span>
                    <span className="text-[10px] text-muted-foreground">Link records to active sprints</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs">
                    <span className="font-bold text-foreground block">Prospects / Leads</span>
                    <span className="text-[10px] text-muted-foreground">Link to target accounts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Save & Review */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Step G — Review & Publish Module</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Your module will be registered immediately in the sidebar and persisted across sessions.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-lg bg-accent/15 text-accent">{icon}</span>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{name || 'Untitled Module'}</h4>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">{category} • {moduleType}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Custom Fields:</span>
                    <span className="font-bold text-foreground">{fields.length} fields</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Stages:</span>
                    <span className="font-bold text-foreground">{stages.length} workflow steps</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Access:</span>
                    <span className="font-bold text-foreground">{accessRoles.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-accent text-accent-foreground font-semibold text-xs hover:opacity-90"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveModule}
                className="flex items-center gap-1 px-5 py-2 rounded-lg bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Publish Custom Module</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
