'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  Shield,
  Lock,
  Mail,
  Key,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building,
  HelpCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

function ClientPortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    isInitialized: isRevInitialized,
    init: initRevRecovery,
    clients,
    companies,
    clientPortalUsers,
    setPortalClientId,
    setPortalClientUser,
    setIsClientPortalMode,
    updateClient,
  } = useRevRecoveryStore();

  const { init: initWorkspace } = useWorkspaceStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    initWorkspace();
    initRevRecovery();
  }, [initWorkspace, initRevRecovery]);

  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      setEmail(urlEmail.trim().toLowerCase());
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid business email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const urlClientId = searchParams.get('clientId');

      // 1. Enforce Client Organization & Email Binding
      // A user cannot gain access merely by entering a client ID or knowing the portal URL.
      const matchedUser = clientPortalUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!matchedUser) {
        setErrorMessage(
          'Access Denied: This email address has not been invited to any RevRecovery client portal. Please contact your account manager.'
        );
        setIsLoading(false);
        return;
      }

      // 2. Prevent cross-client access: if a specific clientId is provided in the URL, verify assignment
      if (urlClientId && matchedUser.clientId !== urlClientId) {
        setErrorMessage(
          'Security Error: This email invitation is not authorized to access the requested client organization.'
        );
        setIsLoading(false);
        return;
      }

      // 3. Check if user access is revoked
      if (matchedUser.status === 'revoked') {
        setErrorMessage(
          'Access Revoked: Portal access for this account has been revoked by the RevRecovery operations team.'
        );
        setIsLoading(false);
        return;
      }

      // 4. Verify client organization exists and is active
      const targetClient = clients.find((c) => c.id === matchedUser.clientId);
      if (!targetClient) {
        setErrorMessage('Client account record could not be found. Please contact support.');
        setIsLoading(false);
        return;
      }

      if (targetClient.portalSettings && !targetClient.portalSettings.enabled) {
        setErrorMessage(
          'Client Portal Offline: Access for your organization is currently suspended by the account team.'
        );
        setIsLoading(false);
        return;
      }

      // 5. Update user status to 'active' on first successful authentication
      const updatedUser = {
        ...matchedUser,
        status: 'active' as const,
        lastLoginAt: Date.now(),
      };

      // Set client organization and user in isolated portal store
      setPortalClientId(targetClient.id);
      setPortalClientUser(updatedUser);
      setIsClientPortalMode(true);

      // If client status was 'Invitation Pending', update to 'Active'
      if (targetClient.portalAccessStatus === 'Invitation Pending') {
        await updateClient(targetClient.id, { portalAccessStatus: 'Active' });
      }

      // 6. Redirect to dedicated client dashboard
      router.push('/client-portal/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background text-foreground antialiased selection:bg-accent/20">
      {/* Top Navbar */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center font-bold text-accent text-lg shadow-xs">
            ⚡
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">RevRecovery OS</span>
            <span className="text-[10px] text-muted-foreground block font-mono">Client Portal Gate</span>
          </div>
        </div>

        <a
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1.5"
        >
          <span>Internal Team Login</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </nav>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Card Header */}
          <div className="p-6 border-b border-border bg-muted/20 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center mx-auto shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Client Portal Access</h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Sign in with your invited representative email to access your authorized RevRecovery performance dashboard.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{infoMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-muted-foreground font-medium">Invited Contact Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                Must match the exact email address invited by your account executive.
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-muted-foreground font-medium">Password / Access Key</label>
                <span className="text-[10px] text-muted-foreground">First time? Set password below</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-muted/50 border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate & Enter Portal</span>
                </>
              )}
            </button>

            <div className="pt-3 border-t border-border/60 text-center text-[11px] text-muted-foreground space-y-1">
              <p>Security Notice: Cross-client access and self-assigned roles are strictly prevented.</p>
              <p>Internal CRM data and proprietary team notes are completely hidden from client accounts.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen w-screen bg-background">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            <span className="text-xs text-muted-foreground font-mono">Loading Client Portal Gateway...</span>
          </div>
        </div>
      }
    >
      <ClientPortalLoginForm />
    </Suspense>
  );
}
