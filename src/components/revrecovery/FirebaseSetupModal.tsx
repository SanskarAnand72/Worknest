'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Flame,
  CheckCircle,
  AlertCircle,
  Shield,
  Key,
  Copy,
  ExternalLink,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import {
  loadFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  checkFirebaseStatus,
  FirebaseConfig,
  FirebaseStatus,
} from '@/lib/firebase';
import { pushLocalDataToFirestore, pullCloudDataToIndexedDB, SyncResult } from '@/lib/firebaseSync';
import { UploadCloud, DownloadCloud, Check, Info } from 'lucide-react';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [jsonPaste, setJsonPaste] = useState('');

  const [status, setStatus] = useState<FirebaseStatus>({
    isConfigured: false,
    isConnected: false,
    projectId: null,
    authDomain: null,
    activeMode: 'indexeddb',
    error: null,
  });

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = loadFirebaseConfig();
      if (existing) {
        setApiKey(existing.apiKey || '');
        setAuthDomain(existing.authDomain || '');
        setProjectId(existing.projectId || '');
        setStorageBucket(existing.storageBucket || '');
        setMessagingSenderId(existing.messagingSenderId || '');
        setAppId(existing.appId || '');
      }
      refreshStatus();
    }
  }, [isOpen]);

  const refreshStatus = async () => {
    setTesting(true);
    try {
      const res = await checkFirebaseStatus();
      setStatus(res);
    } catch (err: any) {
      setStatus({
        isConfigured: false,
        isConnected: false,
        projectId: null,
        authDomain: null,
        activeMode: 'indexeddb',
        error: err?.message || 'Error checking status',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleParseJson = () => {
    try {
      // Clean JSON text if wrapped in `const firebaseConfig = { ... };`
      let clean = jsonPaste.trim();
      if (clean.includes('{') && clean.includes('}')) {
        clean = clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
      }
      // Replace unquoted keys with quoted keys for JSON.parse
      const sanitized = clean.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"');
      const parsed = JSON.parse(sanitized);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
      if (parsed.appId) setAppId(parsed.appId);

      setSaveMessage('Firebase configuration parsed from JSON successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e: any) {
      alert('Could not parse JSON. Please check format or fill fields manually.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim() || !appId.trim()) {
      alert('API Key, Project ID, and App ID are required.');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveFirebaseConfig(config);
    setSaveMessage('Configuration saved. Verifying connection...');
    await refreshStatus();
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect Firebase and revert to local IndexedDB storage? Your local records will remain intact.')) {
      clearFirebaseConfig();
      setApiKey('');
      setAuthDomain('');
      setProjectId('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      refreshStatus();
    }
  };

  const handlePushSync = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await pushLocalDataToFirestore();
      if (res.success) {
        setSyncFeedback(`Successfully synchronized ${res.pushedCount} records from local IndexedDB to Cloud Firestore!`);
      } else {
        setSyncFeedback(`Sync failed: ${res.error}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePullSync = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await pullCloudDataToIndexedDB();
      if (res.success) {
        setSyncFeedback(`Successfully pulled ${res.pulledCount} records from Cloud Firestore to local storage!`);
      } else {
        setSyncFeedback(`Pull failed: ${res.error}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Pull failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Firebase Integration & Cloud Persistence</h2>
              <p className="text-[11px] text-muted-foreground">
                Dual-layer storage: High-speed local IndexedDB + Cloud Firestore Workspace Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Current Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              status.isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : status.isConfigured
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-muted/50 border-border text-foreground'
            }`}
          >
            {status.isConnected ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            ) : status.isConfigured ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            ) : (
              <HardDrive className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
            )}

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">
                  {status.isConnected
                    ? 'Firebase Connected & Active'
                    : status.isConfigured
                    ? 'Firebase Configured (Connection Notice)'
                    : 'Local IndexedDB Active (Default)'}
                </span>
                <button
                  type="button"
                  onClick={refreshStatus}
                  disabled={testing}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground underline"
                >
                  <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                  Test Status
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {status.isConnected
                  ? `Connected to Firestore project "${status.projectId}". Workspace data isolation and real-time syncing enabled.`
                  : status.isConfigured
                  ? `Project ID "${status.projectId}". ${status.error || 'Verifying credentials...'}`
                  : 'RevRecovery is currently operating offline-first with IndexedDB in your browser. All records are safe locally. Connect Firebase below for multi-user collaboration.'}
              </p>
            </div>
          </div>

          {saveMessage && (
            <div className="p-2.5 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* Quick Paste JSON */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-accent" /> Quick Paste Firebase Config JSON
              </label>
              <button
                type="button"
                onClick={handleParseJson}
                className="px-2 py-1 rounded bg-muted hover:bg-background border border-border text-[10px] font-medium"
              >
                Autofill Fields
              </button>
            </div>
            <textarea
              rows={2}
              value={jsonPaste}
              onChange={(e) => setJsonPaste(e.target.value)}
              placeholder='Paste { apiKey: "AIza...", projectId: "...", appId: "..." } from Firebase Console'
              className="w-full p-2 font-mono text-[11px] bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-accent" /> Firebase Project Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">API Key *</label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Project ID *</label>
                <input
                  type="text"
                  required
                  placeholder="revrecovery-os"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Auth Domain</label>
                <input
                  type="text"
                  placeholder="revrecovery-os.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">App ID *</label>
                <input
                  type="text"
                  required
                  placeholder="1:123456789:web:abcdef"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Storage Bucket</label>
                <input
                  type="text"
                  placeholder="revrecovery-os.appspot.com"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Messaging Sender ID</label>
                <input
                  type="text"
                  placeholder="123456789012"
                  value={messagingSenderId}
                  onChange={(e) => setMessagingSenderId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {status.isConfigured ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  Disconnect Firebase
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-1.5 text-xs rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
                >
                  {testing ? 'Testing...' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </form>

          {/* Cloud Synchronization Section */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-accent" /> IndexedDB ⇄ Firestore Synchronization
              </span>
              <span className="text-[10px] text-muted-foreground">Safe Two-Way Sync</span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Local IndexedDB is the source of truth for offline-first speed. When Cloud Firestore is active, you can synchronize all accounts, leads, retainers, and tasks to the cloud with zero data loss.
            </p>

            {syncFeedback && (
              <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs">
                {syncFeedback}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePushSync}
                disabled={syncing || testing}
                className="px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent hover:bg-accent/20 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{syncing ? 'Syncing...' : 'Push Local Data to Firestore'}</span>
              </button>

              <button
                type="button"
                onClick={handlePullSync}
                disabled={syncing || testing}
                className="px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Pull from Cloud Firestore</span>
              </button>
            </div>
          </div>

          {/* Firebase Console Setup Steps Notice */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
              <Info className="w-4 h-4" />
              <span>Required One-Time Firebase Console Steps for Project: {projectId || 'notion-f316c'}</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed pl-1">
              <li>
                <strong>Enable Cloud Firestore:</strong> Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-accent underline">Firebase Console</a> &gt; select <strong>notion-f316c</strong> &gt; click <strong>Build &gt; Firestore Database</strong> &gt; click <strong>Create database</strong>.
              </li>
              <li>
                <strong>Enable Authentication:</strong> In Firebase Console, click <strong>Build &gt; Authentication</strong> &gt; click <strong>Get started</strong> &gt; enable <strong>Email/Password</strong> under Sign-in method.
              </li>
              <li>
                <strong>Security Rules:</strong> In Firestore Database &gt; <strong>Rules</strong> tab, paste the rules from <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">firestore.rules</code> (already included in this project root) to enforce workspace isolation and Owner/Co-Founder permissions.
              </li>
            </ol>
          </div>

          {/* Security & Workspace Rules Information */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> Workspace Isolation Security Rules
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">firestore.rules ready in root</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              RevRecovery enforces workspace-based multi-tenancy at the path <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">workspaces/{'{workspaceId}'}/*</code>. One team cannot read or modify another team&apos;s leads, clients, or revenue figures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
