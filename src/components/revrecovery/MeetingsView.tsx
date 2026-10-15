'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckSquare,
  Building,
  Briefcase,
  ListPlus,
} from 'lucide-react';
import { Meeting, MeetingType, MeetingActionItem } from '@/types/revrecovery';
import { AddMeetingModal } from './QuickModals';

export const MeetingsView: React.FC = () => {
  const {
    meetings,
    selectedMeetingId,
    setSelectedMeetingId,
    updateMeeting,
    convertActionItemToTask,
    teamMembers,
    companies,
    setActiveModule,
  } = useRevRecoveryStore();

  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [newActionItemTitle, setNewActionItemTitle] = useState('');
  const [actionItemOwner, setActionItemOwner] = useState(teamMembers[0]?.name || 'Sanskar Anand');
  const [convertNotice, setConvertNotice] = useState<string | null>(null);

  const activeMeeting =
    meetings.find((m) => m.id === selectedMeetingId) || meetings[0] || null;

  const handleAddActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionItemTitle.trim() || !activeMeeting) return;

    const newItem: MeetingActionItem = {
      id: `act-${Date.now()}`,
      title: newActionItemTitle.trim(),
      assignedTo: actionItemOwner,
      dueDate: activeMeeting.date,
    };

    await updateMeeting(activeMeeting.id, {
      actionItems: [...activeMeeting.actionItems, newItem],
    });

    setNewActionItemTitle('');
  };

  const handleConvert = async (actionItemId: string) => {
    if (!activeMeeting) return;
    const task = await convertActionItemToTask(activeMeeting.id, actionItemId);
    if (task) {
      setConvertNotice(`Created new task: "${task.title}" assigned to ${task.assignedTo}!`);
      setTimeout(() => setConvertNotice(null), 4000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Meetings & Strategic Decision Log</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
              {meetings.length} calls & syncs
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Discovery calls, kickoff reviews, decision records, and action items convertible to operational tasks
          </p>
        </div>

        <button
          onClick={() => setAddMeetingOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 shadow-sm transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          + Schedule Meeting
        </button>
      </div>

      {convertNotice && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{convertNotice}</span>
          </div>
          <button
            onClick={() => setActiveModule('tasks')}
            className="text-xs underline font-semibold hover:opacity-80"
          >
            View in Tasks →
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Meeting List */}
        <div className="w-80 border-r border-border bg-muted/20 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 border-b border-border bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Scheduled Calls & Syncs
          </div>
          <div className="divide-y divide-border">
            {meetings.map((m) => {
              const pendingActions = m.actionItems.filter((a) => !a.convertedToTaskId).length;
              const comp = companies.find((c) => c.id === m.relatedCompanyId);

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`p-3.5 hover:bg-muted/40 cursor-pointer transition-colors ${
                    activeMeeting?.id === m.id ? 'bg-card border-l-2 border-accent shadow-xs' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-foreground">{m.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                      {m.type}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{comp?.name || 'RevRecovery'}</span>
                    <span className="font-mono text-[11px]">{m.date}</span>
                  </div>

                  {m.actionItems.length > 0 && (
                    <div className="mt-2 text-[11px] text-accent font-medium flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      <span>{pendingActions} action item(s) to convert</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane */}
        {activeMeeting ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card">
            {/* Header info */}
            <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent uppercase tracking-wider">
                    {activeMeeting.type}
                  </span>
                  <h2 className="text-lg font-bold text-foreground mt-1">{activeMeeting.title}</h2>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>{activeMeeting.date} {activeMeeting.time}</span>
                    <span>•</span>
                    <span>{activeMeeting.durationMinutes} mins</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground">
                      {companies.find((c) => c.id === activeMeeting.relatedCompanyId)?.name || 'Internal'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500">
                    {activeMeeting.outcome}
                  </span>
                </div>
              </div>

              {/* Attendees */}
              <div className="pt-2 border-t border-border flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground text-[11px]">Attendees:</span>
                {activeMeeting.attendees.map((att, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                    {att}
                  </span>
                ))}
              </div>
            </div>

            {/* Agenda & Rich Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Agenda & Focus Areas
                </h3>
                <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {activeMeeting.agenda}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Meeting Notes & Key Takeaways
                </h3>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {activeMeeting.notes}
                </p>
              </div>
            </div>

            {/* Key Decisions */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Documented Decisions
              </h3>
              {!activeMeeting.decisions ? (
                <p className="text-xs text-muted-foreground">No decisions formally logged for this meeting.</p>
              ) : (
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {activeMeeting.decisions}
                </p>
              )}
            </div>

            {/* ACTION ITEMS CONVERTIBLE TO REAL TASKS */}
            <div className="p-5 rounded-xl border border-accent/30 bg-accent/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-accent" /> Action Items & Next Steps
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Action items can be converted into actual tasks linked to this meeting with one click.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-accent">
                  {activeMeeting.actionItems.length} items logged
                </span>
              </div>

              {/* Action items list */}
              <div className="space-y-2">
                {activeMeeting.actionItems.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-card border border-border rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{act.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Assigned to: {act.assignedTo} • Due: {act.dueDate}
                      </div>
                    </div>

                    <div>
                      {act.convertedToTaskId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-500 font-semibold bg-emerald-500/10 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Converted to Task
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConvert(act.id)}
                          className="px-3 py-1.5 rounded-lg bg-accent hover:opacity-90 text-accent-foreground font-medium text-xs flex items-center gap-1.5 transition-opacity shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Convert to Task
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Action Item Form */}
              <form onSubmit={handleAddActionItem} className="pt-3 border-t border-border flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New action item from call..."
                  value={newActionItemTitle}
                  onChange={(e) => setNewActionItemTitle(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg"
                />
                <select
                  value={actionItemOwner}
                  onChange={(e) => setActionItemOwner(e.target.value)}
                  className="px-2 py-2 text-xs bg-background border border-border rounded-lg"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium text-xs rounded-lg border border-border flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            No meeting selected.
          </div>
        )}
      </div>

      <AddMeetingModal isOpen={addMeetingOpen} onClose={() => setAddMeetingOpen(false)} />
    </div>
  );
};
