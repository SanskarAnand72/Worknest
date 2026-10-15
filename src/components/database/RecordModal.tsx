'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  DatabaseRecord,
  DatabaseProperty,
  PropertyType,
  SelectOption,
} from '@/types';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { evaluateFormula } from '@/lib/formula';
import { evaluateRollup } from '@/lib/rollup';
import { formatDate } from '@/lib/utils';
import {
  X,
  Trash2,
  Copy,
  Calendar,
  CheckSquare,
  Hash,
  Type,
  Clock,
  Link as LinkIcon,
  Mail,
  Phone,
  Tag,
  Layers,
  Calculator,
  User,
  Plus,
  ExternalLink,
  MessageSquare,
  FileText,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface RecordModalProps {
  database: Database;
  recordId: string | null;
  onClose: () => void;
  onUpdateRecord: (recordId: string, values: Record<string, any>) => void;
  onDeleteRecord: (recordId: string) => void;
  onDuplicateRecord: (record: DatabaseRecord) => void;
  onOpenRelationPicker?: (recordId: string, propertyId: string) => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  database,
  recordId,
  onClose,
  onUpdateRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onOpenRelationPicker,
}) => {
  const { databases, currentUser } = useWorkspaceStore();
  const [commentInput, setCommentInput] = useState('');
  const [newTagInput, setNewTagInput] = useState<Record<string, string>>({});
  const [activeTagPickerPropId, setActiveTagPickerPropId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!recordId) return null;
  const record = database.records.find((r) => r.id === recordId);
  if (!record) return null;

  const titleProp = database.properties.find((p) => p.type === 'title') || database.properties[0];
  const title = titleProp ? record.values[titleProp.id] || 'Untitled' : 'Untitled';

  const handleTitleChange = (val: string) => {
    if (!titleProp) return;
    onUpdateRecord(record.id, { [titleProp.id]: val });
  };

  const handleValueChange = (propId: string, val: any) => {
    onUpdateRecord(record.id, { [propId]: val });
  };

  // Add Comment to record
  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    const existingComments = record.values._comments || [];
    const newComment = {
      id: `comm-${Date.now()}`,
      authorName: currentUser?.name || 'Sanskar Anand',
      avatarUrl: currentUser?.avatarUrl,
      content: commentInput.trim(),
      createdAt: Date.now(),
    };
    handleValueChange('_comments', [...existingComments, newComment]);
    setCommentInput('');
  };

  // Multi-select helpers
  const handleToggleMultiSelect = (prop: DatabaseProperty, optionName: string) => {
    const current: string[] = Array.isArray(record.values[prop.id]) ? record.values[prop.id] : [];
    const updated = current.includes(optionName)
      ? current.filter((o) => o !== optionName)
      : [...current, optionName];
    handleValueChange(prop.id, updated);
  };

  const handleAddNewOption = (prop: DatabaseProperty) => {
    const inputVal = (newTagInput[prop.id] || '').trim();
    if (!inputVal) return;

    // Add to property options if not present
    const existingOptions = prop.options || [];
    if (!existingOptions.some((o) => o.name.toLowerCase() === inputVal.toLowerCase())) {
      const colors = [
        'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
      ];
      const newOption: SelectOption = {
        id: `opt-${Date.now()}`,
        name: inputVal,
        color: colors[existingOptions.length % colors.length],
      };
      prop.options = [...existingOptions, newOption];
    }

    // Add to record values
    handleToggleMultiSelect(prop, inputVal);
    setNewTagInput((prev) => ({ ...prev, [prop.id]: '' }));
  };

  const renderPropertyIcon = (type: PropertyType) => {
    switch (type) {
      case 'title':
      case 'text':
        return <Type className="w-4 h-4 text-zinc-500" />;
      case 'number':
        return <Hash className="w-4 h-4 text-emerald-500" />;
      case 'select':
      case 'multi_select':
        return <Tag className="w-4 h-4 text-blue-500" />;
      case 'status':
        return <CheckSquare className="w-4 h-4 text-indigo-500" />;
      case 'date':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'checkbox':
        return <CheckSquare className="w-4 h-4 text-teal-500" />;
      case 'url':
        return <LinkIcon className="w-4 h-4 text-cyan-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-violet-500" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'person':
        return <User className="w-4 h-4 text-purple-500" />;
      case 'formula':
        return <Calculator className="w-4 h-4 text-rose-500" />;
      case 'relation':
        return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'rollup':
        return <Calculator className="w-4 h-4 text-orange-500" />;
      case 'created_time':
      case 'last_edited_time':
        return <Clock className="w-4 h-4 text-zinc-400" />;
      default:
        return <Tag className="w-4 h-4 text-zinc-400" />;
    }
  };

  const renderPropertyValue = (prop: DatabaseProperty) => {
    const val = record.values[prop.id];

    switch (prop.type) {
      case 'title':
        return null; // Rendered at the top as main title
      case 'text':
        return (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => handleValueChange(prop.id, e.target.value)}
            placeholder="Empty"
            className="w-full px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none border border-transparent focus:border-border transition-colors"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={val ?? ''}
            onChange={(e) =>
              handleValueChange(prop.id, e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="Empty"
            className="w-full px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none border border-transparent focus:border-border transition-colors font-mono"
          />
        );

      case 'status': {
        const statuses = ['To Do', 'In Progress', 'Done'];
        return (
          <select
            value={val || 'To Do'}
            onChange={(e) => handleValueChange(prop.id, e.target.value)}
            className="px-2.5 py-1 text-xs rounded-md font-medium bg-muted/80 border border-border text-foreground hover:bg-muted outline-none cursor-pointer"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        );
      }

      case 'select': {
        const options = prop.options || [];
        return (
          <select
            value={val || ''}
            onChange={(e) => handleValueChange(prop.id, e.target.value)}
            className="px-2.5 py-1 text-xs rounded-md bg-muted/80 border border-border text-foreground hover:bg-muted outline-none cursor-pointer"
          >
            <option value="">(Select an option)</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </select>
        );
      }

      case 'multi_select': {
        const selectedTags: string[] = Array.isArray(val) ? val : [];
        const isOpen = activeTagPickerPropId === prop.id;
        const availableOptions = prop.options || [];

        return (
          <div className="relative">
            <div
              onClick={() => setActiveTagPickerPropId(isOpen ? null : prop.id)}
              className="flex flex-wrap items-center gap-1.5 p-1 rounded-md hover:bg-muted/50 cursor-pointer min-h-[32px] border border-transparent hover:border-border"
            >
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMultiSelect(prop, tag);
                      }}
                      className="hover:opacity-70 text-[10px]"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground/60 px-1">+ Add tags</span>
              )}
            </div>

            {isOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-9 z-50 w-64 p-2 bg-card border border-border rounded-xl shadow-xl text-xs space-y-2"
              >
                <div className="font-semibold text-muted-foreground px-1">Select tags:</div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {availableOptions.map((opt) => {
                    const isChecked = selectedTags.includes(opt.name);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleToggleMultiSelect(prop, opt.name)}
                        className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted cursor-pointer"
                      >
                        <span className="font-medium text-foreground">{opt.name}</span>
                        {isChecked && <CheckSquare className="w-3.5 h-3.5 text-accent" />}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                  <input
                    type="text"
                    value={newTagInput[prop.id] || ''}
                    onChange={(e) =>
                      setNewTagInput((prev) => ({ ...prev, [prop.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewOption(prop);
                      }
                    }}
                    placeholder="New tag name..."
                    className="flex-1 px-2 py-1 bg-muted rounded border border-border text-foreground outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddNewOption(prop)}
                    className="px-2 py-1 rounded bg-accent text-accent-foreground text-xs hover:opacity-90 font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'date':
        return (
          <input
            type="date"
            value={val || ''}
            onChange={(e) => handleValueChange(prop.id, e.target.value)}
            className="px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none border border-transparent focus:border-border cursor-pointer"
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={!!val}
              onChange={(e) => handleValueChange(prop.id, e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-xs text-muted-foreground">{val ? 'Checked' : 'Unchecked'}</span>
          </label>
        );

      case 'url':
        return (
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="url"
              value={val || ''}
              onChange={(e) => handleValueChange(prop.id, e.target.value)}
              placeholder="https://..."
              className="flex-1 px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none border border-transparent focus:border-border transition-colors"
            />
            {val && (
              <a
                href={val.startsWith('http') ? val : `https://${val}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-accent"
                title="Open link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );

      case 'email':
        return (
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="email"
              value={val || ''}
              onChange={(e) => handleValueChange(prop.id, e.target.value)}
              placeholder="name@example.com"
              className="flex-1 px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none border border-transparent focus:border-border transition-colors"
            />
            {val && (
              <a
                href={`mailto:${val}`}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-accent"
                title="Send email"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );

      case 'phone':
        return (
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="tel"
              value={val || ''}
              onChange={(e) => handleValueChange(prop.id, e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="flex-1 px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none border border-transparent focus:border-border transition-colors font-mono"
            />
            {val && (
              <a
                href={`tel:${val}`}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-accent"
                title="Call phone"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );

      case 'person':
        return (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => handleValueChange(prop.id, e.target.value)}
            placeholder="Assignee name"
            className="w-full px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none border border-transparent focus:border-border"
          />
        );

      case 'formula': {
        const propMap: Record<string, any> = { ...record.values };
        database.properties.forEach((p) => {
          propMap[p.name] = record.values[p.id];
        });
        const computed = evaluateFormula(prop.formulaExpression || '', {
          properties: propMap,
        });
        return (
          <div className="px-2 py-1 text-sm font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded">
            {computed !== '' && computed !== null ? String(computed) : '—'}
          </div>
        );
      }

      case 'relation': {
        const relatedIds = Array.isArray(val) ? val : [];
        const targetDb = prop.relationDatabaseId ? databases[prop.relationDatabaseId] : null;
        const targetTitleProp = targetDb?.properties.find((p) => p.type === 'title') || targetDb?.properties[0];

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {relatedIds.map((rId: string) => {
              const relRecord = targetDb?.records.find((r) => r.id === rId);
              const label = (targetTitleProp && relRecord?.values[targetTitleProp.id]) || 'Record';
              return (
                <span
                  key={rId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                >
                  <Layers className="w-3 h-3" />
                  {label}
                  <button
                    onClick={() => {
                      const updated = relatedIds.filter((id) => id !== rId);
                      handleValueChange(prop.id, updated);
                    }}
                    className="hover:opacity-70 text-[10px]"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <button
              onClick={() => onOpenRelationPicker && onOpenRelationPicker(record.id, prop.id)}
              className="text-xs px-2 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground border border-dashed border-border"
            >
              + Link record
            </button>
          </div>
        );
      }

      case 'rollup': {
        const rollupResult = evaluateRollup(prop, {
          currentDatabase: database,
          recordValues: record.values,
          allDatabases: databases,
        });
        return (
          <div className="px-2 py-1 text-sm font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded">
            {rollupResult}
          </div>
        );
      }

      case 'created_time':
        return (
          <div className="px-2 py-1 text-xs text-muted-foreground font-mono">
            {formatDate(record.createdAt)}
          </div>
        );

      case 'last_edited_time':
        return (
          <div className="px-2 py-1 text-xs text-muted-foreground font-mono">
            {formatDate(record.updatedAt)}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => handleValueChange(prop.id, e.target.value)}
            className="w-full px-2 py-1 bg-transparent hover:bg-muted/50 focus:bg-muted rounded text-sm text-foreground outline-none"
          />
        );
    }
  };

  const comments = record.values._comments || [];
  const notes = record.values._notes || '';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          setActiveTagPickerPropId(null);
        }}
        className="bg-card w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Controls */}
        <div className="px-6 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{database.title}</span>
            <span>/</span>
            <span>Record Peek</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onDuplicateRecord(record)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Duplicate record"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onDeleteRecord(record.id);
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500 transition-colors"
              title="Delete record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Record Title */}
          <div>
            <div className="flex items-center gap-2 text-3xl font-bold tracking-tight mb-2">
              <span>{record.values._icon || '📄'}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled Record"
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 font-bold"
              />
            </div>
          </div>

          {/* Properties Grid */}
          <div className="space-y-2 border-y border-border/60 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Properties
            </div>

            <div className="grid grid-cols-[160px_1fr] gap-y-2 items-center text-sm">
              {database.properties.map((prop) => {
                if (prop.type === 'title') return null; // already rendered
                return (
                  <React.Fragment key={prop.id}>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium py-1">
                      {renderPropertyIcon(prop.type)}
                      <span className="truncate">{prop.name}</span>
                    </div>
                    <div className="min-w-0">{renderPropertyValue(prop)}</div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Record Document Content / Notes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span>Notes & Document Body</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleValueChange('_notes', e.target.value)}
              placeholder="Type your notes, meeting agenda, or task description for this record here..."
              rows={5}
              className="w-full p-3 bg-muted/20 hover:bg-muted/40 focus:bg-muted/50 rounded-xl border border-border text-foreground text-sm outline-none focus:border-accent transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Discussion & Comments Thread */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>Discussion ({comments.length})</span>
            </div>

            {comments.length > 0 ? (
              <div className="space-y-2">
                {comments.map((comm: any) => (
                  <div
                    key={comm.id}
                    className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">{comm.authorName}</span>
                      <span>{formatDate(comm.createdAt)}</span>
                    </div>
                    <p className="text-foreground text-sm">{comm.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No comments yet on this record.</p>
            )}

            {/* Add Comment Input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Add a comment to this record..."
                className="flex-1 px-3 py-2 bg-muted/40 rounded-xl border border-border text-foreground text-xs outline-none focus:border-accent"
              />
              <button
                onClick={handleAddComment}
                className="px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
