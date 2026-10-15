'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export interface FirebaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  projectId: string | null;
  authDomain: string | null;
  activeMode: 'firestore' | 'indexeddb';
  error: string | null;
}

const STORAGE_KEY = 'revrecovery_firebase_config';

/**
 * Loads Firebase configuration from localStorage or NEXT_PUBLIC environment variables.
 */
export function loadFirebaseConfig(): FirebaseConfig | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse saved Firebase config from localStorage', e);
      }
    }
  }

  // Fallback to Next.js environment variables if defined
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (apiKey && projectId && appId) {
    return {
      apiKey,
      authDomain: authDomain || '',
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };
  }

  return null;
}

/**
 * Saves Firebase configuration into browser storage.
 */
export function saveFirebaseConfig(config: FirebaseConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

/**
 * Clears stored Firebase configuration.
 */
export function clearFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = loadFirebaseConfig();
  if (!config) return null;

  try {
    const existing = getApps().find((a) => a.name === '[DEFAULT]' || a.name === 'RevRecoveryOS');
    if (existing) {
      appInstance = existing;
    } else {
      appInstance = initializeApp(config);
    }
    return appInstance;
  } catch (err) {
    console.warn('Firebase initialization error:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!authInstance) {
    try {
      authInstance = getAuth(app);
    } catch (e) {
      console.warn('Failed to get Firebase Auth:', e);
    }
  }
  return authInstance;
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firestoreInstance) {
    try {
      firestoreInstance = getFirestore(app);
    } catch (e) {
      console.warn('Failed to get Firebase Firestore:', e);
    }
  }
  return firestoreInstance;
}

/**
 * Returns the honest Firebase connectivity status without fabricating connection.
 */
export async function checkFirebaseStatus(): Promise<FirebaseStatus> {
  const config = loadFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return {
      isConfigured: false,
      isConnected: false,
      projectId: null,
      authDomain: null,
      activeMode: 'indexeddb',
      error: 'Firebase is not configured. Local IndexedDB is active.',
    };
  }

  const app = getFirebaseApp();
  if (!app) {
    return {
      isConfigured: true,
      isConnected: false,
      projectId: config.projectId,
      authDomain: config.authDomain || null,
      activeMode: 'indexeddb',
      error: 'Could not initialize Firebase App with configured credentials.',
    };
  }

  const db = getFirebaseFirestore();
  if (!db) {
    return {
      isConfigured: true,
      isConnected: false,
      projectId: config.projectId,
      authDomain: config.authDomain || null,
      activeMode: 'indexeddb',
      error: 'Could not initialize Firebase Firestore client with current credentials.',
    };
  }

  try {
    // Attempt a lightweight probe against system ping document with a timeout
    const probeRef = doc(db, 'system', 'ping');
    await Promise.race([
      getDoc(probeRef),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Firestore connection probe timed out (client offline or Cloud Firestore API not yet enabled in Firebase Console).'
              )
            ),
          4000
        )
      ),
    ]);

    return {
      isConfigured: true,
      isConnected: true,
      projectId: config.projectId,
      authDomain: config.authDomain || null,
      activeMode: 'firestore',
      error: null,
    };
  } catch (err: any) {
    let friendlyError = err?.message || 'Connection test failed.';
    if (
      friendlyError.includes('Cloud Firestore API has not been used') ||
      friendlyError.includes('PERMISSION_DENIED: Cloud Firestore API')
    ) {
      friendlyError = `Cloud Firestore API is not yet enabled for project "${config.projectId}". In Firebase Console, navigate to "Firestore Database" and click "Create database".`;
    } else if (
      friendlyError.includes('timed out') ||
      friendlyError.includes('Failed to get document because the client is offline')
    ) {
      friendlyError = `Cloud Firestore is unreachable or not yet created for project "${config.projectId}". Check that Cloud Firestore is created in Firebase Console.`;
    }

    return {
      isConfigured: true,
      isConnected: false,
      projectId: config.projectId,
      authDomain: config.authDomain || null,
      activeMode: 'indexeddb',
      error: friendlyError,
    };
  }
}

/**
 * Workspace Data Isolation Helper
 * Path: workspaces/{workspaceId}/{collectionName}/{docId}
 */
export function getWorkspaceCollectionRef(workspaceId: string, collectionName: string) {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not available');
  return collection(db, 'workspaces', workspaceId, collectionName);
}

export function getWorkspaceDocRef(workspaceId: string, collectionName: string, docId: string) {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not available');
  return doc(db, 'workspaces', workspaceId, collectionName, docId);
}

/**
 * Save an entity with workspace isolation
 */
export async function saveWorkspaceEntity<T extends { id: string }>(
  workspaceId: string,
  collectionName: string,
  entity: T
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return; // Fallback to local DB silently
  try {
    const docRef = getWorkspaceDocRef(workspaceId, collectionName, entity.id);
    await setDoc(docRef, { ...entity, workspaceId, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn(`Firestore save error on ${collectionName}/${entity.id}:`, err);
  }
}

/**
 * Delete an entity with workspace isolation
 */
export async function deleteWorkspaceEntity(
  workspaceId: string,
  collectionName: string,
  docId: string
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return;
  try {
    const docRef = getWorkspaceDocRef(workspaceId, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Firestore delete error on ${collectionName}/${docId}:`, err);
  }
}
