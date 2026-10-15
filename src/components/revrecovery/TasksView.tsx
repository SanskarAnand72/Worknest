'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  User,
  Trash2,
  CheckCircle2,
  Circle,
  FolderGit2,
  Building,
} from 'lucide-react';
import { TaskPriority, RevTask } from '@/types/revrecovery';
import { QuickAddTaskModal } from './QuickModals';

export const TasksView: React.FC = () => {
  const {
    tasks,
    updateTask,
    deleteTask,
    toggleSubtask,
    teamMembers,
    projects,
    clients,
    companies,
  } = useRevRecoveryStore();

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'today' | 'upcoming' | 'overdue' | 'done'>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const now = Date.now();

  const filteredTasks = tasks.filter((task) => {
    if (searchTerm) {
      const match =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }

    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (selectedAssignee !== 'all' && task.assignedTo !== selectedAssignee) return false;

    const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : null;

    if (activeTab === 'my') {
      return task.assignedTo === 'Sanskar Anand';
    } else if (activeTab === 'today') {
      if (task.status === 'Done' || !dueTime) return false;
      const diff = dueTime - now;
      return diff >= 0 && diff <= 86400000;
    } else if (activeTab === 'upcoming') {
      if (task.status === 'Done' || !dueTime) return false;
      return dueTime > now + 86400000;
    } else if (activeTab === 'overdue') {
      if (task.status === 'Done' || !dueTime) return false;
      return dueTime < now;
    } else if (activeTab === 'done') {
      return task.status === 'Done';
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header Toolbar */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Tasks & Operational Workflows</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
              {tasks.filter((t) => t.status !== 'Done').length} pending
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Shared team task management with project links, subtasks, priorities, and deadlines
          </p>
        </div>

        <button
          onClick={() => setAddTaskOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 shadow-sm transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          + New Task
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
          {(
            [
              { id: 'all', label: 'All Tasks' },
              { id: 'my', label: 'My Tasks' },
              { id: 'today', label: 'Today' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'overdue', label: 'Overdue 🔥' },
              { id: 'done', label: 'Completed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Priority & Assignee Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical 🔥</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Assignees</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
            No tasks found in this view.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue =
              task.status !== 'Done' && task.dueDate && new Date(task.dueDate).getTime() < now;

            const proj = projects.find((p) => p.id === task.relatedProjectId);
            const cl = clients.find((c) => c.id === task.relatedClientId);
            const clientComp = companies.find((co) => co.id === cl?.companyId);

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border bg-card hover:border-accent/40 transition-all flex items-start gap-3 shadow-xs ${
                  task.status === 'Done' ? 'opacity-60 bg-muted/20' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() =>
                    updateTask(task.id, {
                      status: task.status === 'Done' ? 'Todo' : 'Done',
                      completedAt: task.status === 'Done' ? undefined : Date.now(),
                    })
                  }
                  className="mt-0.5 text-accent hover:opacity-80"
                >
                  {task.status === 'Done' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-semibold text-sm ${
                        task.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {task.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          task.priority === 'Critical'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : task.priority === 'High'
                            ? 'bg-orange-500/15 text-orange-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}

                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {task.subtasks.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => toggleSubtask(task.id, st.id)}
                          className="flex items-center gap-2 text-[11px] cursor-pointer hover:text-foreground text-muted-foreground"
                        >
                          <input
                            type="checkbox"
                            checked={st.completed}
                            readOnly
                            className="w-3 h-3 rounded"
                          />
                          <span className={st.completed ? 'line-through text-muted-foreground' : ''}>
                            {st.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta Bar */}
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2.5 pt-2 border-t border-border/60">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {task.assignedTo}
                    </span>

                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-bold' : ''}`}>
                      <Calendar className="w-3 h-3" />
                      {task.dueDate || 'No due date'}
                      {isOverdue && ' (Overdue)'}
                    </span>

                    {proj && (
                      <span className="flex items-center gap-1">
                        <FolderGit2 className="w-3 h-3 text-accent" /> {proj.name}
                      </span>
                    )}

                    {clientComp && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-emerald-500" /> {clientComp.name}
                      </span>
                    )}

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="ml-auto text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <QuickAddTaskModal isOpen={addTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
};
