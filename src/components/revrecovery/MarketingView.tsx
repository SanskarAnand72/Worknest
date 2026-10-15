'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Share2,
  Plus,
  Copy,
  Check,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';
import { ContentItem } from '@/types/revrecovery';

export const MarketingView: React.FC = () => {
  const { contentItems, addContentItem, teamMembers } = useRevRecoveryStore();

  const [activeChannel, setActiveChannel] = useState<'all' | 'LinkedIn' | 'Outreach Template' | 'Case Study'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newContentOpen, setNewContentOpen] = useState(false);

  // New content form
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState<'LinkedIn' | 'Outreach Template' | 'Case Study'>('LinkedIn');
  const [draft, setDraft] = useState('');
  const [owner, setOwner] = useState(teamMembers[0]?.name || 'Sanskar Anand');

  const filteredItems = contentItems.filter((item) => {
    if (activeChannel !== 'all' && item.channel !== activeChannel) return false;
    return true;
  });

  const handleCopyDraft = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addContentItem({
      title: title.trim(),
      channel,
      type: channel === 'LinkedIn' ? 'Post' : 'Sequence',
      topicOrCampaign: 'RevRecovery B2B Acquisition',
      targetAudience: 'Founders & CROs',
      draft: draft.trim(),
      owner,
      status: 'Draft',
      plannedDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    });

    setNewContentOpen(false);
    setTitle('');
    setDraft('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Marketing & Outreach Messaging Engine</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
              {contentItems.length} campaigns & sequences
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            LinkedIn post planning, email outbound sequence library, and case studies
          </p>
        </div>

        <button
          onClick={() => setNewContentOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 shadow-sm transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          + New Content / Sequence
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
          {(['all', 'LinkedIn', 'Outreach Template', 'Case Study'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeChannel === ch
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {ch === 'all' ? 'All Content' : ch}
            </button>
          ))}
        </div>
      </div>

      {/* Content Library Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between space-y-4 shadow-xs hover:border-accent/40 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent">
                  {item.channel}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                  {item.status}
                </span>
              </div>

              <h3 className="font-bold text-sm text-foreground mb-1">{item.title}</h3>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mb-3">
                <span>Audience: {item.targetAudience}</span>
                <span>•</span>
                <span>Owner: {item.owner}</span>
              </div>

              {/* Draft Box */}
              <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs text-foreground whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed">
                {item.draft}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">
                Target: {item.plannedDate}
              </span>

              <button
                onClick={() => handleCopyDraft(item.id, item.draft)}
                className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-medium text-xs flex items-center gap-1.5 border border-border transition-colors"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Sequence</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Content Modal */}
      {newContentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-sm">Create New Marketing Copy or Outreach Sequence</h3>
            <form onSubmit={handleCreateContent} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3-Step Cold Email Sequence for B2B FinTech"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Outreach Template">Outreach Template</option>
                    <option value="Case Study">Case Study</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Owner</label>
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                  >
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Draft Content *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Subject: Quick question regarding {{company}} sales pipeline..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewContentOpen(false)}
                  className="px-3 py-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-accent text-accent-foreground font-medium rounded-lg hover:opacity-90"
                >
                  Save Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
