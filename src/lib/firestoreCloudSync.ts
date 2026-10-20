import { Client, Company, LeadDeal, Meeting, LeadActivity } from '@/types/revrecovery';

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBUd4q19huYhVmL0lKXWIJuLmB0j1TzEGM';
const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'notion-f316c';
const SYSTEM_ADMIN_EMAIL = 'system.admin@notion-f316c.internal';
const SYSTEM_ADMIN_PASS = 'WorknestCloudSync2026!';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Serializes standard JS value into Firestore REST API Value representation
 */
export function valToFirestore(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(valToFirestore) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = valToFirestore(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Deserializes Firestore REST API Value representation back to standard JS value
 */
export function firestoreToVal(field: any): any {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(firestoreToVal);
  if ('mapValue' in field) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      res[k] = firestoreToVal(v);
    }
    return res;
  }
  return null;
}

export function documentFieldsToObj(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields) return {};
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    res[k] = firestoreToVal(v);
  }
  return res;
}

export function objToDocumentFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = valToFirestore(v);
    }
  }
  return fields;
}

/**
 * Gets a valid Firebase Auth ID Token for Cloud Firestore REST requests
 */
export async function getCloudAuthToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: SYSTEM_ADMIN_EMAIL,
          password: SYSTEM_ADMIN_PASS,
          returnSecureToken: true,
        }),
      }
    );

    const data = await res.json();
    if (res.ok && data.idToken) {
      cachedToken = data.idToken;
      // Expires in 3600 seconds; refresh after 3000 seconds
      tokenExpiresAt = Date.now() + 3000 * 1000;
      return cachedToken;
    } else {
      console.warn('Failed to obtain cloud admin auth token:', data);
      return null;
    }
  } catch (err) {
    console.error('Error authenticating system admin for cloud sync:', err);
    return null;
  }
}

/**
 * Saves a document to Cloud Firestore
 */
export async function saveDocToFirestore(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  workspaceId: string = 'ws-main'
): Promise<boolean> {
  const idToken = await getCloudAuthToken();
  if (!idToken) return false;

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/workspaces/${workspaceId}/${collectionName}/${docId}?key=${FIREBASE_API_KEY}`;
  const fields = objToDocumentFields({ ...data, id: docId, updatedAt: Date.now() });

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Firestore write failed on ${collectionName}/${docId} (${res.status}):`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Network error writing to ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Reads a document from Cloud Firestore
 */
export async function getDocFromFirestore(
  collectionName: string,
  docId: string,
  workspaceId: string = 'ws-main'
): Promise<Record<string, any> | null> {
  const idToken = await getCloudAuthToken();
  if (!idToken) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/workspaces/${workspaceId}/${collectionName}/${docId}?key=${FIREBASE_API_KEY}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`Firestore read failed on ${collectionName}/${docId} (${res.status})`);
      return null;
    }

    const data = await res.json();
    return documentFieldsToObj(data.fields);
  } catch (err) {
    console.error(`Network error reading from ${collectionName}/${docId}:`, err);
    return null;
  }
}

/**
 * Saves a client and associated company to Cloud Firestore
 */
export async function saveClientToCloud(
  client: Client,
  company?: Company,
  workspaceId: string = 'ws-main'
): Promise<boolean> {
  if (!client || !client.id) return false;

  const clientSaved = await saveDocToFirestore('clients', client.id, client, workspaceId);

  if (company && company.id) {
    await saveDocToFirestore('companies', company.id, company, workspaceId);
  }

  return clientSaved;
}

/**
 * Fetches a client and associated company from Cloud Firestore
 */
export async function getClientFromCloud(
  clientId: string,
  workspaceId: string = 'ws-main'
): Promise<{ client: Client | null; company: Company | null }> {
  if (!clientId) return { client: null, company: null };

  const rawClient = await getDocFromFirestore('clients', clientId, workspaceId);
  if (!rawClient) return { client: null, company: null };

  const client = rawClient as Client;
  let company: Company | null = null;

  if (client.companyId) {
    const rawCompany = await getDocFromFirestore('companies', client.companyId, workspaceId);
    if (rawCompany) {
      company = rawCompany as Company;
    }
  }

  return { client, company };
}
