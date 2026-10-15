'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  TrendingUp,
  Target,
  DollarSign,
  CheckCircle2,
  Calendar,
  Users,
  ShieldCheck,
  Percent,
  Flame,
  ArrowRight,
  BarChart3,
} from 'lucide-react';

export const GoalsReportsView: React.FC = () => {
  const {
    companies,
    leads,
    clients,
    tasks,
    meetings,
    proposals,
    kpiTargets,
  } = useRevRecoveryStore();

  const [period, setPeriod] = useState<'all' | 'q4'>('q4');

  // Real Calculated Metrics
  const totalResearched = companies.length;
  const verifiedLeads = companies.filter((c) => c.verificationStatus === 'Verified').length;
  const contactedLeads = leads.filter((l) =>
    ['Contacted', 'Follow-up Due', 'Replied', 'Interested', 'Meeting Booked', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage)
  ).length;
  const repliedLeads = leads.filter((l) =>
    ['Replied', 'Interested', 'Meeting Booked', 'Meeting Completed', 'Proposal Sent', 'Won'].includes(l.stage)
  ).length;
  const meetingsBooked = meetings.length;
  const proposalsSent = proposals.filter((p) => ['Sent', 'Negotiation', 'Accepted'].includes(p.status)).length;
  const dealsWon = leads.filter((l) => l.stage === 'Won').length;
  const totalRecordedRevenue = leads
    .filter((l) => l.stage === 'Won')
    .reduce((sum, l) => sum + (l.value || 0), 0);

  // Conversion Rates
  const verificationRate = totalResearched > 0 ? Math.round((verifiedLeads / totalResearched) * 100) : 0;
  const replyRate = contactedLeads > 0 ? Math.round((repliedLeads / contactedLeads) * 100) : 0;
  const closeRate = meetingsBooked > 0 ? Math.round((dealsWon / meetingsBooked) * 100) : 0;

  // Operational Metrics
  const tasksCompleted = tasks.filter((t) => t.status === 'Done').length;
  const tasksOverdue = tasks.filter((t) => {
    if (t.status === 'Done' || !t.dueDate) return false;
    return new Date(t.dueDate).getTime() < Date.now();
  }).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Goals, KPIs & Funnel Analytics</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-500 font-semibold font-mono">
              Live Database Verification
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict quantitative audit: distinguishing verified counts, conversion rates, and closed revenue
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">Evaluation Period:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none"
          >
            <option value="q4">{kpiTargets.period} Targets</option>
            <option value="all">Lifetime All-Time</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 1. Target vs Actual Performance Scorecard */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold">{kpiTargets.period} Targets vs Actuals</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Goal Completion Rate: {Math.round(((totalRecordedRevenue / kpiTargets.targetRevenue) * 100))}% of ARR Target
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {/* Target 1: Companies */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-[11px] text-muted-foreground block">Companies Sourced</span>
              <div className="text-lg font-bold mt-1">{totalResearched}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Target: {kpiTargets.targetCompaniesResearched}</div>
              <div className="w-full bg-muted rounded-full h-1 mt-2">
                <div
                  className="bg-accent h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round((totalResearched / kpiTargets.targetCompaniesResearched) * 100))}%` }}
                />
              </div>
            </div>

            {/* Target 2: Verified */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-[11px] text-muted-foreground block">ICP Verified Leads</span>
              <div className="text-lg font-bold mt-1 text-emerald-500">{verifiedLeads}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Target: {kpiTargets.targetLeadsVerified}</div>
              <div className="w-full bg-muted rounded-full h-1 mt-2">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round((verifiedLeads / kpiTargets.targetLeadsVerified) * 100))}%` }}
                />
              </div>
            </div>

            {/* Target 3: Outreach Sent */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-[11px] text-muted-foreground block">Outreach Touchpoints</span>
              <div className="text-lg font-bold mt-1 text-blue-500">{contactedLeads}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Target: {kpiTargets.targetOutreachSent}</div>
              <div className="w-full bg-muted rounded-full h-1 mt-2">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round((contactedLeads / kpiTargets.targetOutreachSent) * 100))}%` }}
                />
              </div>
            </div>

            {/* Target 4: Meetings Booked */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-[11px] text-muted-foreground block">Meetings Booked</span>
              <div className="text-lg font-bold mt-1 text-accent">{meetingsBooked}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Target: {kpiTargets.targetMeetingsBooked}</div>
              <div className="w-full bg-muted rounded-full h-1 mt-2">
                <div
                  className="bg-accent h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round((meetingsBooked / kpiTargets.targetMeetingsBooked) * 100))}%` }}
                />
              </div>
            </div>

            {/* Target 5: Deals Won */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-[11px] text-muted-foreground block">Closed Won Deals</span>
              <div className="text-lg font-bold mt-1 text-emerald-500">{dealsWon}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Target: {kpiTargets.targetDealsWon}</div>
              <div className="w-full bg-muted rounded-full h-1 mt-2">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round((dealsWon / kpiTargets.targetDealsWon) * 100))}%` }}
                />
              </div>
            </div>

            {/* Target 6: Recorded Revenue */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-[11px] text-muted-foreground block">Closed Won Revenue</span>
              <div className="text-lg font-bold mt-1 text-emerald-500">${totalRecordedRevenue.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Target: ${kpiTargets.targetRevenue.toLocaleString()}</div>
              <div className="w-full bg-muted rounded-full h-1 mt-2">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round((totalRecordedRevenue / kpiTargets.targetRevenue) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Visual Acquisition Funnel Breakdown */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" /> B2B Acquisition Conversion Waterfall
            </h2>
            <span className="text-xs text-muted-foreground">End-to-End Pipeline Health</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Step 1 */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <span className="font-semibold text-foreground">Target Companies Sourced</span>
                  <span className="text-muted-foreground block text-[11px]">Cold target universe researched against industry and headcount criteria</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-base text-foreground font-mono">{totalResearched}</span>
                <span className="block text-[10px] text-muted-foreground">100% of pipeline top</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-500 font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <span className="font-semibold text-foreground">ICP Verified Leads</span>
                  <span className="text-muted-foreground block text-[11px]">Passed 4-layer verification standard with verifiable evidence</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-base text-emerald-500 font-mono">{verifiedLeads}</span>
                <span className="block text-[10px] text-emerald-500 font-medium">{verificationRate}% pass rate</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <div>
                  <span className="font-semibold text-foreground">Contacted in Outreach</span>
                  <span className="text-muted-foreground block text-[11px]">Multi-channel personalized touchpoint delivered</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-base text-blue-500 font-mono">{contactedLeads}</span>
                <span className="block text-[10px] text-muted-foreground">Active touchpoints</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <div>
                  <span className="font-semibold text-foreground">Discovery Meetings Booked</span>
                  <span className="text-muted-foreground block text-[11px]">Qualified prospects attending structured discovery calls</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-base text-accent font-mono">{meetingsBooked}</span>
                <span className="block text-[10px] text-muted-foreground">Booked calendar events</span>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-600/15 text-emerald-500 font-bold flex items-center justify-center text-xs">
                  5
                </span>
                <div>
                  <span className="font-semibold text-foreground">Closed Won Clients & Revenue</span>
                  <span className="text-muted-foreground block text-[11px]">Active service agreements and retainers</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-base text-emerald-500 font-mono">${totalRecordedRevenue.toLocaleString()}</span>
                <span className="block text-[10px] text-emerald-500 font-medium">{dealsWon} clients ({closeRate}% close rate)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Operational Integrity & Hygiene */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
              Tasks Completed
            </span>
            <div className="text-2xl font-bold mt-1 text-foreground">{tasksCompleted}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Operational activities resolved by team
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
              Overdue Tasks
            </span>
            <div className={`text-2xl font-bold mt-1 ${tasksOverdue > 0 ? 'text-rose-500' : 'text-foreground'}`}>
              {tasksOverdue}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {tasksOverdue > 0 ? 'Action required immediately' : 'Zero overdue items'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
              Active Client Retainers
            </span>
            <div className="text-2xl font-bold mt-1 text-emerald-500">{clients.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Currently serviced client accounts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
