import { NextRequest, NextResponse } from 'next/server';
import { Client, Company, ClientOperationalMetrics } from '@/types/revrecovery';
import {
  saveClientToCloud,
  getClientFromCloud,
} from '@/lib/firestoreCloudSync';
import {
  checkClientOrganizationAuthorization,
  ensureRegistryInitialized,
  registerClient,
  registerCompany,
} from '@/lib/invitationRegistry';

/**
 * GET /api/client-portal/sync?clientId=...&email=...
 * Retrieves the latest verified client dashboard data from Cloud Firestore.
 * Preserves multi-tenant data isolation.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const email = searchParams.get('email');

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId parameter is required.' },
        { status: 400 }
      );
    }

    const reg = ensureRegistryInitialized();

    // Multi-tenant check: if an email is provided, ensure user is authorized for requested clientId
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const authCheck = checkClientOrganizationAuthorization(normalizedEmail, clientId);
      if (!authCheck.authorized) {
        return NextResponse.json(
          {
            success: false,
            error: authCheck.error || 'Access Denied: Not authorized for this client organization.',
          },
          { status: 403 }
        );
      }
    }

    // 1. Fetch latest client & company record from Cloud Firestore
    let { client, company } = await getClientFromCloud(clientId);

    // 2. Fall back to registry if Cloud Firestore record is not yet created
    if (!client) {
      client = reg.clients.get(clientId) || null;
      if (client && client.companyId) {
        company = reg.companies.get(client.companyId) || null;
      }
    }

    if (!client) {
      return NextResponse.json(
        { success: false, error: `Client account "${clientId}" not found in cloud database.` },
        { status: 404 }
      );
    }

    // 3. Strictly sanitize operational metrics: omit internalNotes
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
      client: {
        id: client.id,
        companyId: client.companyId,
        servicesPurchased: client.servicesPurchased,
        contractStatus: client.contractStatus,
        portalAccessStatus: client.portalAccessStatus,
        portalSettings: client.portalSettings,
        operationalMetrics: sanitizedMetrics,
        updatedAt: client.updatedAt,
      },
      company: company
        ? {
            id: company.id,
            name: company.name,
            website: company.website,
            industry: company.industry,
          }
        : null,
      syncedAt: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error fetching client sync data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/client-portal/sync
 * Admin update persistence endpoint: saves updated client or operational metrics directly to Cloud Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, clientId, client: clientPayload, company: companyPayload, metrics } = body;

    const targetClientId = clientId || clientPayload?.id;
    if (!targetClientId) {
      return NextResponse.json(
        { success: false, error: 'Target clientId is required for cloud synchronization.' },
        { status: 400 }
      );
    }

    const reg = ensureRegistryInitialized();

    // 1. Resolve or assemble client object
    let targetClient: Client | null = clientPayload || reg.clients.get(targetClientId) || null;
    let targetCompany: Company | null = companyPayload || (targetClient?.companyId ? reg.companies.get(targetClient.companyId) || null : null);

    if (action === 'saveOperationalMetrics' && metrics) {
      if (!targetClient) {
        // Fetch existing from cloud
        const cloudData = await getClientFromCloud(targetClientId);
        targetClient = cloudData.client;
        targetCompany = targetCompany || cloudData.company;
      }

      if (targetClient) {
        targetClient = {
          ...targetClient,
          operationalMetrics: {
            ...(targetClient.operationalMetrics || {}),
            ...metrics,
            clientId: targetClientId,
            updatedAt: Date.now(),
          },
          updatedAt: Date.now(),
        };
      }
    }

    if (!targetClient) {
      return NextResponse.json(
        { success: false, error: `Client "${targetClientId}" could not be resolved for cloud persistence.` },
        { status: 404 }
      );
    }

    // 2. Persist directly to shared Cloud Firestore
    const cloudSaved = await saveClientToCloud(targetClient, targetCompany || undefined);

    // 3. Register in local serverless in-memory registry
    registerClient(targetClient, targetCompany || undefined);
    if (targetCompany) {
      registerCompany(targetCompany);
    }

    if (!cloudSaved) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to write updates to Cloud Firestore shared database.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Client data successfully persisted to Cloud Firestore.',
      client: targetClient,
      company: targetCompany,
      syncedAt: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error during cloud synchronization.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
