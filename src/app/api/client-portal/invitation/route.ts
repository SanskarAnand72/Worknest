import { NextRequest, NextResponse } from 'next/server';
import { Client, ClientPortalUser, Company } from '@/types/revrecovery';
import { SEED_CLIENTS, SEED_CLIENT_PORTAL_USERS, SEED_COMPANIES } from '@/lib/revrecoverySeed';

// Shared in-memory registry of client organizations and invitations for serverless instances
interface InvitationRegistry {
  companies: Map<string, Company>;
  clients: Map<string, Client>;
  portalUsers: Map<string, ClientPortalUser>; // keyed by normalized email
}

const registry: InvitationRegistry = {
  companies: new Map(),
  clients: new Map(),
  portalUsers: new Map(),
};

// Initialize with seed data
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
 * GET /api/client-portal/invitation?email=...&clientId=...
 * Checks if a representative email has an invitation and returns authorized status without exposing private data
 */
export async function GET(req: NextRequest) {
  ensureInitialized();

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.toLowerCase().trim();
  const clientId = searchParams.get('clientId');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  const user = registry.portalUsers.get(email);
  if (!user) {
    return NextResponse.json(
      {
        exists: false,
        error: 'This email address has not been invited to any RevRecovery client portal.',
      },
      { status: 404 }
    );
  }

  // If a clientId was passed, verify organization binding
  if (clientId && user.clientId !== clientId) {
    return NextResponse.json(
      {
        exists: false,
        error: 'Security Error: This email invitation is not authorized to access the requested client organization.',
      },
      { status: 403 }
    );
  }

  const client = registry.clients.get(user.clientId);
  const company = client ? registry.companies.get(client.companyId) : undefined;

  return NextResponse.json({
    exists: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      clientId: user.clientId,
      clientName: user.clientName || company?.name || 'Client',
      role: user.role,
      status: user.status,
    },
    client: client
      ? {
          id: client.id,
          name: company?.name || 'Client Organization',
          portalAccessStatus: client.portalAccessStatus,
          portalSettings: client.portalSettings,
        }
      : null,
  });
}

/**
 * POST /api/client-portal/invitation
 * Registers or updates an invitation or client record from internal team actions
 */
export async function POST(req: NextRequest) {
  ensureInitialized();

  try {
    const body = await req.json();
    const { client, portalUsers, user, company } = body;

    if (company && company.id) {
      registry.companies.set(company.id, company);
    }

    if (client && client.id) {
      registry.clients.set(client.id, client);
    }

    if (user && user.email) {
      registry.portalUsers.set(user.email.toLowerCase().trim(), user);
    }

    if (Array.isArray(portalUsers)) {
      portalUsers.forEach((u: ClientPortalUser) => {
        if (u && u.email) {
          registry.portalUsers.set(u.email.toLowerCase().trim(), u);
        }
      });
    }

    return NextResponse.json({
      success: true,
      registeredCount: registry.portalUsers.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to register invitation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
