'use client';

import { getFirebaseFirestore, getWorkspaceCollectionRef, getWorkspaceDocRef, checkFirebaseStatus } from './firebase';
import { getRevDB, RevRecoveryDB } from './revrecoveryStorage';
import { getDB } from './storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  storeBreakdown: Record<string, { pushed: number; pulled: number }>;
  error?: string;
  timestamp: number;
}

const SYNC_STORES: (keyof RevRecoveryDB)[] = [
  'companies',
  'contacts',
  'leads',
  'clients',
  'projects',
  'tasks',
  'meetings',
  'proposals',
  'contentItems',
  'teamMembers',
  'customModules',
  'customRecords',
  'outreachSources',
  'automationRules',
];

/**
 * Uploads all local IndexedDB records to Firestore (preserves all local data, populates cloud).
 */
export async function pushLocalDataToFirestore(workspaceId: string = 'ws-main'): Promise<SyncResult> {
  const status = await checkFirebaseStatus();
  if (!status.isConnected) {
    return {
      success: false,
      pushedCount: 0,
      pulledCount: 0,
      storeBreakdown: {},
      error: status.error || 'Firestore is not connected or Cloud Firestore API is not yet enabled.',
      timestamp: Date.now(),
    };
  }

  const db = getFirebaseFirestore();
  const localDb = await getRevDB();

  if (!db || !localDb) {
    return {
      success: false,
      pushedCount: 0,
      pulledCount: 0,
      storeBreakdown: {},
      error: 'Database initialization failed.',
      timestamp: Date.now(),
    };
  }

  let totalPushed = 0;
  const breakdown: Record<string, { pushed: number; pulled: number }> = {};

  try {
    for (const store of SYNC_STORES) {
      const records = await localDb.getAll(store as any);
      breakdown[store] = { pushed: 0, pulled: 0 };

      for (const item of records) {
        const id = (item as any)?.id || (item as any)?.period;
        if (id) {
          const docRef = doc(db, 'workspaces', workspaceId, store as string, id);
          await setDoc(docRef, { ...item, workspaceId, syncedAt: Date.now() }, { merge: true });
          breakdown[store].pushed++;
          totalPushed++;
        }
      }
    }

    return {
      success: true,
      pushedCount: totalPushed,
      pulledCount: 0,
      storeBreakdown: breakdown,
      timestamp: Date.now(),
    };
  } catch (err: any) {
    console.error('Error syncing local data to Firestore:', err);
    return {
      success: false,
      pushedCount: totalPushed,
      pulledCount: 0,
      storeBreakdown: breakdown,
      error: err?.message || 'Failed during sync to Firestore.',
      timestamp: Date.now(),
    };
  }
}

/**
 * Downloads cloud Firestore records to local IndexedDB (preserves newer local versions).
 */
export async function pullCloudDataToIndexedDB(workspaceId: string = 'ws-main'): Promise<SyncResult> {
  const status = await checkFirebaseStatus();
  if (!status.isConnected) {
    return {
      success: false,
      pushedCount: 0,
      pulledCount: 0,
      storeBreakdown: {},
      error: status.error || 'Firestore is not connected.',
      timestamp: Date.now(),
    };
  }

  const db = getFirebaseFirestore();
  const localDb = await getRevDB();

  if (!db || !localDb) {
    return {
      success: false,
      pushedCount: 0,
      pulledCount: 0,
      storeBreakdown: {},
      error: 'Database clients unavailable.',
      timestamp: Date.now(),
    };
  }

  let totalPulled = 0;
  const breakdown: Record<string, { pushed: number; pulled: number }> = {};

  try {
    for (const store of SYNC_STORES) {
      breakdown[store] = { pushed: 0, pulled: 0 };
      const colRef = collection(db, 'workspaces', workspaceId, store as string);
      const snapshot = await getDocs(colRef);

      for (const docSnap of snapshot.docs) {
        const cloudData = docSnap.data();
        const id = docSnap.id;
        const localItem = await localDb.get(store as any, id);

        // Keep whichever record has newer updatedAt
        const localUpdated = (localItem as any)?.updatedAt || 0;
        const cloudUpdated = cloudData.updatedAt || cloudData.syncedAt || 0;

        if (!localItem || cloudUpdated >= localUpdated) {
          await localDb.put(store as any, cloudData as any);
          breakdown[store].pulled++;
          totalPulled++;
        }
      }
    }

    return {
      success: true,
      pushedCount: 0,
      pulledCount: totalPulled,
      storeBreakdown: breakdown,
      timestamp: Date.now(),
    };
  } catch (err: any) {
    console.error('Error pulling cloud data from Firestore:', err);
    return {
      success: false,
      pushedCount: 0,
      pulledCount: totalPulled,
      storeBreakdown: breakdown,
      error: err?.message || 'Failed during cloud pull.',
      timestamp: Date.now(),
    };
  }
}
