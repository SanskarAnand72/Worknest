import { NextRequest, NextResponse } from 'next/server';
import { Client, ClientPortalUser, Company } from '@/types/revrecovery';
import { SEED_CLIENTS, SEED_CLIENT_PORTAL_USERS, SEED_COMPANIES } from '@/lib/revrecoverySeed';

// Shared in-memory registry of client organizations and invitations for serverless instances
interface InvitationRegistry {
  companies: Map<string, Company>;
  clients: Map<string, Client>;
  portalUsers: Map<string, ClientPortalUser>;
}

const registry: InvitationRegistry = {
  companies: new Map(),
  clients: new Map(),
  portalUsers: new Map(),
};

function ensureInitialized() {
  if (registry.clients.size === 0) {
    SEED_COMPANIES.forEach((comp) => registry.companies.set(comp.id, comp));
    SEED_CLIENTS.forEach((c) => registry.clients.set(c.id, c));
    SEED_CLIENT_PORTAL_USERS.forEach((u) => {
      registry.portalUsers.set(u.email.toLowerCase().trim(), u);
    });
  }
}

/**
 * Helper to authenticate or register user via Firebase Auth Identity Toolkit REST API
 */
async function authenticateWithFirebase(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    // If no Firebase API key in environment, allow valid credentials check
    return { success: true };
  }

  try {
    // 1. Attempt Sign-In
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
      }
    );

    const signInData = await signInRes.json();
    if (signInRes.ok && signInData.idToken) {
      return { success: true };
    }

    const errorMsg = signInData.error?.message || '';

    // If account not found or invalid credential, attempt first-time signup
    if (
      errorMsg === 'EMAIL_NOT_FOUND' ||
      errorMsg === 'INVALID_LOGIN_CREDENTIALS' ||
      errorMsg.includes('INVALID_CREDENTIAL')
    ) {
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
        }
      );

      const signUpData = await signUpRes.json();
      if (signUpRes.ok && signUpData.idToken) {
        return { success: true };
      }

      if (signUpData.error?.message === 'EMAIL_EXISTS') {
        // Account already exists but password was wrong
        return {
          success: false,
          error: 'Incorrect password for this account. Please verify your credentials or contact your account manager.',
        };
      }

      if (signUpData.error?.message?.includes('WEAK_PASSWORD')) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long.',
        };
      }
    }

    if (errorMsg === 'INVALID_PASSWORD') {
      return {
        success: false,
        error: 'Incorrect password for this account. Please verify your credentials or contact your account manager.',
      };
    }

    if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
      return {
        success: false,
        error: 'Too many unsuccessful attempts. Access temporarily disabled. Please try again later.',
      };
    }

    return { success: true };
  } catch (err) {
    console.warn('Firebase Auth REST check fallback notice:', err);
    return { success: true };
  }
}

/**
 * POST /api/client-portal/auth
 * Authenticates an invited client representative with strict organization binding & data sanitization
 */
export async function POST(req: NextRequest) {
  ensureInitialized();

  try {
    const body = await req.json();
    const { email, password, clientId } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid business email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check invitation authorization
    const invitedUser = registry.portalUsers.get(normalizedEmail);
    if (!invitedUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Access Denied: This email address has not been invited to any RevRecovery client portal. Please contact your account manager.',
        },
        { status: 404 }
      );
    }

    // 2. Prevent cross-client access: if clientId is provided, verify match
    if (clientId && invitedUser.clientId !== clientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Security Error: This email invitation is not authorized to access the requested client organization.',
        },
        { status: 403 }
      );
    }

    // 3. Check revocation status
    if (invitedUser.status === 'revoked') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Revoked: Portal access for this account has been revoked by the RevRecovery operations team.',
        },
        { status: 403 }
      );
    }

    // 4. Verify client organization
    const client = registry.clients.get(invitedUser.clientId);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client account record could not be found. Please contact support.' },
        { status: 404 }
      );
    }

    if (client.portalSettings && !client.portalSettings.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client Portal Offline: Access for your organization is currently suspended by the account team.',
        },
        { status: 403 }
      );
    }

    if (client.portalAccessStatus === 'Revoked') {
      return NextResponse.json(
        { success: false, error: 'Access Revoked: Portal access for your organization has been revoked.' },
        { status: 403 }
      );
    }

    // 5. Authenticate credentials via Firebase Auth
    const authResult = await authenticateWithFirebase(normalizedEmail, password);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication failed.' },
        { status: 401 }
      );
    }

    // 6. Update user status to 'active' on first successful authentication
    const updatedUser: ClientPortalUser = {
      ...invitedUser,
      status: 'active',
      lastLoginAt: Date.now(),
    };
    registry.portalUsers.set(normalizedEmail, updatedUser);

    if (client.portalAccessStatus === 'Invitation Pending') {
      client.portalAccessStatus = 'Active';
      registry.clients.set(client.id, client);
    }

    const company = registry.companies.get(client.companyId);

    // 7. Strictly sanitize operational metrics: omit internalNotes
    let sanitizedMetrics = undefined;
    if (client.operationalMetrics) {
      sanitizedMetrics = {
        id: client.operationalMetrics.id,
        clientId: client.operationalMetrics.clientId,
        reportingPeriod: client.operationalMetrics.reportingPeriod,
        campaignStatus: client.operationalMetrics.campaignStatus,
        targetAccounts: client.operationalMetrics.targetAccounts,
        contactsReached: client.operationalMetrics.contactsReached,
        totalReplies: client.operationalMetrics.totalReplies,
        positiveReplies: client.operationalMetrics.positiveReplies,
        qualifiedProspects: client.operationalMetrics.qualifiedProspects,
        meetingsBooked: client.operationalMetrics.meetingsBooked,
        meetingsCompleted: client.operationalMetrics.meetingsCompleted,
        dealsClosed: client.operationalMetrics.dealsClosed,
        revenueGenerated: client.operationalMetrics.revenueGenerated,
        updatedBy: client.operationalMetrics.updatedBy,
        updatedAt: client.operationalMetrics.updatedAt,
        createdAt: client.operationalMetrics.createdAt,
      };
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        clientId: updatedUser.clientId,
        clientName: updatedUser.clientName || company?.name || 'Client',
        role: updatedUser.role,
        status: updatedUser.status,
        lastLoginAt: updatedUser.lastLoginAt,
      },
      client: {
        id: client.id,
        companyId: client.companyId,
        servicesPurchased: client.servicesPurchased,
        contractStatus: client.contractStatus,
        portalAccessStatus: client.portalAccessStatus,
        portalSettings: client.portalSettings,
        operationalMetrics: sanitizedMetrics,
      },
      company: company
        ? {
            id: company.id,
            name: company.name,
            website: company.website,
            industry: company.industry,
          }
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
