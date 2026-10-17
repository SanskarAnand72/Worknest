import { NextRequest, NextResponse } from 'next/server';
import {
  checkClientOrganizationAuthorization,
  ensureRegistryInitialized,
  registerBatch,
  getRegistry,
} from '@/lib/invitationRegistry';

/**
 * GET /api/client-portal/invitation?email=...&clientId=...
 * Checks if a representative email has an invitation and returns authorized status without exposing private data
 */
export async function GET(req: NextRequest) {
  ensureRegistryInitialized();

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.toLowerCase().trim();
  const clientId = searchParams.get('clientId');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  const authCheck = checkClientOrganizationAuthorization(email, clientId);
  if (!authCheck.authorized || !authCheck.user) {
    return NextResponse.json(
      {
        exists: false,
        error: authCheck.error || 'Access Denied: Not authorized for this client organization.',
        diagnostic: authCheck.diagnostic,
      },
      { status: authCheck.statusCode || 403 }
    );
  }

  const { user, client, company } = authCheck;

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
  ensureRegistryInitialized();

  try {
    const body = await req.json();
    const result = registerBatch(body);

    return NextResponse.json({
      success: true,
      registeredCount: result.registeredUsers,
      totalClients: result.registeredClients,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to register invitation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
