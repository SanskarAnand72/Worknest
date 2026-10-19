'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ClientPortalView } from '@/components/revrecovery/ClientPortalView';
import { Loader2 } from 'lucide-react';

export default function ClientPortalDashboardPage() {
  const router = useRouter();

  const {
    isInitialized: isRevInitialized,
    init: initRevRecovery,
    portalClientId,
    portalClientUser,
    setPortalClientId,
    setPortalClientUser,
    isClientPortalMode,
    setIsClientPortalMode,
    hydrateClientPortalSession,
  } = useRevRecoveryStore();

  const {
    isInitialized: isWorkspaceInitialized,
    init: initWorkspace,
  } = useWorkspaceStore();

  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([initWorkspace(), initRevRecovery()]);
      setIsVerifying(false);
    };
    initialize();
  }, [initWorkspace, initRevRecovery]);

  useEffect(() => {
    if (!isVerifying && isRevInitialized) {
      let restored = false;
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('revrecovery_portal_session');
        if (raw) {
          try {
            const session = JSON.parse(raw);
            if (session.clientId && session.user) {
              if (session.user.status === 'revoked') {
                localStorage.removeItem('revrecovery_portal_session');
                router.push('/client-portal/login');
                return;
              }
              hydrateClientPortalSession(session);
              restored = true;
            }
          } catch (e) {
            console.warn('Failed to parse portal session from storage:', e);
          }
        }
      }

      if (!restored && !portalClientId && !portalClientUser) {
        router.push('/client-portal/login');
      } else if (portalClientUser?.status === 'revoked') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('revrecovery_portal_session');
        }
        setPortalClientUser(null);
        setIsClientPortalMode(false);
        router.push('/client-portal/login');
      }
    }
  }, [isVerifying, isRevInitialized, portalClientId, portalClientUser, router, hydrateClientPortalSession, setIsClientPortalMode, setPortalClientUser]);

  if (isVerifying || !isRevInitialized || !isWorkspaceInitialized) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          <span className="text-xs text-muted-foreground font-mono">
            Loading Client Portal Dashboard...
          </span>
        </div>
      </div>
    );
  }

  if (!portalClientId && !portalClientUser) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background text-xs text-muted-foreground font-mono">
        Redirecting to client login...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <ClientPortalView />
    </div>
  );
}
