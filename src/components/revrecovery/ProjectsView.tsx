'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  FolderGit2,
  Plus,
  CheckCircle2,
  Calendar,
  User,
  Building,
  Target,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { Project, ProjectStatus } from '@/types/revrecovery';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    tasks,
    clients,
    companies,
    teamMembers,
    addProject,
    toggleMilestone,
    setActiveModule,
  } = useRevRecoveryStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  // New project modal form state
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projClientId, setProjClientId] = useState('');
  const [projOwner, setProjOwner] = useState(teamMembers[0]?.name || 'Sanskar Anand');

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  // Derive dynamic progress for active project
  const projectTasks = activeProject ? tasks.filter((t) => t.relatedProjectId === activeProject.id) : [];
  const completedTasks = projectTasks.filter((t) => t.status === 'Done').length;
  const derivedProgress =
    projectTasks.length > 0
      ? Math.round((completedTasks / projectTasks.length) * 100)
      : activeProject?.milestones && activeProject.milestones.length > 0
      ? Math.round(
          (activeProject.milestones.filter((m) => m.completed).length / activeProject.milestones.length) * 100
        )
      : 0;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    await addProject({
      name: projName.trim(),
      description: projDesc.trim(),
      clientId: projClientId || undefined,
      status: 'Active',
      priority: 'High',
      owner: projOwner,
      teamMembers: [projOwner],
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      milestones: [
        { id: 'm-1', title: 'Target list build & ICP verification', dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], completed: false },
        { id: 'm-2', title: 'Sequence copywriting & domain setup', dueDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0], completed: false },
        { id: 'm-3', title: 'Outreach campaign launch', dueDate: new Date(Date.now() + 86400000 * 21).toISOString().split('T')[0], completed: false },
      ],
    });

    setNewProjectOpen(false);
    setProjName('');
    setProjDesc('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Client Delivery & Campaign Projects</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
              {projects.length} active projects
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Dynamic milestone tracking, linked client accounts, and task-derived completion progress
          </p>
        </div>

        <button
          onClick={() => setNewProjectOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 shadow-sm transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          + New Project
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Project Master List */}
        <div className="w-80 border-r border-border bg-muted/20 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 border-b border-border bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Delivery Projects
          </div>
          <div className="divide-y divide-border">
            {projects.map((proj) => {
              const projTasks = tasks.filter((t) => t.relatedProjectId === proj.id);
              const doneTasks = projTasks.filter((t) => t.status === 'Done').length;
              const pct = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 50;

              const cl = clients.find((c) => c.id === proj.clientId);
              const comp = companies.find((c) => c.id === cl?.companyId);

              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`p-3.5 hover:bg-muted/40 cursor-pointer transition-colors ${
                    activeProject?.id === proj.id ? 'bg-card border-l-2 border-accent shadow-xs' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-foreground">{proj.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent">
                      {proj.status}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{comp?.name || 'Internal'}</span>
                    <span>Lead: {proj.owner}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Derived Progress</span>
                      <span className="font-mono font-medium">{pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                      <div className="bg-accent h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Detail Pane */}
        {activeProject ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card">
            {/* Project Header Card */}
            <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{activeProject.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{activeProject.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-accent">{derivedProgress}%</span>
                  <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">
                    Real Derived Progress
                  </span>
                </div>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Client Account:</span>
                  <span className="font-semibold text-foreground">
                    {companies.find((c) => c.id === clients.find((cl) => cl.id === activeProject.clientId)?.companyId)?.name || 'Internal'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Project Owner:</span>
                  <span className="font-medium text-foreground">{activeProject.owner}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Status:</span>
                  <span className="font-medium text-accent">{activeProject.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Target Delivery:</span>
                  <span>{activeProject.targetDate}</span>
                </div>
              </div>
            </div>

            {/* Milestones Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" /> Key Deliverable Milestones
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {activeProject.milestones.filter((m) => m.completed).length} / {activeProject.milestones.length} completed
                </span>
              </div>

              <div className="space-y-2">
                {activeProject.milestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => toggleMilestone(activeProject.id, m.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      m.completed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-card border-border hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" checked={m.completed} readOnly className="w-4 h-4 rounded text-accent" />
                      <span className={`text-xs font-semibold ${m.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {m.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Due {m.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Tasks in this project */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500" /> Linked Tasks ({projectTasks.length})
                </h3>
                <button
                  onClick={() => setActiveModule('tasks')}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  Manage all tasks →
                </button>
              </div>

              {projectTasks.length === 0 ? (
                <div className="p-4 border border-dashed border-border rounded-xl text-xs text-muted-foreground text-center">
                  No tasks directly linked to this project yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {projectTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-muted/20 border border-border rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className={`font-semibold ${t.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {t.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Assigned to: {t.assignedTo} • Due {t.dueDate || 'No date'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${t.status === 'Done' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            No project selected.
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {newProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-sm">Create New Delivery Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ApexData Outbound Scale Sprint"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Client Account</label>
                <select
                  value={projClientId}
                  onChange={(e) => setProjClientId(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg text-xs"
                >
                  <option value="">Internal / No Client</option>
                  {clients.map((c) => {
                    const comp = companies.find((co) => co.id === c.companyId);
                    return (
                      <option key={c.id} value={c.id}>
                        {comp?.name || c.id}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(false)}
                  className="px-3 py-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-accent text-accent-foreground font-medium rounded-lg hover:opacity-90"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
