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
  UploadCloud,
  DownloadCloud,
  Check,
  Info,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  PlayCircle,
  Lock,
} from 'lucide-react';
import {
  loadFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  checkFirebaseStatus,
  testFirestoreReadWrite,
  signInFirebaseUser,
  signUpFirebaseUser,
  signOutFirebaseUser,
  FirebaseConfig,
  FirebaseStatus,
} from '@/lib/firebase';
import { pushLocalDataToFirestore, pullCloudDataToIndexedDB } from '@/lib/firebaseSync';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIRESTORE_RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isWorkspaceMember(workspaceId) {
      return isAuthenticated() && (
        exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)) ||
        (exists(/databases/$(database)/documents/workspaces/$(workspaceId)) &&
         get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerId == request.auth.uid) ||
        request.auth.token.workspaceId == workspaceId ||
        workspaceId == 'ws-main'
      );
    }

    function isWorkspaceAdmin(workspaceId) {
      return isAuthenticated() && (
        (exists(/databases/$(database)/documents/workspaces/$(workspaceId)) &&
         get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerId == request.auth.uid) ||
        (exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)).data.role in ['owner', 'co-founder', 'co-owner', 'admin'])
      );
    }

    match /system/ping {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }

    match /workspaces/{workspaceId} {
      allow read: if isWorkspaceMember(workspaceId);
      allow create: if isAuthenticated();
      allow update, delete: if isWorkspaceAdmin(workspaceId);

      match /members/{memberId} {
        allow read: if isWorkspaceMember(workspaceId);
        allow write: if isWorkspaceAdmin(workspaceId) || (isAuthenticated() && memberId == request.auth.uid);
      }

      match /{allChildren=**} {
        allow read, write: if isWorkspaceMember(workspaceId);
      }
    }
  }
}`;

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
    isAuthenticated: false,
    userEmail: null,
    userUid: null,
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

  // Auth fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  // Live Read/Write Test
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ success: boolean; message: string } | null>(null);

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
        isAuthenticated: false,
        userEmail: null,
        userUid: null,
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
      let clean = jsonPaste.trim();
      if (clean.includes('{') && clean.includes('}')) {
        clean = clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
      }
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthFeedback('Please enter both email and password.');
      return;
    }
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const user = await signInFirebaseUser(authEmail.trim(), authPassword.trim());
      setAuthFeedback(`Signed in successfully as ${user.email}`);
      await refreshStatus();
    } catch (err: any) {
      setAuthFeedback(`Sign-in failed: ${err?.message || 'Authentication error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthFeedback('Please enter both email and password.');
      return;
    }
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const user = await signUpFirebaseUser(authEmail.trim(), authPassword.trim());
      setAuthFeedback(`Account created successfully! Signed in as ${user.email}`);
      await refreshStatus();
    } catch (err: any) {
      setAuthFeedback(`Registration failed: ${err?.message || 'Authentication error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutFirebaseUser();
      setAuthFeedback('Signed out from Firebase Authentication.');
      await refreshStatus();
    } catch (err: any) {
      setAuthFeedback(`Sign-out failed: ${err?.message}`);
    }
  };

  const handleRunLiveTest = async () => {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await testFirestoreReadWrite();
      setProbeResult(res);
      await refreshStatus();
    } catch (err: any) {
      setProbeResult({ success: false, message: err?.message || 'Test failed' });
    } finally {
      setProbing(false);
    }
  };

  const handleCopyRules = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(FIRESTORE_RULES_TEXT);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 3000);
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
                    ? 'Firebase Configured (Connection Status)'
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

          {/* Authentication & User Session Box */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-accent" /> Firebase Authentication (Email / Password)
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  status.isAuthenticated
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {status.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>

            {status.isAuthenticated ? (
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Signed in as: {status.userEmail}</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    UID: {status.userUid}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Sign Out
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Firestore workspace security rules require authenticated access. Sign in or create a team account to enable live Cloud Firestore syncing.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="name@revrecovery.io"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password (min 6 chars)"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 text-xs flex items-center gap-1"
                  >
                    <LogIn className="w-3 h-3" />
                    {authLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleSignUp}
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground text-xs"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {authFeedback && (
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs">
                {authFeedback}
              </div>
            )}
          </div>

          {/* Live Firestore Read / Write Diagnostic Tester */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4 text-accent" /> Live Authenticated Firestore Probe Test
              </span>
              <button
                type="button"
                onClick={handleRunLiveTest}
                disabled={probing}
                className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
                <span>{probing ? 'Testing...' : 'Run Live Test'}</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Performs an authentic write to <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">workspaces/ws-main/companies/probe</code>, reads it back with authenticated rules, and cleans up the probe.
            </p>

            {probeResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  probeResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                }`}
              >
                {probeResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                )}
                <span>{probeResult.message}</span>
              </div>
            )}
          </div>

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

          {/* Security Rules & 1-Click Copy */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-500 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Secure Workspace Security Rules
              </span>
              <button
                type="button"
                onClick={handleCopyRules}
                className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25 font-semibold text-[11px] flex items-center gap-1"
              >
                {copiedRules ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRules ? 'Rules Copied!' : 'Copy Rules to Clipboard'}</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              In Firebase Console &gt; <strong>Firestore Database</strong> &gt; <strong>Rules</strong> tab, paste the rules and click <strong>Publish</strong> to enable authenticated workspace isolation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
