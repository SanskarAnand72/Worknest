'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Search,
  Plus,
  Table as TableIcon,
  Kanban,
  List,
  Upload,
  Download,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Trash2,
  CheckCircle,
  Building,
  User,
  MessageSquare,
  Send,
  UserCheck,
  ThumbsUp,
  Tag,
  Clock,
  Calendar,
  X,
  FileText,
  Mail,
} from 'lucide-react';
import { LeadStage, ActivityType } from '@/types/revrecovery';
import {
  QuickAddLeadModal,
  VerifyCompanyModal,
  CsvImportModal,
} from './QuickModals';

export const CrmLeadsView: React.FC = () => {
  const {
    companies,
    contacts,
    leads,
    selectedLeadId,
    setSelectedLeadId,
    deleteLead,
    updateLead,
    changeLeadStage,
    convertLeadToClient,
    exportLeadsToCSV,
    teamMembers,
    tasks,
    meetings,
    proposals,
    activities,
    logActivity,
    deleteActivity,
    outreachSources,
    setActiveModule,
  } = useRevRecoveryStore();

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'list'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedVerificationFilter, setSelectedVerificationFilter] = useState<string>('all');
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');

  // Modals state
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [verifyCompanyId, setVerifyCompanyId] = useState<string | null>(null);

  // Conversion notification
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  // Activity logger state in drawer
  const [customActivityOpen, setCustomActivityOpen] = useState(false);
  const [customActivityType, setCustomActivityType] = useState<ActivityType>('note_added');
  const [customActivityTitle, setCustomActivityTitle] = useState('');
  const [customActivityNotes, setCustomActivityNotes] = useState('');

  // Custom fields editor state
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [customFieldEditOpen, setCustomFieldEditOpen] = useState(false);

  // Active Lead for Detail Drawer
  const activeLead = leads.find((l) => l.id === selectedLeadId) || null;
  const activeCompany = activeLead ? companies.find((c) => c.id === activeLead.companyId) : null;
  const activeContact = activeLead ? contacts.find((c) => c.id === activeLead.primaryContactId) : null;
  const activeTasks = activeCompany ? tasks.filter((t) => t.relatedCompanyId === activeCompany.id) : [];
  const activeMeetings = activeCompany ? meetings.filter((m) => m.relatedCompanyId === activeCompany.id) : [];
  const activeProposals = activeCompany ? proposals.filter((p) => p.companyId === activeCompany.id) : [];
  const activeActivities = activeCompany
    ? activities
        .filter((a) => a.companyId === activeCompany.id || (activeLead && a.leadId === activeLead.id))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const comp = companies.find((c) => c.id === lead.companyId);
    const cont = contacts.find((c) => c.id === lead.primaryContactId);

    if (searchTerm) {
      const matchSearch =
        (comp?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cont?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.notes.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
    }
    if (selectedStageFilter !== 'all' && lead.stage !== selectedStageFilter) return false;
    if (selectedOwnerFilter !== 'all' && lead.assignedTo !== selectedOwnerFilter) return false;
    if (selectedSourceFilter !== 'all' && lead.outreachSource !== selectedSourceFilter) return false;
    if (selectedVerificationFilter !== 'all') {
      if (comp?.verificationStatus !== selectedVerificationFilter) return false;
    }
    return true;
  });

  // Duplicate Check
  const companyNameCounts: Record<string, number> = {};
  companies.forEach((c) => {
    const key = c.name.toLowerCase().trim();
    companyNameCounts[key] = (companyNameCounts[key] || 0) + 1;
  });
  const duplicateCompanies = Object.entries(companyNameCounts).filter(([_, count]) => count > 1);

  // Lead Conversion handler
  const handleConvertToClient = async (leadId: string) => {
    try {
      const newClient = await convertLeadToClient(leadId);
      if (newClient) {
        const comp = companies.find((c) => c.id === newClient.companyId);
        setConvertSuccess(`Successfully converted "${comp?.name || 'Prospect'}" into an active Client! 10-step onboarding checklist and delivery project created.`);
        setTimeout(() => setConvertSuccess(null), 5000);
      }
    } catch (err: any) {
      alert(err?.message || 'Conversion failed');
    }
  };

  // Activity logging quick actions
  const handleLogConnectionSent = async () => {
    if (!activeLead || !activeCompany) return;
    const today = new Date().toISOString().split('T')[0];
    await logActivity({
      companyId: activeCompany.id,
      leadId: activeLead.id,
      contactId: activeContact?.id,
      type: 'connection_request_sent',
      title: `Connection request sent to ${activeContact?.name || activeCompany.name}`,
      notes: `Outreach connection dispatched via ${activeLead.outreachChannel || 'LinkedIn'}.`,
      recordedBy: activeLead.assignedTo || 'Sanskar Anand',
      outreachSource: activeLead.outreachSource || 'LinkedIn',
    });
    await updateLead(activeLead.id, {
      connectionStatus: 'Sent',
      lastContactDate: today,
    });
  };

  const handleLogMessageSent = async () => {
    if (!activeLead || !activeCompany) return;
    const today = new Date().toISOString().split('T')[0];
    await logActivity({
      companyId: activeCompany.id,
      leadId: activeLead.id,
      contactId: activeContact?.id,
      type: 'message_sent',
      title: `Outreach message sent to ${activeContact?.name || activeCompany.name}`,
      notes: `Cold sequence / pitch delivered via ${activeLead.outreachChannel || 'Email'}.`,
      recordedBy: activeLead.assignedTo || 'Sanskar Anand',
      outreachSource: activeLead.outreachSource || 'Cold Email',
    });
    await updateLead(activeLead.id, {
      messageStatus: 'Sent',
      lastContactDate: today,
      stage: activeLead.stage === 'New' || activeLead.stage === 'Verified' ? 'Contacted' : activeLead.stage,
    });
  };

  const handleLogReply = async () => {
    if (!activeLead || !activeCompany) return;
    const today = new Date().toISOString().split('T')[0];
    await logActivity({
      companyId: activeCompany.id,
      leadId: activeLead.id,
      contactId: activeContact?.id,
      type: 'reply_received',
      title: `Reply received from ${activeContact?.name || activeCompany.name}`,
      notes: `Prospect responded to outreach campaign.`,
      recordedBy: activeLead.assignedTo || 'Sanskar Anand',
    });
    await updateLead(activeLead.id, {
      messageStatus: 'Replied',
      stage: 'Replied',
      lastReplyDate: today,
    });
  };

  const handleLogPositiveReply = async () => {
    if (!activeLead || !activeCompany) return;
    const today = new Date().toISOString().split('T')[0];
    await logActivity({
      companyId: activeCompany.id,
      leadId: activeLead.id,
      contactId: activeContact?.id,
      type: 'positive_reply',
      title: `Positive reply from ${activeContact?.name || activeCompany.name}!`,
      notes: `Prospect expressed interest in discovery call and services.`,
      recordedBy: activeLead.assignedTo || 'Sanskar Anand',
    });
    await updateLead(activeLead.id, {
      messageStatus: 'Replied',
      stage: 'Interested',
      isPositiveReply: true,
      lastReplyDate: today,
    });
  };

  const handleSaveCustomActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !activeCompany || !customActivityTitle.trim()) return;
    await logActivity({
      companyId: activeCompany.id,
      leadId: activeLead.id,
      contactId: activeContact?.id,
      type: customActivityType,
      title: customActivityTitle.trim(),
      notes: customActivityNotes.trim(),
      recordedBy: activeLead.assignedTo || 'Sanskar Anand',
      outreachSource: activeLead.outreachSource,
    });
    setCustomActivityTitle('');
    setCustomActivityNotes('');
    setCustomActivityOpen(false);
  };

  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !newFieldKey.trim()) return;
    const current = activeLead.customFields || {};
    const updated = { ...current, [newFieldKey.trim()]: newFieldValue.trim() };
    await updateLead(activeLead.id, { customFields: updated });
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const handleRemoveCustomField = async (keyToRemove: string) => {
    if (!activeLead) return;
    const current = { ...(activeLead.customFields || {}) };
    delete current[keyToRemove];
    await updateLead(activeLead.id, { customFields: current });
  };

  const PIPELINE_COLUMNS: LeadStage[] = [
    'New',
    'Researching',
    'Awaiting Verification',
    'Verified',
    'Ready for Outreach',
    'Contacted',
    'Follow-up Due',
    'Replied',
    'Interested',
    'Meeting Booked',
    'Proposal Sent',
    'Won',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">CRM & Sales Pipeline</h1>
              <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
                {leads.length} total • {filteredLeads.length} filtered
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              End-to-end B2B client acquisition: Research → ICP Verification → Multi-channel Outreach → Meetings → Conversion
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                viewMode === 'board' ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                viewMode === 'list' ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <button
            onClick={() => setCsvImportOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Import CSV
          </button>

          <button
            onClick={exportLeadsToCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </button>

          <button
            onClick={() => setAddLeadOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 shadow-sm transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Prospect
          </button>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateCompanies.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Duplicate detection notice: {duplicateCompanies.length} company name(s) appear multiple times in CRM.
            </span>
          </div>
          <span className="font-mono text-[11px] underline">Review Duplicates</span>
        </div>
      )}

      {/* Conversion Success Notification */}
      {convertSuccess && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{convertSuccess}</span>
          </div>
          <button
            onClick={() => setActiveModule('clients')}
            className="px-2 py-0.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500 text-[11px]"
          >
            Open Clients →
          </button>
        </div>
      )}

      {/* 2. Filter & Search Bar */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search prospects, companies, emails, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground text-[11px]">Filters:</span>

          {/* Stage Filter */}
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Stages</option>
            {PIPELINE_COLUMNS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Verification Filter */}
          <select
            value={selectedVerificationFilter}
            onChange={(e) => setSelectedVerificationFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Verification</option>
            <option value="Verified">ICP Verified Only</option>
            <option value="Pending">Pending Audit</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Sources</option>
            {outreachSources.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Owner Filter */}
          <select
            value={selectedOwnerFilter}
            onChange={(e) => setSelectedOwnerFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Owners</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Main CRM Display Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {filteredLeads.length === 0 ? (
            leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card border border-border rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">No prospects yet — Add your first prospect</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-6">
                  RevRecovery CRM is clean and ready. Add target prospects manually with verified ICP criteria or import your outreach lists via CSV.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAddLeadOpen(true)}
                    className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Prospect
                  </button>
                  <button
                    onClick={() => setCsvImportOpen(true)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" /> Import CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card border border-border rounded-xl">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No prospects match your active filters</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Try clearing your search query or reset filter dropdowns.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStageFilter('all');
                    setSelectedVerificationFilter('all');
                    setSelectedOwnerFilter('all');
                    setSelectedSourceFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted"
                >
                  Reset Filters
                </button>
              </div>
            )
          ) : viewMode === 'table' ? (
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 border-b border-border text-muted-foreground select-none">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Target Prospect & Company</th>
                    <th className="py-2.5 px-3 font-semibold">ICP Status</th>
                    <th className="py-2.5 px-3 font-semibold">Pipeline Stage</th>
                    <th className="py-2.5 px-3 font-semibold">Decision-Maker</th>
                    <th className="py-2.5 px-3 font-semibold">Source / Status</th>
                    <th className="py-2.5 px-3 font-semibold">Deal Value</th>
                    <th className="py-2.5 px-3 font-semibold">Follow-Up</th>
                    <th className="py-2.5 px-3 font-semibold">Owner</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map((lead) => {
                    const comp = companies.find((c) => c.id === lead.companyId);
                    const cont = contacts.find((c) => c.id === lead.primaryContactId);
                    const isOverdue =
                      lead.nextFollowUpDate &&
                      new Date(lead.nextFollowUpDate).getTime() < Date.now() &&
                      !['Won', 'Lost'].includes(lead.stage);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`hover:bg-muted/40 cursor-pointer transition-colors ${
                          selectedLeadId === lead.id ? 'bg-accent/10' : ''
                        }`}
                      >
                        {/* Company Name & Website */}
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {comp?.name || lead.title}
                            </span>
                            {comp?.website && (
                              <a
                                href={comp.website}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-accent"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {comp?.industry || 'B2B'} • {comp?.country || 'US'}
                          </span>
                        </td>

                        {/* ICP Verification Status */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {comp?.verificationStatus === 'Verified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </span>
                            ) : comp?.verificationStatus === 'Rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                Rejected
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVerifyCompanyId(comp?.id || null);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                Audit ICP
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Stage Selector */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.stage}
                            onChange={(e) => changeLeadStage(lead.id, e.target.value as LeadStage)}
                            className="bg-background border border-border rounded-md px-2 py-1 text-xs font-medium focus:outline-none"
                          >
                            {PIPELINE_COLUMNS.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Decision-Maker */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{cont?.name || 'Unassigned'}</div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {cont?.email || 'No email registered'}
                          </span>
                        </td>

                        {/* Outreach Source & Channel Status */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">{lead.outreachSource || 'Outreach'}</span>
                            <div className="flex items-center gap-1">
                              {lead.messageStatus && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  lead.messageStatus === 'Replied'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : lead.messageStatus === 'Sent'
                                    ? 'bg-blue-500/15 text-blue-500'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {lead.messageStatus}
                                </span>
                              )}
                              {lead.isPositiveReply && (
                                <span className="text-[10px] text-emerald-500 font-bold">★ Positive</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Deal Value */}
                        <td className="py-3 px-3 font-semibold text-foreground font-mono">
                          ${lead.value.toLocaleString()}
                          {lead.expectedValue && lead.expectedValue !== lead.value && (
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              Exp: ${lead.expectedValue.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* Next Follow-up */}
                        <td className="py-3 px-3">
                          {lead.nextFollowUpDate ? (
                            <div className="flex flex-col">
                              <span className={isOverdue ? 'text-rose-500 font-bold' : 'text-muted-foreground'}>
                                {lead.nextFollowUpDate}
                              </span>
                              {isOverdue && (
                                <span className="text-[10px] text-rose-500 font-medium">Overdue</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Assigned Owner */}
                        <td className="py-3 px-3 text-muted-foreground">
                          {lead.assignedTo}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {['Interested', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(lead.stage) && (
                              <button
                                onClick={() => handleConvertToClient(lead.id)}
                                title="Convert Lead to Active Client"
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <Sparkles className="w-3 h-3" />
                                Convert
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'board' ? (
            /* Kanban Board */
            <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
              {PIPELINE_COLUMNS.map((stage) => {
                const stageLeads = filteredLeads.filter((l) => l.stage === stage);
                const stageVal = stageLeads.reduce((acc, l) => acc + l.value, 0);

                return (
                  <div
                    key={stage}
                    className="w-72 shrink-0 bg-muted/40 rounded-xl border border-border flex flex-col max-h-[85vh]"
                  >
                    {/* Stage Header */}
                    <div className="p-3 border-b border-border flex items-center justify-between bg-card rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">{stage}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono font-medium text-muted-foreground">
                          {stageLeads.length}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                        ${stageVal.toLocaleString()}
                      </span>
                    </div>

                    {/* Cards Column */}
                    <div className="p-2 overflow-y-auto space-y-2 flex-1">
                      {stageLeads.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground/50 text-[11px] border border-dashed border-border/50 rounded-lg">
                          No leads
                        </div>
                      ) : (
                        stageLeads.map((lead) => {
                          const comp = companies.find((c) => c.id === lead.companyId);
                          const cont = contacts.find((c) => c.id === lead.primaryContactId);

                          return (
                            <div
                              key={lead.id}
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="p-3 rounded-lg bg-card border border-border hover:border-accent/40 cursor-pointer shadow-xs transition-all space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-foreground">
                                  {comp?.name || lead.title}
                                </span>
                                <span className="font-mono text-emerald-500 font-bold text-xs">
                                  ${lead.value.toLocaleString()}
                                </span>
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                                <span>{cont?.name || 'Decision Maker'}</span>
                                <span>{comp?.industry}</span>
                              </div>

                              <div className="pt-2 border-t border-border flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">{lead.assignedTo}</span>
                                {comp?.verificationStatus === 'Verified' ? (
                                  <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                                    <ShieldCheck className="w-3 h-3" /> Verified
                                  </span>
                                ) : (
                                  <span className="text-amber-500 font-medium">Unverified</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {filteredLeads.map((lead) => {
                const comp = companies.find((c) => c.id === lead.companyId);
                const cont = contacts.find((c) => c.id === lead.primaryContactId);

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between hover:border-accent/40 cursor-pointer transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                          {comp?.name || lead.title}
                          {lead.outreachSource && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-normal">
                              {lead.outreachSource}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {cont?.name || 'No contact assigned'} • Stage: {lead.stage} • Value: ${lead.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">Owner: {lead.assignedTo}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Center Peek / Detail Drawer for Selected Lead */}
        {activeLead && activeCompany && (
          <div className="w-[420px] border-l border-border bg-card flex flex-col h-full overflow-hidden shadow-xl shrink-0 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-accent tracking-wider">
                  Prospect & Deal Profile
                </span>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  {activeCompany.name}
                  {activeCompany.website && (
                    <a
                      href={activeCompany.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-accent"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLeadId(null)}
                className="p-1 hover:bg-muted rounded-md text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scroll Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* SECTION A: Outreach Activity Quick Actions (Task 5 & 6) */}
              <div className="space-y-2 border border-border p-3 rounded-xl bg-accent/5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[11px] uppercase tracking-wide text-foreground flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-accent" />
                    Outreach Quick Actions
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Event-Sourced</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleLogConnectionSent}
                    title="Log Connection Request Sent"
                    className="p-2 rounded-lg border border-border bg-background hover:bg-muted font-medium flex items-center justify-center gap-1.5 text-foreground transition-colors shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    Connection Sent
                  </button>

                  <button
                    onClick={handleLogMessageSent}
                    title="Log Outreach Message / Sequence Sent"
                    className="p-2 rounded-lg border border-border bg-background hover:bg-muted font-medium flex items-center justify-center gap-1.5 text-foreground transition-colors shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Message Sent
                  </button>

                  <button
                    onClick={handleLogReply}
                    title="Log Prospect Reply Received"
                    className="p-2 rounded-lg border border-border bg-background hover:bg-muted font-medium flex items-center justify-center gap-1.5 text-foreground transition-colors shadow-xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Log Reply
                  </button>

                  <button
                    onClick={handleLogPositiveReply}
                    title="Log Positive Interest Reply"
                    className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 font-medium flex items-center justify-center gap-1.5 text-emerald-500 transition-colors shadow-xs"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Positive Reply
                  </button>
                </div>

                {/* Custom Activity or Note Button */}
                <div className="pt-1">
                  {!customActivityOpen ? (
                    <button
                      onClick={() => setCustomActivityOpen(true)}
                      className="w-full py-1.5 px-2 rounded-lg border border-dashed border-border hover:bg-background text-muted-foreground text-[11px] flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Log Custom Note or Meeting Activity
                    </button>
                  ) : (
                    <form onSubmit={handleSaveCustomActivity} className="p-2.5 bg-background border border-border rounded-lg space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-foreground">Record Activity</span>
                        <button
                          type="button"
                          onClick={() => setCustomActivityOpen(false)}
                          className="text-muted-foreground hover:text-foreground text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={customActivityType}
                          onChange={(e) => setCustomActivityType(e.target.value as ActivityType)}
                          className="p-1.5 bg-muted rounded border border-border text-[11px]"
                        >
                          <option value="note_added">General Note</option>
                          <option value="meeting_booked">Meeting Booked</option>
                          <option value="meeting_completed">Meeting Done</option>
                          <option value="proposal_sent">Proposal Sent</option>
                          <option value="followup_completed">Follow-up Done</option>
                          <option value="deal_won">Deal Won</option>
                          <option value="deal_lost">Deal Lost</option>
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="Activity Title"
                          value={customActivityTitle}
                          onChange={(e) => setCustomActivityTitle(e.target.value)}
                          className="p-1.5 bg-muted rounded border border-border text-[11px]"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Details or notes..."
                        value={customActivityNotes}
                        onChange={(e) => setCustomActivityNotes(e.target.value)}
                        className="w-full p-1.5 bg-muted rounded border border-border text-[11px]"
                      />
                      <button
                        type="submit"
                        className="w-full py-1 rounded bg-accent text-accent-foreground font-semibold text-[11px]"
                      >
                        Save Activity
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Conversion & ICP Audit Bar */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVerifyCompanyId(activeCompany.id)}
                  className="p-2 rounded-lg border border-border hover:bg-muted font-medium flex items-center justify-center gap-1.5 text-foreground"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Audit ICP Match
                </button>
                <button
                  onClick={() => handleConvertToClient(activeLead.id)}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Convert to Client
                </button>
              </div>

              {/* SECTION B: Deal & Outreach Properties (Editable) */}
              <div className="space-y-2 border border-border p-3 rounded-xl bg-muted/20">
                <h4 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">
                  Pipeline & Outreach Properties
                </h4>

                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  <div>
                    <label className="text-muted-foreground block mb-0.5">Stage:</label>
                    <select
                      value={activeLead.stage}
                      onChange={(e) => changeLeadStage(activeLead.id, e.target.value as LeadStage)}
                      className="w-full p-1.5 rounded bg-background border border-border font-medium text-xs"
                    >
                      {PIPELINE_COLUMNS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-0.5">Assigned Owner:</label>
                    <select
                      value={activeLead.assignedTo}
                      onChange={(e) => updateLead(activeLead.id, { assignedTo: e.target.value })}
                      className="w-full p-1.5 rounded bg-background border border-border font-medium text-xs"
                    >
                      {teamMembers.map((tm) => (
                        <option key={tm.id} value={tm.name}>
                          {tm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-0.5">Outreach Source:</label>
                    <select
                      value={activeLead.outreachSource || 'LinkedIn'}
                      onChange={(e) => updateLead(activeLead.id, { outreachSource: e.target.value })}
                      className="w-full p-1.5 rounded bg-background border border-border font-medium text-xs"
                    >
                      {outreachSources.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-0.5">Target Value ($):</label>
                    <input
                      type="number"
                      value={activeLead.value}
                      onChange={(e) => updateLead(activeLead.id, { value: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 rounded bg-background border border-border font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-0.5">Connection Status:</label>
                    <select
                      value={activeLead.connectionStatus || 'Not Sent'}
                      onChange={(e) => updateLead(activeLead.id, { connectionStatus: e.target.value as any })}
                      className="w-full p-1.5 rounded bg-background border border-border font-medium text-xs"
                    >
                      <option value="Not Sent">Not Sent</option>
                      <option value="Sent">Sent</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Ignored">Ignored</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-0.5">Message Status:</label>
                    <select
                      value={activeLead.messageStatus || 'Not Contacted'}
                      onChange={(e) => updateLead(activeLead.id, { messageStatus: e.target.value as any })}
                      className="w-full p-1.5 rounded bg-background border border-border font-medium text-xs"
                    >
                      <option value="Not Contacted">Not Contacted</option>
                      <option value="Sent">Sent</option>
                      <option value="Awaiting Reply">Awaiting Reply</option>
                      <option value="Replied">Replied</option>
                      <option value="Follow-up Needed">Follow-up Needed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-0.5">Next Follow-Up Date:</label>
                    <input
                      type="date"
                      value={activeLead.nextFollowUpDate || ''}
                      onChange={(e) => updateLead(activeLead.id, { nextFollowUpDate: e.target.value })}
                      className="w-full p-1.5 rounded bg-background border border-border text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-0.5">Campaign Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Q4 SaaS Founders"
                      value={activeLead.campaignName || ''}
                      onChange={(e) => updateLead(activeLead.id, { campaignName: e.target.value })}
                      className="w-full p-1.5 rounded bg-background border border-border text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: Primary Decision Maker Contact */}
              {activeContact && (
                <div className="space-y-2 border border-border p-3 rounded-xl bg-muted/20">
                  <h4 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wide flex items-center justify-between">
                    <span>Decision-Maker Contact</span>
                    <span className="text-[10px] text-accent font-medium">{activeContact.verificationStatus}</span>
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center shrink-0">
                      {activeContact.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{activeContact.name}</div>
                      <div className="text-xs text-muted-foreground">{activeContact.title}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-foreground flex items-center gap-1.5 pt-1">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <span>{activeContact.email || 'No email provided'}</span>
                  </div>
                  {activeContact.linkedinUrl && (
                    <a
                      href={activeContact.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline text-[11px] flex items-center gap-1"
                    >
                      <span className="font-bold text-[9px] bg-blue-600 text-white rounded px-1 py-0.2">in</span>
                      View LinkedIn Profile <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}

              {/* SECTION D: Custom Fields (Task 5 & 8) */}
              <div className="space-y-2 border border-border p-3 rounded-xl bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wide flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Custom Attributes
                  </h4>
                  <button
                    onClick={() => setCustomFieldEditOpen(!customFieldEditOpen)}
                    className="text-accent font-medium hover:underline text-[10px]"
                  >
                    {customFieldEditOpen ? 'Close' : '+ Add Field'}
                  </button>
                </div>

                {/* Existing Custom Fields */}
                {activeLead.customFields && Object.keys(activeLead.customFields).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(activeLead.customFields).map(([key, val]) => (
                      <div
                        key={key}
                        className="p-1.5 px-2 bg-background rounded border border-border flex items-center justify-between text-[11px]"
                      >
                        <span className="text-muted-foreground font-medium">{key}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-semibold">{String(val)}</span>
                          <button
                            onClick={() => handleRemoveCustomField(key)}
                            className="text-muted-foreground hover:text-rose-500"
                            title="Remove field"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-[11px]">No custom fields defined for this lead.</p>
                )}

                {/* Add Custom Field Form */}
                {customFieldEditOpen && (
                  <form onSubmit={handleAddCustomField} className="pt-2 border-t border-border space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Field Name (e.g. Tech Stack)"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="p-1.5 text-[11px] bg-background border border-border rounded"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Next.js, AWS)"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        className="p-1.5 text-[11px] bg-background border border-border rounded"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1 bg-accent text-accent-foreground font-medium rounded text-[11px]"
                    >
                      Save Attribute
                    </button>
                  </form>
                )}
              </div>

              {/* SECTION E: Activity History Timeline (Task 6) */}
              <div className="space-y-2 border border-border p-3 rounded-xl bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Activity History ({activeActivities.length})
                  </h4>
                </div>

                {activeActivities.length === 0 ? (
                  <p className="text-muted-foreground text-[11px]">
                    No activities recorded yet. Use the quick action buttons above to log touchpoints.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activeActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-2.5 bg-background rounded-lg border border-border space-y-1 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] text-foreground flex items-center gap-1.5">
                            {act.type === 'positive_reply' ? (
                              <ThumbsUp className="w-3 h-3 text-emerald-500" />
                            ) : act.type === 'message_sent' ? (
                              <MessageSquare className="w-3 h-3 text-indigo-500" />
                            ) : act.type === 'connection_request_sent' ? (
                              <UserCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-muted-foreground" />
                            )}
                            {act.title}
                          </span>
                          <button
                            onClick={() => deleteActivity(act.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-opacity"
                            title="Delete activity log"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {act.notes && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{act.notes}</p>
                        )}
                        <div className="text-[9px] text-muted-foreground/80 flex items-center justify-between pt-0.5">
                          <span>By: {act.recordedBy}</span>
                          <span>{new Date(act.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Meetings & Tasks */}
              <div className="space-y-2 border border-border p-3 rounded-xl bg-muted/20">
                <h4 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wide flex items-center justify-between">
                  <span>Linked Discovery Meetings ({activeMeetings.length})</span>
                  <button
                    onClick={() => setActiveModule('meetings')}
                    className="text-accent font-normal hover:underline"
                  >
                    + Book
                  </button>
                </h4>
                {activeMeetings.length === 0 ? (
                  <p className="text-muted-foreground text-[11px]">No meetings booked yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeMeetings.map((m) => (
                      <div key={m.id} className="p-2 bg-background rounded border border-border">
                        <div className="font-medium text-foreground">{m.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {m.date} {m.time}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete prospect "${activeCompany.name}"?`)) {
                      await deleteLead(activeLead.id);
                      setSelectedLeadId(null);
                    }
                  }}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Prospect Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <QuickAddLeadModal isOpen={addLeadOpen} onClose={() => setAddLeadOpen(false)} />
      <CsvImportModal isOpen={csvImportOpen} onClose={() => setCsvImportOpen(false)} />
      <VerifyCompanyModal
        isOpen={!!verifyCompanyId}
        onClose={() => setVerifyCompanyId(null)}
        companyId={verifyCompanyId}
      />
    </div>
  );
};
