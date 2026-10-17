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
    isClientPortalMode,
    setIsClientPortalMode,
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
      // If user has not authenticated or no client is selected, redirect to login
      if (!portalClientId && !portalClientUser) {
        router.push('/client-portal/login');
      } else {
        setIsClientPortalMode(true);
      }
    }
  }, [isVerifying, isRevInitialized, portalClientId, portalClientUser, router, setIsClientPortalMode]);

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
