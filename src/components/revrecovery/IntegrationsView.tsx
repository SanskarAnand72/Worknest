'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Plug,
  CheckCircle,
  AlertCircle,
  Clock,
  Key,
  ExternalLink,
  Zap,
  RefreshCw,
  Play,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { IntegrationConfig } from '@/types/revrecovery';
import { ConfigureIntegrationModal } from './QuickModals';

export const IntegrationsView: React.FC = () => {
  const {
    integrations,
    automationRules,
    toggleAutomation,
  } = useRevRecoveryStore();

  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'integrations' | 'automations'>('integrations');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Integrations & Autonomous Engine</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
              {integrations.filter((i) => i.status === 'Connected').length} / {integrations.length} connected
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Authentic integration health states, safe API credential storage, and status-triggered automations
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border text-xs">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'integrations' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Connected Providers ({integrations.length})
          </button>
          <button
            onClick={() => setActiveTab('automations')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'automations' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active Automations ({automationRules.length})
          </button>
        </div>
      </div>

      {/* Main Display */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'integrations' ? (
          <div>
            {/* Authentic Status Notice */}
            <div className="mb-6 p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground block">Zero-Fabrication Policy</span>
                <span>
                  All integration providers display their honest state. To connect an integration, click "Configure" to enter verified credentials or webhook endpoints.
                </span>
              </div>
              <div className="text-right font-mono text-[11px] text-muted-foreground">
                Encryption: Client-side Isolated DB
              </div>
            </div>

            {/* Integration Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-wide">
                        {item.category}
                      </span>
                      {/* Real Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.status === 'Connected'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : item.status === 'Setup Required'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.status === 'Connected' && <CheckCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {item.lastSyncAt ? `Last Sync: ${new Date(item.lastSyncAt).toLocaleTimeString()}` : 'Never synced'}
                    </span>

                    <button
                      onClick={() => setSelectedIntegration(item)}
                      className="px-2.5 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Settings className="w-3 h-3" />
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Automations Tab */
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-sm font-bold">RevRecovery Workflow Automations</h2>
                <p className="text-xs text-muted-foreground">
                  Event-driven pipelines triggering task creations, status updates, and notifications
                </p>
              </div>
              <span className="text-xs font-mono text-accent font-semibold">
                {automationRules.filter((r) => r.enabled).length} Enabled
              </span>
            </div>

            <div className="space-y-3">
              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${rule.enabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <span className="font-bold text-xs text-foreground">{rule.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <strong>Trigger:</strong> {rule.trigger} • <strong>Condition:</strong> {rule.condition}
                    </div>
                    <div className="text-[11px] text-accent">
                      <strong>Action:</strong> {rule.action}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right text-[11px] font-mono text-muted-foreground">
                      <div>Executions: <strong>{rule.executionCount}</strong></div>
                      {rule.lastExecutedAt && (
                        <div>Last: {new Date(rule.lastExecutedAt).toLocaleTimeString()}</div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleAutomation(rule.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        rule.enabled
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {rule.enabled ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfigureIntegrationModal
        isOpen={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        integration={selectedIntegration}
      />
    </div>
  );
};
