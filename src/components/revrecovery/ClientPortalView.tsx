'use client';

import React, { useState, useMemo } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  Globe,
  Layers,
  LogOut,
  Mail,
  MessageSquare,
  PhoneCall,
  Search,
  Share2,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';

export const ClientPortalView: React.FC = () => {
  const {
    clients,
    companies,
    portalClientId,
    setPortalClientId,
    portalClientUser,
    setPortalClientUser,
    isClientPortalMode,
    setIsClientPortalMode,
    portalDateFilter,
    setPortalDateFilter,
    getClientPortalData,
    setActiveModule,
  } = useRevRecoveryStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'meetings' | 'projects' | 'documents'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadStage, setSelectedLeadStage] = useState<string>('all');

  // Determine current active client organization
  const activeClientId = portalClientId || portalClientUser?.clientId || (clients.find((c) => !c.archived)?.id ?? clients[0]?.id) || '';
  const portalData = useMemo(() => {
    if (!activeClientId) return null;
    return getClientPortalData(activeClientId, portalDateFilter);
  }, [activeClientId, portalDateFilter, getClientPortalData]);

  const client = portalData?.client;
  const company = portalData?.company;
  const settings = portalData?.settings;
  const metrics = portalData?.metrics || {
    leadsGenerated: 0,
    outreachSent: 0,
    repliesReceived: 0,
    qualifiedProspects: 0,
    meetingsBooked: 0,
    meetingsCompleted: 0,
    conversions: 0,
    conversionRate: 0,
  };

  const leads = portalData?.leads || [];
  const meetings = portalData?.meetings || [];
  const projects = portalData?.projects || [];
  const activities = portalData?.activities || [];
  const sharedDocs = portalData?.sharedDocuments || [];

  // Filtered leads for campaign tab
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        searchQuery === '' ||
        lead.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.campaignName && lead.campaignName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStage = selectedLeadStage === 'all' || lead.stage === selectedLeadStage;
      return matchesSearch && matchesStage;
    });
  }, [leads, searchQuery, selectedLeadStage]);

  const handleExitPreview = () => {
    setIsClientPortalMode(false);
    setPortalClientUser(null);
    setActiveModule('clients');
  };

  const handleSignOut = () => {
    setPortalClientUser(null);
    setIsClientPortalMode(false);
    setActiveModule('hq');
  };

  // If no client exists or selected
  if (!client || !company) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-background">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
          <Briefcase className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-foreground">No Client Organization Selected</h2>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
          Please select a client account in the RevRecovery internal dashboard to view their dedicated portal.
        </p>
        <button
          onClick={handleExitPreview}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          Return to Internal Workspace
        </button>
      </div>
    );
  }

  // Check if portal is disabled by internal team
  if (settings && !settings.enabled && !portalClientId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-background">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Portal Currently Offline</h2>
        <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
          Access to the {company.name} Client Portal is currently paused by your RevRecovery account team.
          Please reach out to your account executive for immediate assistance.
        </p>
        <button
          onClick={handleExitPreview}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  // Calculate KPI progress percentages
  const kpiTargets = settings?.kpiTargets || {};
  const outreachTarget = kpiTargets.monthlyOutreach || 500;
  const leadsTarget = kpiTargets.monthlyLeads || 250;
  const meetingsTarget = kpiTargets.monthlyMeetings || 15;
  const qualifiedTarget = kpiTargets.monthlyQualified || 30;

  const outreachPct = Math.min(100, Math.round((metrics.outreachSent / outreachTarget) * 100));
  const leadsPct = Math.min(100, Math.round((metrics.leadsGenerated / leadsTarget) * 100));
  const meetingsPct = Math.min(100, Math.round((metrics.meetingsBooked / meetingsTarget) * 100));
  const qualifiedPct = Math.min(100, Math.round((metrics.qualifiedProspects / qualifiedTarget) * 100));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Top Banner: Internal Team Preview Notice (if previewing from internal admin mode) */}
      {!portalClientUser && (
        <div className="bg-sky-500/15 border-b border-sky-500/25 px-4 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-medium">
            <Eye className="w-3.5 h-3.5" />
            <span>
              Internal Team Preview Mode: Viewing Client Portal for <strong className="font-bold text-foreground">{company.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Client sees only authorized metrics, campaigns & reports
            </span>
            <button
              onClick={handleExitPreview}
              className="px-3 py-1 bg-sky-500 text-white rounded-lg font-medium text-[11px] hover:bg-sky-600 transition-colors"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* Client Portal Header */}
      <header className="p-4 sm:px-6 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center font-bold text-accent text-lg">
            {company.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">{company.name} Client Portal</h1>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-500 font-semibold font-mono">
                RevRecovery Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {company.industry} • Outbound Pipeline & Executive Meeting Dashboard
            </p>
          </div>
        </div>

        {/* Date Filters & User Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border text-xs">
            {(['today', 'week', 'month', 'quarter', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setPortalDateFilter(range)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-colors ${
                  portalDateFilter === range
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>

          {/* User Profile / Exit Button */}
          {portalClientUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-foreground block">{portalClientUser.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize font-mono">
                  {portalClientUser.role.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleExitPreview}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors"
            >
              Exit Portal
            </button>
          )}
        </div>
      </header>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-border bg-muted/20 px-4 sm:px-6 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-4 text-xs font-medium py-1">
          {[
            { id: 'overview', label: 'Executive Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'campaigns', label: 'Outreach & Leads', icon: <Target className="w-3.5 h-3.5" /> },
            { id: 'meetings', label: 'Meetings Booked', icon: <Calendar className="w-3.5 h-3.5" />, badge: metrics.meetingsBooked },
            { id: 'projects', label: 'Deliverables & Sprints', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'documents', label: 'Shared Reports & Strategy', icon: <FileText className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isAllowed = settings?.allowedTabs.includes(tab.id as any) ?? true;
            if (!isAllowed) return null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-accent/15 text-accent font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Portal Content Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Shared Guidance / Account Briefing Banner if set */}
            {settings?.sharedNotes && (
              <div className="p-4 rounded-2xl border border-accent/20 bg-accent/5 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-semibold text-accent">Campaign Briefing & Account Update</h4>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{settings.sharedNotes}</p>
                </div>
              </div>
            )}

            {/* 6 Real Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* Card 1: Leads Generated */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                  <span>Leads Sourced</span>
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">{metrics.leadsGenerated}</div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span>ICP Target:</span>
                  <span className="font-semibold text-foreground">{leadsTarget}</span>
                </div>
              </div>

              {/* Card 2: Outreach Sent */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                  <span>Outreach Sent</span>
                  <Mail className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">{metrics.outreachSent}</div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span>Target:</span>
                  <span className="font-semibold text-foreground">{outreachTarget}</span>
                </div>
              </div>

              {/* Card 3: Replies Received */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                  <span>Replies</span>
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">{metrics.repliesReceived}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {metrics.outreachSent > 0
                    ? `${((metrics.repliesReceived / metrics.outreachSent) * 100).toFixed(1)}% reply rate`
                    : 'Awaiting responses'}
                </div>
              </div>

              {/* Card 4: Qualified Prospects */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                  <span>Qualified</span>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">{metrics.qualifiedProspects}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  <span>{qualifiedTarget} monthly goal</span>
                </div>
              </div>

              {/* Card 5: Meetings Booked / Held */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                  <span>Meetings</span>
                  <PhoneCall className="w-3.5 h-3.5 text-pink-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.meetingsBooked}
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({metrics.meetingsCompleted} held)
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  <span>Target: {meetingsTarget}</span>
                </div>
              </div>

              {/* Card 6: Conversions & Rate */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                  <span>Conversions</span>
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">{metrics.conversions}</div>
                <div className="text-[11px] text-emerald-500 font-semibold mt-1">
                  {metrics.conversionRate}% win rate
                </div>
              </div>
            </div>

            {/* Performance vs Agreed Monthly KPIs */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Agreed Monthly KPI Performance</h3>
                  <p className="text-xs text-muted-foreground">
                    Real-time completion pacing based on verified delivery for this monthly reporting period
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                  Cycle Target Pacing
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                {/* KPI 1 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Outreach Volume</span>
                    <span className="font-mono font-bold text-foreground">
                      {metrics.outreachSent} / {outreachTarget}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full transition-all duration-500"
                      style={{ width: `${outreachPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block text-right">{outreachPct}% delivered</span>
                </div>

                {/* KPI 2 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Researched Leads</span>
                    <span className="font-mono font-bold text-foreground">
                      {metrics.leadsGenerated} / {leadsTarget}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-500"
                      style={{ width: `${leadsPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block text-right">{leadsPct}% delivered</span>
                </div>

                {/* KPI 3 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Qualified Prospects</span>
                    <span className="font-mono font-bold text-foreground">
                      {metrics.qualifiedProspects} / {qualifiedTarget}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${qualifiedPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block text-right">{qualifiedPct}% delivered</span>
                </div>

                {/* KPI 4 */}
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Discovery Meetings</span>
                    <span className="font-mono font-bold text-foreground">
                      {metrics.meetingsBooked} / {meetingsTarget}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-pink-500 h-full transition-all duration-500"
                      style={{ width: `${meetingsPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block text-right">{meetingsPct}% delivered</span>
                </div>
              </div>
            </div>

            {/* Split Grid: Recent Meetings & Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scheduled & Recent Meetings */}
              <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-bold text-foreground">Scheduled Discovery Meetings</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('meetings')}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {meetings.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                    No discovery calls scheduled yet for this period. Outbound prospect confirmations will appear here automatically.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {meetings.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-semibold text-foreground block">{m.title}</span>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>{m.date}</span>
                            <span>•</span>
                            <span>{m.time} ({m.durationMinutes}m)</span>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold font-mono ${
                            m.outcome === 'Completed'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : m.outcome === 'Scheduled'
                              ? 'bg-sky-500/15 text-sky-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {m.outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Campaign Activities Feed */}
              <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-foreground">Campaign Activity Timeline</h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {activities.length} logged touches
                  </span>
                </div>

                {activities.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                    No outreach activities logged for this period yet. Dispatched sequences and connection updates will stream here.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {activities.slice(0, 6).map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground">{a.title}</span>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>Channel: {a.outreachSource || 'LinkedIn'}</span>
                            {a.campaign && <span>• {a.campaign}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: OUTREACH & LEADS PIPELINE */}
        {/* ========================================================= */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-card">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search prospects or campaign names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={selectedLeadStage}
                  onChange={(e) => setSelectedLeadStage(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-muted/40 border border-border rounded-xl text-foreground font-medium"
                >
                  <option value="all">All Pipeline Stages</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Replied">Replied</option>
                  <option value="Interested">Interested</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Meeting Booked">Meeting Booked</option>
                  <option value="Won">Converted (Won)</option>
                </select>
              </div>
            </div>

            {/* Leads Table */}
            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card text-muted-foreground text-xs space-y-2">
                <Target className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <h4 className="font-bold text-foreground text-sm">No Prospect Leads Found</h4>
                <p className="max-w-md mx-auto text-muted-foreground">
                  {leads.length === 0
                    ? `No outbound leads have been associated with ${company.name} for this filter period yet. When the research team uploads and contacts prospects, they will appear in this pipeline view.`
                    : 'No leads match the selected search filters.'}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Opportunity / Prospect</th>
                        <th className="py-3 px-4">Stage</th>
                        <th className="py-3 px-4">Channel</th>
                        <th className="py-3 px-4">Campaign</th>
                        <th className="py-3 px-4">Outreach Status</th>
                        <th className="py-3 px-4 text-right">Meeting</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-foreground block">{lead.title}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">ID: {lead.id.slice(0, 8)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                lead.stage === 'Won'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : lead.stage === 'Meeting Booked' || lead.stage === 'Interested'
                                  ? 'bg-sky-500/15 text-sky-500'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {lead.stage}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{lead.outreachChannel || 'Email'}</td>
                          <td className="py-3 px-4 text-muted-foreground">{lead.campaignName || 'General Outreach'}</td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] text-foreground font-medium">
                              {lead.messageStatus || lead.connectionStatus || 'Initiated'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {lead.meetingStatus && lead.meetingStatus !== 'None' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/15 text-pink-500">
                                {lead.meetingStatus}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MEETINGS SCHEDULE */}
        {/* ========================================================= */}
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Discovery Calls & Sales Meetings</h3>
                <p className="text-xs text-muted-foreground">
                  Confirmed prospect meetings delivered by your RevRecovery acquisition team
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-pink-500/15 text-pink-500">
                {meetings.length} Total Bookings
              </span>
            </div>

            {meetings.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card text-muted-foreground text-xs space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <h4 className="font-bold text-foreground text-sm">No Meetings Scheduled Yet</h4>
                <p className="max-w-md mx-auto text-muted-foreground">
                  Discovery calls booked with verified decision makers will be cataloged here with calendar links, agenda, and outcomes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meetings.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{m.title}</h4>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-accent" />
                          <span>{m.date} at {m.time}</span>
                          <span>•</span>
                          <span>{m.durationMinutes} min</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold font-mono ${
                          m.outcome === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : m.outcome === 'Scheduled'
                            ? 'bg-sky-500/15 text-sky-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {m.outcome}
                      </span>
                    </div>

                    {m.agenda && (
                      <div className="text-xs bg-muted/20 p-2.5 rounded-xl border border-border">
                        <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">Discussion Agenda:</span>
                        <p className="text-foreground">{m.agenda}</p>
                      </div>
                    )}

                    {m.actionItems && m.actionItems.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">Agreed Action Items:</span>
                        <div className="space-y-1">
                          {m.actionItems.map((ai) => (
                            <div key={ai.id} className="flex items-center gap-2 text-xs text-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{ai.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DELIVERABLES & SPRINTS */}
        {/* ========================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <h3 className="text-sm font-bold text-foreground">Delivery Sprints & Milestones</h3>
              <p className="text-xs text-muted-foreground">
                Roadmap milestones and operational checkpoints tracked by the RevRecovery delivery team
              </p>
            </div>

            {projects.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card text-muted-foreground text-xs space-y-2">
                <Layers className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <h4 className="font-bold text-foreground text-sm">No Delivery Sprints Active</h4>
                <p className="max-w-md mx-auto text-muted-foreground">
                  Sprint deliverables and milestone completions will be documented here as delivery progresses.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((p) => {
                  const completedMilestones = p.milestones.filter((m) => m.completed).length;
                  const totalMilestones = p.milestones.length;
                  const pct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

                  return (
                    <div key={p.id} className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">{p.name}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500">
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                        </div>
                        <div className="text-right sm:shrink-0">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {completedMilestones} of {totalMilestones} Completed
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            Target: {p.targetDate}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent h-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Milestone List */}
                      {p.milestones.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Deliverable Milestones
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {p.milestones.map((m) => (
                              <div
                                key={m.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                  m.completed
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
                                    : 'bg-muted/20 border-border text-muted-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                      m.completed ? 'bg-emerald-500 text-white' : 'border border-border'
                                    }`}
                                  >
                                    {m.completed && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className={m.completed ? 'font-medium' : ''}>{m.title}</span>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                                  {m.dueDate}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SHARED STRATEGY & DOCUMENTS */}
        {/* ========================================================= */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <h3 className="text-sm font-bold text-foreground">Executive Strategy & Compliance Documents</h3>
              <p className="text-xs text-muted-foreground">
                Official documents, ICP specifications, and monthly attribution summaries shared by RevRecovery
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedDocs.map((doc) => (
                <div key={doc.id} className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">{doc.title}</h4>
                      <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                        {doc.type} • Updated {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-emerald-500 font-semibold text-[11px] flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Client Verified
                    </span>
                    <button
                      onClick={() => alert(`Document "${doc.title}" opened for view.`)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
