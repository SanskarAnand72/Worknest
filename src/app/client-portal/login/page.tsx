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
  Sparkles,
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

  const [authMode, setAuthMode] = useState<'setup' | 'signin'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [invitedOrgName, setInvitedOrgName] = useState<string | null>(null);
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerificationComplete, setEmailVerificationComplete] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const isResetFlow = mode === 'resetPassword' || (Boolean(oobCode) && mode !== 'verifyEmail');

  useEffect(() => {
    initWorkspace();
    initRevRecovery();
  }, [initWorkspace, initRevRecovery]);

  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      const normalized = urlEmail.trim().toLowerCase();
      setEmail(normalized);

      // Pre-verify invitation authorization to display clean organization context and determine initial mode
      const urlClientId = searchParams.get('clientId');
      const verifyUrl = urlClientId
        ? `/api/client-portal/invitation?email=${encodeURIComponent(normalized)}&clientId=${encodeURIComponent(urlClientId)}`
        : `/api/client-portal/invitation?email=${encodeURIComponent(normalized)}`;

      fetch(verifyUrl)
        .then((r) => r.json())
        .then((data) => {
          if (data.exists && data.user) {
            if (data.user.clientName) {
              setInvitedOrgName(data.user.clientName);
            }
            if (data.user.status === 'invited') {
              setAuthMode('setup');
            } else if (data.user.status === 'active') {
              setAuthMode('signin');
            }
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Handle Firebase Email Verification link click (mode=verifyEmail&oobCode=...)
  useEffect(() => {
    if (mode === 'verifyEmail' && oobCode) {
      setIsVerifyingEmail(true);
      setErrorMessage(null);
      setInfoMessage(null);

      fetch('/api/client-portal/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', oobCode }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setEmailVerificationComplete(true);
            setRequiresVerification(false);
            setInfoMessage(
              data.message || 'Your email address has been verified successfully! You may now sign in below.'
            );
            if (data.email) {
              setEmail(data.email);
            }
          } else {
            setErrorMessage(data.error || 'The email verification link is invalid or has expired.');
          }
        })
        .catch(() => {
          setErrorMessage('Failed to verify email link. Please try again or request a new link.');
        })
        .finally(() => {
          setIsVerifyingEmail(false);
        });
    }
  }, [mode, oobCode]);

  // Resend Verification Email Handler
  const handleResendVerificationLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Please enter your business email address above to receive a verification link.');
      return;
    }

    setIsResendingVerification(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/client-portal/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          email: normalizedEmail,
          password: password || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInfoMessage(
          data.message || `A fresh verification link has been sent to ${normalizedEmail}. Please check your inbox and spam folder.`
        );
      } else {
        setErrorMessage(data.error || 'Failed to dispatch verification email.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error sending verification link.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const urlClientId = searchParams.get('clientId');

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Please enter your business email address above to receive a setup link.');
      return;
    }

    setIsSendingReset(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/client-portal/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          clientId: urlClientId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInfoMessage(
          data.message || `Password setup link sent to ${normalizedEmail}! Please check your email inbox.`
        );
        setCanResetPassword(false);
      } else {
        setErrorMessage(data.error || 'Failed to dispatch password setup link.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error sending password setup link.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) {
      setErrorMessage('Missing password reset verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          oobCode,
          newPassword,
          email: email.trim().toLowerCase(),
          clientId: searchParams.get('clientId'),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'revrecovery_portal_session',
            JSON.stringify({
              user: data.user,
              clientId: data.client.id,
              client: data.client,
              company: data.company,
              timestamp: Date.now(),
            })
          );
        }

        if (data.client && clients.some((c) => c.id === data.client.id)) {
          await updateClient(data.client.id, {
            portalAccessStatus: 'Active',
            operationalMetrics: data.client.operationalMetrics,
          });
        }

        setPortalClientId(data.client.id);
        setPortalClientUser(data.user);
        setIsClientPortalMode(true);
        router.push('/client-portal/dashboard');
      } else {
        setErrorMessage(data.error || 'Failed to update password. The link may have expired.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error setting new password.');
    } finally {
      setIsLoading(false);
    }
  };

  // First-Time Password Setup Submission Handler
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const urlClientId = searchParams.get('clientId');

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Please enter a valid business email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const targetClient = clients.find(
        (c) =>
          (urlClientId && c.id.toLowerCase() === urlClientId.toLowerCase()) ||
          (c.contactEmail && c.contactEmail.toLowerCase().trim() === normalizedEmail)
      );
      const targetCompany = targetClient
        ? companies.find((comp) => comp.id === targetClient.companyId)
        : undefined;

      const res = await fetch('/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setupPassword',
          email: normalizedEmail,
          password,
          clientId: urlClientId || targetClient?.id,
          client: targetClient,
          company: targetCompany,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save active session for client dashboard
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'revrecovery_portal_session',
            JSON.stringify({
              user: data.user,
              clientId: data.client.id,
              client: data.client,
              company: data.company,
              timestamp: Date.now(),
            })
          );
        }

        if (data.client && clients.some((c) => c.id === data.client.id)) {
          await updateClient(data.client.id, {
            portalAccessStatus: 'Active',
            operationalMetrics: data.client.operationalMetrics,
          });
        }

        setPortalClientId(data.client.id);
        setPortalClientUser(data.user);
        setIsClientPortalMode(true);
        router.push('/client-portal/dashboard');
      } else if (data.requiresReset) {
        // Pre-existing account requiring verification link
        setInfoMessage(
          data.error || 'A secure password confirmation link has been sent to your email inbox. Please click the link to confirm your password.'
        );
      } else {
        setErrorMessage(data.error || 'Failed to complete password setup. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Setup error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to set password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Returning User Sign-In Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const urlClientId = searchParams.get('clientId');

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Please enter a valid business email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      let authSuccessful = false;
      let authenticatedUser: any = null;
      let targetClientId: string | null = null;

      const localClient = clients.find(
        (c) =>
          (urlClientId && c.id.toLowerCase() === urlClientId.toLowerCase()) ||
          (c.contactEmail && c.contactEmail.toLowerCase().trim() === normalizedEmail) ||
          c.portalUserIds?.some((uid) => {
            const pu = clientPortalUsers.find((u) => u.id === uid);
            return pu && pu.email.toLowerCase() === normalizedEmail;
          })
      );
      const localCompany = localClient
        ? companies.find((comp) => comp.id === localClient.companyId)
        : undefined;

      const portalPasswordHash =
        localClient?.portalPasswordHash ||
        localClient?.portalSettings?.portalPasswordHash ||
        clientPortalUsers.find((u) => u.email.toLowerCase() === normalizedEmail)?.portalPasswordHash;

      // 1. Attempt authentication via Client Portal Auth API
      try {
        const res = await fetch('/api/client-portal/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            clientId: urlClientId || localClient?.id,
            client: localClient,
            company: localCompany,
            portalPasswordHash,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          authSuccessful = true;
          authenticatedUser = data.user;
          targetClientId = data.client.id;

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'revrecovery_portal_session',
              JSON.stringify({
                user: data.user,
                clientId: data.client.id,
                client: data.client,
                company: data.company,
                timestamp: Date.now(),
              })
            );
          }

          if (data.client && clients.some((c) => c.id === data.client.id)) {
            await updateClient(data.client.id, {
              portalAccessStatus: 'Active',
              operationalMetrics: data.client.operationalMetrics,
            });
          }
        } else {
          if (data.requiresVerification) {
            setRequiresVerification(true);
          }
          if (data.diagnostic) {
            console.warn('[RevRecovery Portal Security Diagnostic]', data.diagnostic);
          }
          if (data.canResetPassword) {
            setCanResetPassword(true);
          }
          setErrorMessage(data.error || 'Incorrect password for this account.');
          setIsLoading(false);
          return;
        }
      } catch (fetchErr) {
        // Fallback to local store check (e.g. offline mode or test environment)
        console.warn('API call fallback to local store:', fetchErr);

        let matchedUser = clientPortalUsers.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        );

        let targetClient =
          localClient ||
          clients.find(
            (c) =>
              (urlClientId && c.id.toLowerCase() === urlClientId.toLowerCase()) ||
              (matchedUser && c.id === matchedUser.clientId) ||
              (c.contactEmail && c.contactEmail.toLowerCase().trim() === normalizedEmail)
          );

        if (!matchedUser && targetClient) {
          const clientRec = targetClient;
          const comp = companies.find((co) => co.id === clientRec.companyId);
          matchedUser = {
            id: `cpu-${clientRec.id}-${Date.now().toString(36)}`,
            clientId: clientRec.id,
            clientName: comp?.name || 'Client',
            name: comp?.name || 'Client Representative',
            email: normalizedEmail,
            role: 'client_admin',
            status: 'active',
            invitedBy: 'admin',
            invitedAt: Date.now(),
            createdAt: Date.now(),
          };
        }

        if (!matchedUser) {
          setErrorMessage(
            'Access Denied: This email address has not been invited to any RevRecovery client portal. Please contact your account manager.'
          );
          setIsLoading(false);
          return;
        }

        if (
          targetClient &&
          targetClient.contactEmail &&
          targetClient.contactEmail.toLowerCase().trim() === normalizedEmail
        ) {
          matchedUser.clientId = targetClient.id;
        }

        // Multi-identifier organization match for offline fallback
        if (urlClientId && urlClientId.trim() !== '') {
          const normUrlId = urlClientId.trim().toLowerCase();
          const clientRec = targetClient;
          const targetCompany = clientRec ? companies.find((comp) => comp.id === clientRec.companyId) : undefined;
          const targetOrgKey = (matchedUser.clientName || targetCompany?.name || '').toLowerCase().trim();

          const isDirectMatch = matchedUser.clientId.toLowerCase() === normUrlId;
          const isClientMatch =
            targetClient &&
            (targetClient.id.toLowerCase() === normUrlId ||
              (targetClient.companyId && targetClient.companyId.toLowerCase() === normUrlId));
          const isCompMatch =
            targetCompany &&
            (targetCompany.id.toLowerCase() === normUrlId ||
              targetCompany.name.toLowerCase() === normUrlId);
          const targetSlug = targetOrgKey.replace(/[^a-z0-9]/g, '');
          const normUrlSlug = normUrlId.replace(/[^a-z0-9]/g, '');
          const strippedUrlId = normUrlId.replace(/^client-/, '').replace(/^comp-/, '');
          const strippedClientId = targetClient ? targetClient.id.toLowerCase().replace(/^client-/, '') : '';
          const isOrgNameMatch =
            targetOrgKey === normUrlId ||
            (targetSlug.length > 2 && (normUrlSlug.includes(targetSlug) || targetSlug.includes(normUrlSlug))) ||
            (strippedClientId.length > 2 && strippedUrlId === strippedClientId);

          if (!isDirectMatch && !isClientMatch && !isCompMatch && !isOrgNameMatch) {
            setErrorMessage(
              'Security Error: This email invitation is not authorized to access the requested client organization.'
            );
            setIsLoading(false);
            return;
          }
        }

        if (matchedUser.status === 'revoked') {
          setErrorMessage(
            'Access Revoked: Portal access for this account has been revoked by the RevRecovery operations team.'
          );
          setIsLoading(false);
          return;
        }

        if (!targetClient) {
          targetClient = clients.find((c) => c.id === matchedUser.clientId);
        }
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

        authSuccessful = true;
        authenticatedUser = {
          ...matchedUser,
          status: 'active' as const,
          lastLoginAt: Date.now(),
        };
        targetClientId = targetClient.id;

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'revrecovery_portal_session',
            JSON.stringify({
              user: authenticatedUser,
              clientId: targetClient.id,
              client: targetClient,
              timestamp: Date.now(),
            })
          );
        }

        if (targetClient.portalAccessStatus === 'Invitation Pending') {
          await updateClient(targetClient.id, { portalAccessStatus: 'Active' });
        }
      }

      if (authSuccessful && authenticatedUser && targetClientId) {
        setPortalClientId(targetClientId);
        setPortalClientUser(authenticatedUser);
        setIsClientPortalMode(true);
        router.push('/client-portal/dashboard');
      }
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
            <h1 className="text-lg font-bold text-foreground">
              {isResetFlow
                ? 'Set Portal Password'
                : authMode === 'setup'
                ? 'Activate Portal Access'
                : 'Client Portal Sign In'}
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {isResetFlow
                ? 'Create a new secure password for your authorized client portal account.'
                : authMode === 'setup'
                ? `Welcome! Set your password to activate your authorized RevRecovery performance dashboard${invitedOrgName ? ` for ${invitedOrgName}` : ''}.`
                : `Sign in with your email and password to access your authorized RevRecovery dashboard${invitedOrgName ? ` for ${invitedOrgName}` : ''}.`}
            </p>
          </div>

          {/* Form Area */}
          {isResetFlow ? (
            /* Reset Password Form (via email link) */
            <form onSubmit={handleResetSubmit} className="p-6 space-y-4 text-xs">
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
                <label className="block text-muted-foreground font-medium">Account Email</label>
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
              </div>

              <div className="space-y-1.5">
                <label className="block text-muted-foreground font-medium">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              <div className="space-y-1.5">
                <label className="block text-muted-foreground font-medium">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-muted/50 border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
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
                    <span>Saving Password...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Save Password & Enter Portal</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Return to Portal Sign In
                </button>
              </div>
            </form>
          ) : authMode === 'setup' ? (
            /* First-Time Account Setup Form */
            <form onSubmit={handleSetupSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 shrink-0 text-sky-400" />
                <span className="leading-relaxed">
                  First-time access: Choose your password below to activate your account.
                </span>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {infoMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-2.5 text-xs">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-muted-foreground font-medium">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
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

              <div className="space-y-1.5">
                <label className="block text-muted-foreground font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-muted/50 border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
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
                    <span>Setting Password & Entering...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Set Password & Enter Portal</span>
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-border/60 text-center space-y-2 text-[11px] text-muted-foreground">
                <p>
                  Already set up your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-sky-500 hover:text-sky-400 font-medium underline transition-colors"
                  >
                    Sign In
                  </button>
                </p>
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={isSendingReset}
                  className="text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  {isSendingReset ? 'Sending link...' : 'Prefer a setup link sent to your email?'}
                </button>
              </div>
            </form>
          ) : (
            /* Returning User Sign-In Form */
            <form onSubmit={handleLogin} className="p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {isVerifyingEmail && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-2.5 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="leading-relaxed">Verifying your email address with Firebase Authentication...</span>
                </div>
              )}

              {emailVerificationComplete && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">Your email has been verified! You can now log in below.</span>
                </div>
              )}

              {requiresVerification && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-amber-400">
                    <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground text-[11px]">Email Verification Required</p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        A verification link was dispatched to{' '}
                        <span className="font-mono text-foreground font-medium">{email || 'your email'}</span>.
                        Please check your inbox (and spam/junk folder) and click the link to verify your account.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendVerificationLink}
                    disabled={isResendingVerification}
                    className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isResendingVerification ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Verification Link...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Resend Verification Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {canResetPassword && !requiresVerification && (
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-sky-400">
                    <Key className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground text-[11px]">Forgot or need to reset your password?</p>
                      <p className="text-muted-foreground text-[11px]">
                        We can send a secure Firebase password reset link to{' '}
                        <span className="font-mono text-foreground font-medium">{email || 'your email'}</span>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={isSendingReset}
                    className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Password Reset Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {infoMessage && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{infoMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-muted-foreground font-medium">Contact Email</label>
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
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-muted-foreground font-medium">Password</label>
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={isSendingReset}
                    className="text-[10px] text-sky-500 hover:text-sky-400 underline transition-colors"
                  >
                    Forgot password?
                  </button>
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
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authenticate & Enter Portal</span>
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-border/60 text-center space-y-1 text-[11px] text-muted-foreground">
                <p>
                  Need to set up your account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('setup');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-sky-500 hover:text-sky-400 font-medium underline transition-colors"
                  >
                    First-Time Setup
                  </button>
                </p>
              </div>
            </form>
          )}
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
