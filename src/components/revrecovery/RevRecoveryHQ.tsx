'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  TrendingUp,
  Target,
  DollarSign,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  FolderGit2,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Filter,
  CheckSquare,
  FileText,
  ChevronRight,
  Flame,
  Share2,
  Users,
  Send,
  MessageSquare,
  UserCheck,
  Briefcase,
  Layers,
  ArrowUpRight,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  QuickAddLeadModal,
  QuickAddTaskModal,
  AddMeetingModal,
  VerifyCompanyModal,
} from './QuickModals';
import { CustomSourceModal } from './CustomSourceModal';
import { LeadDeal, Company, Meeting, Proposal } from '@/types/revrecovery';

export const RevRecoveryHQ: React.FC = () => {
  const {
    companies,
    contacts,
    leads,
    clients,
    projects,
    tasks,
    meetings,
    proposals,
    teamMembers,
    activities,
    outreachSources,
    setActiveModule,
    setSelectedLeadId,
    changeLeadStage,
  } = useRevRecoveryStore();

  // Modals state
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [customSourceModalOpen, setCustomSourceModalOpen] = useState(false);

  // Drilldown record viewer modal
  const [drilldownTitle, setDrilldownTitle] = useState<string | null>(null);
  const [drilldownRecords, setDrilldownRecords] = useState<LeadDeal[] | null>(null);

  // Top Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const now = Date.now();

  // Date threshold helper
  const getDateThreshold = (): number => {
    if (dateRange === 'today') return now - 86400000;
    if (dateRange === 'week') return now - 86400000 * 7;
    if (dateRange === 'month') return now - 86400000 * 30;
    if (dateRange === 'quarter') return now - 86400000 * 90;
    if (dateRange === 'year') return now - 86400000 * 365;
    return 0; // 'all'
  };

  const threshold = getDateThreshold();

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    if (threshold > 0 && l.createdAt < threshold) return false;
    if (selectedOwner !== 'all' && l.assignedTo !== selectedOwner) return false;
    if (selectedSource !== 'all' && (l.outreachSource || 'LinkedIn') !== selectedSource) return false;
    if (selectedCampaign !== 'all' && (l.campaignName || '') !== selectedCampaign) return false;
    if (selectedStatusFilter !== 'all' && l.stage !== selectedStatusFilter) return false;
    return true;
  });

  // Filtered Activities
  const filteredActivities = activities.filter((a) => {
    if (threshold > 0 && a.createdAt < threshold) return false;
    if (selectedOwner !== 'all' && a.recordedBy !== selectedOwner) return false;
    if (selectedSource !== 'all' && (a.outreachSource || 'LinkedIn') !== selectedSource) return false;
    if (selectedCampaign !== 'all' && a.campaign !== selectedCampaign) return false;
    return true;
  });

  // Distinct Campaigns
  const campaignsList = Array.from(new Set(leads.map((l) => l.campaignName).filter(Boolean)));

  // --- SECTION A: SALES PIPELINE COUNTS ---
  const totalProspectsCount = filteredLeads.length;
  const qualifiedLeads = filteredLeads.filter((l) =>
    ['Qualified', 'Ready for Outreach', 'Contacted', 'Follow-up Due', 'Replied', 'Interested', 'Meeting Booked', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage)
  );
  const contactedLeads = filteredLeads.filter((l) =>
    ['Contacted', 'Follow-up Due', 'Replied', 'Interested', 'Meeting Booked', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage) || l.messageStatus === 'Sent'
  );
  const awaitingReplyLeads = filteredLeads.filter((l) =>
    l.stage === 'Contacted' || l.messageStatus === 'Awaiting Reply'
  );
  const repliedLeads = filteredLeads.filter((l) =>
    ['Replied', 'Interested', 'Meeting Booked', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage) || l.messageStatus === 'Replied'
  );
  const interestedLeads = filteredLeads.filter((l) =>
    l.stage === 'Interested' || l.isPositiveReply
  );
  const meetingsBookedLeads = filteredLeads.filter((l) =>
    ['Meeting Booked', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage) || l.meetingStatus === 'Booked'
  );
  const meetingsCompletedLeads = filteredLeads.filter((l) =>
    ['Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage) || l.meetingStatus === 'Completed'
  );
  const proposalsSentLeads = filteredLeads.filter((l) =>
    ['Proposal Sent', 'Won'].includes(l.stage) || l.proposalStatus === 'Sent' || proposals.some((p) => p.companyId === l.companyId)
  );
  const wonDeals = filteredLeads.filter((l) => l.stage === 'Won' || l.dealStatus === 'Won');
  const lostLeads = filteredLeads.filter((l) => l.stage === 'Lost' || l.stage === 'Disqualified' || l.dealStatus === 'Lost');

  // --- SECTION B: OUTREACH PERFORMANCE (Derived strictly from activity records!) ---
  const connRequestsSent = filteredActivities.filter((a) => a.type === 'connection_request_sent').length;
  const connRequestsAccepted = filteredActivities.filter((a) => a.type === 'connection_request_accepted').length;
  const messagesSent = filteredActivities.filter((a) => a.type === 'message_sent').length;
  const repliesReceived = filteredActivities.filter((a) => a.type === 'reply_received' || a.type === 'positive_reply').length;
  const positiveReplies = filteredActivities.filter((a) => a.type === 'positive_reply').length;

  const overdueFollowUps = filteredLeads.filter((l) => {
    if (!l.nextFollowUpDate || ['Won', 'Lost', 'Disqualified'].includes(l.stage)) return false;
    return new Date(l.nextFollowUpDate).getTime() < now;
  });

  const followUpsDueToday = filteredLeads.filter((l) => {
    if (!l.nextFollowUpDate || ['Won', 'Lost', 'Disqualified'].includes(l.stage)) return false;
    const diff = new Date(l.nextFollowUpDate).getTime() - now;
    return diff >= 0 && diff <= 86400000;
  });

  const totalFollowupsDue = overdueFollowUps.length + followUpsDueToday.length;

  // --- SECTION C: REVENUE ---
  const wonRevenue = wonDeals.reduce((sum, l) => sum + (l.value || 0), 0);
  const activePipelineLeads = filteredLeads.filter((l) => !['Won', 'Lost', 'Disqualified'].includes(l.stage));
  const openPipelineValue = activePipelineLeads.reduce((sum, l) => sum + (l.value || 0), 0);
  const proposalValue = proposalsSentLeads.reduce((sum, l) => sum + (l.value || 0), 0);
  // Expected close value: probability-weighted or configured expectedValue
  const expectedCloseValue = activePipelineLeads.reduce((sum, l) => {
    if (l.expectedValue != null) return sum + l.expectedValue;
    // Default stage weighting
    const weights: Record<string, number> = {
      'New': 0.05,
      'Researching': 0.10,
      'Awaiting Verification': 0.15,
      'Verified': 0.20,
      'Ready for Outreach': 0.25,
      'Contacted': 0.30,
      'Follow-up Due': 0.35,
      'Replied': 0.40,
      'Interested': 0.60,
      'Meeting Booked': 0.70,
      'Meeting Completed': 0.80,
      'Proposal Sent': 0.85,
    };
    const p = weights[l.stage] || 0.2;
    return sum + (l.value * p);
  }, 0);

  const averageDealValue = wonDeals.length > 0 ? Math.round(wonRevenue / wonDeals.length) : 0;

  // --- SECTION D: MEETINGS ---
  const filteredMeetings = meetings.filter((m) => {
    if (selectedOwner !== 'all' && !m.attendees.includes(selectedOwner)) return false;
    return true;
  });

  const meetingsBookedCount = filteredMeetings.length;
  const meetingsUpcoming = filteredMeetings.filter((m) => {
    const time = new Date(`${m.date}T${m.time || '12:00'}`).getTime();
    return time >= now && m.outcome !== 'Cancelled';
  });
  const meetingsCompletedCount = filteredMeetings.filter((m) => m.outcome === 'Completed').length;
  const meetingsCancelledCount = filteredMeetings.filter((m) => m.outcome === 'Cancelled' || m.outcome === 'No Show').length;
  const meetingsAttendedCount = meetingsCompletedCount;

  // --- DRILLDOWN HELPER ---
  const openDrilldown = (title: string, records: LeadDeal[]) => {
    setDrilldownTitle(title);
    setDrilldownRecords(records);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* 1. Header & Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-accent/15 text-accent border border-accent/20">
              RevRecovery Internal OS
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>HQ Live Status</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">RevRecovery Business Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time sales pipeline velocity, outreach attribution, meetings, and revenue intelligence
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCustomSourceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-accent" />
            <span>Sources</span>
          </button>

          <button
            onClick={() => setAddMeetingOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-pink-500" />
            <span>Book Meeting</span>
          </button>

          <button
            onClick={() => setAddTaskOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
            <span>New Task</span>
          </button>

          <button
            onClick={() => setAddLeadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Prospect</span>
          </button>
        </div>
      </div>

      {/* 2. Top Filter Bar */}
      <div className="p-3 rounded-xl border border-border bg-card/60 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Sources</option>
            {outreachSources.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>

          {/* Campaign Filter */}
          {campaignsList.length > 0 && (
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none max-w-[160px] truncate"
            >
              <option value="all">All Campaigns</option>
              {campaignsList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Owner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Owners</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
          <span>Showing <strong>{filteredLeads.length}</strong> active prospect record(s)</span>
        </div>
      </div>

      {/* ZERO PROSPECTS EMPTY STATE */}
      {leads.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-border rounded-2xl bg-card/40 text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mx-auto shadow-inner">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">No Prospects in System Yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Your sales database is clean with demo data removed. Add your first prospective company to start tracking ICP verification, outreach activities, and revenue.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setAddLeadOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 shadow-md transition-opacity inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Prospect</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* SECTION A: SALES PIPELINE VELOCITY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" /> A. Sales Pipeline Funnel
                </h2>
                <p className="text-xs text-muted-foreground">
                  Prospect counts by progression stage. Click any metric to inspect contributing records.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2 text-xs">
              {[
                { label: 'Total Prospects', count: totalProspectsCount, records: filteredLeads, color: 'text-foreground' },
                { label: 'Qualified', count: qualifiedLeads.length, records: qualifiedLeads, color: 'text-emerald-500' },
                { label: 'Contacted', count: contactedLeads.length, records: contactedLeads, color: 'text-blue-500' },
                { label: 'Awaiting Reply', count: awaitingReplyLeads.length, records: awaitingReplyLeads, color: 'text-amber-500' },
                { label: 'Replied', count: repliedLeads.length, records: repliedLeads, color: 'text-cyan-500' },
                { label: 'Interested', count: interestedLeads.length, records: interestedLeads, color: 'text-purple-500' },
                { label: 'Meetings Booked', count: meetingsBookedLeads.length, records: meetingsBookedLeads, color: 'text-pink-500' },
                { label: 'Meetings Completed', count: meetingsCompletedLeads.length, records: meetingsCompletedLeads, color: 'text-pink-600' },
                { label: 'Proposals Sent', count: proposalsSentLeads.length, records: proposalsSentLeads, color: 'text-indigo-500' },
                { label: 'Closed / Won', count: wonDeals.length, records: wonDeals, color: 'text-emerald-600 font-bold' },
                { label: 'Lost / Disqualified', count: lostLeads.length, records: lostLeads, color: 'text-rose-500' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => openDrilldown(item.label, item.records)}
                  className="p-3 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-muted/30 cursor-pointer transition-all shadow-2xs space-y-1"
                >
                  <span className="text-[10px] text-muted-foreground block truncate" title={item.label}>
                    {item.label}
                  </span>
                  <div className={`text-lg font-bold font-mono ${item.color}`}>
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: OUTREACH PERFORMANCE (Derived strictly from activities!) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-accent" /> B. Outreach Activity Performance
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tracked strictly from logged activity events (connection requests, messages, replies, follow-ups).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2.5 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Conn. Requests Sent</span>
                <span className="text-lg font-bold font-mono text-foreground">{connRequestsSent}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Conn. Accepted</span>
                <span className="text-lg font-bold font-mono text-emerald-500">{connRequestsAccepted}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Messages Sent</span>
                <span className="text-lg font-bold font-mono text-blue-500">{messagesSent}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Replies Received</span>
                <span className="text-lg font-bold font-mono text-cyan-500">{repliesReceived}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Positive Replies</span>
                <span className="text-lg font-bold font-mono text-purple-500">{positiveReplies}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Interested Prospects</span>
                <span className="text-lg font-bold font-mono text-indigo-500">{interestedLeads.length}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Follow-ups Due</span>
                <span className={`text-lg font-bold font-mono ${totalFollowupsDue > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                  {totalFollowupsDue}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Meetings Booked</span>
                <span className="text-lg font-bold font-mono text-pink-500">{meetingsBookedCount}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                <span className="text-[10px] text-muted-foreground block">Meetings Attended</span>
                <span className="text-lg font-bold font-mono text-emerald-500">{meetingsAttendedCount}</span>
              </div>
            </div>

            {activities.length === 0 && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border text-[11px] text-muted-foreground flex items-center justify-between">
                <span>No outreach activities logged yet. Quick actions like "Log Message Sent" or "Log Reply" in CRM update these live metrics.</span>
                <button
                  onClick={() => setActiveModule('crm')}
                  className="text-accent font-semibold hover:underline shrink-0"
                >
                  Open CRM →
                </button>
              </div>
            )}
          </div>

          {/* SECTION C & D: REVENUE & MEETINGS INTELLIGENCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION C: REVENUE */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> C. Revenue & Commercial Performance
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Won revenue, active pipeline values, and expected closings.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Total Recorded Revenue</span>
                  <span className="text-lg font-bold font-mono text-emerald-500">${wonRevenue.toLocaleString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Open Pipeline Value</span>
                  <span className="text-lg font-bold font-mono text-blue-500">${openPipelineValue.toLocaleString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Proposal Value</span>
                  <span className="text-lg font-bold font-mono text-indigo-500">${proposalValue.toLocaleString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Expected Close Value</span>
                  <span className="text-lg font-bold font-mono text-foreground">${Math.round(expectedCloseValue).toLocaleString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Closed Deals</span>
                  <span className="text-lg font-bold font-mono text-emerald-500">{wonDeals.length}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Average Deal Value</span>
                  <span className="text-lg font-bold font-mono text-foreground">${averageDealValue.toLocaleString()}</span>
                </div>
              </div>

              {/* Revenue by Won Clients */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground block">Revenue by Client</span>
                {wonDeals.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic block">No closed-won deals yet.</span>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {wonDeals.map((deal) => {
                      const comp = companies.find((c) => c.id === deal.companyId);
                      return (
                        <div key={deal.id} className="p-2 rounded-lg bg-muted/20 border border-border flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{comp?.name || deal.title}</span>
                          <span className="font-mono font-bold text-emerald-500">${deal.value.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION D: MEETINGS */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-500" /> D. Meetings & Discovery Intelligence
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Discovery sessions, kickoff calls, attendance and cancellation ratios.
                  </p>
                </div>
                <button
                  onClick={() => setAddMeetingOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-500 hover:bg-pink-500/20 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Total Booked</span>
                  <span className="text-lg font-bold font-mono text-foreground">{meetingsBookedCount}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Upcoming</span>
                  <span className="text-lg font-bold font-mono text-blue-500">{meetingsUpcoming.length}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Completed</span>
                  <span className="text-lg font-bold font-mono text-emerald-500">{meetingsCompletedCount}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Cancelled / No-Show</span>
                  <span className="text-lg font-bold font-mono text-rose-500">{meetingsCancelledCount}</span>
                </div>
              </div>

              {/* Upcoming Meetings List */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground block">Upcoming Scheduled Meetings</span>
                {meetingsUpcoming.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic block">No upcoming meetings scheduled.</span>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {meetingsUpcoming.map((m) => (
                      <div key={m.id} className="p-2 rounded-lg bg-muted/20 border border-border flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-foreground block">{m.title}</span>
                          <span className="text-[10px] text-muted-foreground">{m.date} at {m.time}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-accent/15 text-accent font-medium">
                          {m.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION E: SOURCE & CHANNEL ANALYTICS */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-accent" /> E. Acquisition Channel & Source Performance
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attribution reporting across LinkedIn, Cold Email, Website, Referrals, and custom sources.
                </p>
              </div>
              <button
                onClick={() => setCustomSourceModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Configure Sources</span>
              </button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-background">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Acquisition Source</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Prospects</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Qualified</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Positive Replies</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Meetings</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Won Clients</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Attributable Revenue</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outreachSources.filter((s) => s.active).map((source) => {
                    const sourceLeads = leads.filter((l) => (l.outreachSource || 'LinkedIn') === source.name);
                    const sourceQualified = sourceLeads.filter((l) =>
                      ['Qualified', 'Ready for Outreach', 'Contacted', 'Replied', 'Interested', 'Meeting Booked', 'Won'].includes(l.stage)
                    ).length;
                    const sourcePositiveReplies = activities.filter(
                      (a) => a.type === 'positive_reply' && (a.outreachSource || 'LinkedIn') === source.name
                    ).length;
                    const sourceMeetings = meetings.filter(
                      (m) => m.relatedCompanyId && leads.some((l) => l.companyId === m.relatedCompanyId && (l.outreachSource || 'LinkedIn') === source.name)
                    ).length;
                    const sourceWon = sourceLeads.filter((l) => l.stage === 'Won');
                    const sourceRevenue = sourceWon.reduce((s, l) => s + (l.value || 0), 0);
                    const winRate = sourceLeads.length > 0 ? Math.round((sourceWon.length / sourceLeads.length) * 100) : 0;

                    return (
                      <tr key={source.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-semibold text-foreground flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: source.color || '#6366F1' }} />
                          <span>{source.name}</span>
                          {source.isCustom && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-accent/15 text-accent font-mono">
                              Custom
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium">{sourceLeads.length}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-emerald-500">{sourceQualified}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-purple-500">{sourcePositiveReplies}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-pink-500">{sourceMeetings}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-emerald-600 font-bold">{sourceWon.length}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          ${sourceRevenue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DRILLDOWN MODAL */}
      {drilldownTitle && drilldownRecords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <h3 className="font-bold text-sm text-foreground">{drilldownTitle} ({drilldownRecords.length})</h3>
              <button onClick={() => setDrilldownRecords(null)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 text-xs divide-y divide-border">
              {drilldownRecords.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No records currently match this filter.</div>
              ) : (
                drilldownRecords.map((lead) => {
                  const comp = companies.find((c) => c.id === lead.companyId);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadId(lead.id);
                        setActiveModule('crm');
                        setDrilldownRecords(null);
                      }}
                      className="p-3 flex items-center justify-between hover:bg-muted/30 cursor-pointer rounded-lg transition-colors"
                    >
                      <div>
                        <span className="font-bold text-foreground block">{comp?.name || lead.title}</span>
                        <span className="text-[11px] text-muted-foreground">
                          Stage: {lead.stage} • Owner: {lead.assignedTo} • Source: {lead.outreachSource || 'LinkedIn'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-foreground block">${lead.value.toLocaleString()}</span>
                        <span className="text-[10px] text-accent underline">Open in CRM →</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <QuickAddLeadModal isOpen={addLeadOpen} onClose={() => setAddLeadOpen(false)} />
      <QuickAddTaskModal isOpen={addTaskOpen} onClose={() => setAddTaskOpen(false)} />
      <AddMeetingModal isOpen={addMeetingOpen} onClose={() => setAddMeetingOpen(false)} />
      <CustomSourceModal isOpen={customSourceModalOpen} onClose={() => setCustomSourceModalOpen(false)} />
    </div>
  );
};
