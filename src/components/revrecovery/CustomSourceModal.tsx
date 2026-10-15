'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle, Share2, Tag } from 'lucide-react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { OutreachSourceConfig } from '@/types/revrecovery';

interface CustomSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomSourceModal: React.FC<CustomSourceModalProps> = ({ isOpen, onClose }) => {
  const { outreachSources, addOutreachSource, updateOutreachSource, deleteOutreachSource } = useRevRecoveryStore();

  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceColor, setNewSourceColor] = useState('#6366F1');
  const [newSourceDesc, setNewSourceDesc] = useState('');

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    await addOutreachSource({
      name: newSourceName.trim(),
      active: true,
      color: newSourceColor,
      description: newSourceDesc.trim(),
      isCustom: true,
    });

    setNewSourceName('');
    setNewSourceDesc('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Configure Acquisition Sources</h2>
              <p className="text-[11px] text-muted-foreground">Add, rename, or toggle outreach and inbound channels</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Add New Source */}
          <form onSubmit={handleAdd} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
            <span className="font-bold text-xs text-foreground block">Add Custom Source</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Substack, Podcast, Cold Call"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="color"
                  value={newSourceColor}
                  onChange={(e) => setNewSourceColor(e.target.value)}
                  className="w-full h-8 p-1 bg-background border border-border rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <input
                type="text"
                placeholder="Short description (optional)"
                value={newSourceDesc}
                onChange={(e) => setNewSourceDesc(e.target.value)}
                className="flex-1 mr-2 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-semibold text-xs hover:opacity-90 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Existing Sources List */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            <span className="font-semibold text-muted-foreground text-[11px] block">Active & Custom Sources</span>
            {outreachSources.map((source) => (
              <div
                key={source.id}
                className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: source.color || '#6366F1' }} />
                  <div>
                    <span className="font-semibold text-xs text-foreground">{source.name}</span>
                    {source.isCustom && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-accent/15 text-accent font-mono">
                        Custom
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateOutreachSource(source.id, { active: !source.active })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      source.active
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {source.active ? 'Active' : 'Inactive'}
                  </button>

                  {source.isCustom && (
                    <button
                      type="button"
                      onClick={() => deleteOutreachSource(source.id)}
                      className="p-1 rounded text-muted-foreground hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-border flex justify-end bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground font-semibold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
