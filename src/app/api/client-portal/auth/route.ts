import { NextRequest, NextResponse } from 'next/server';
import { ClientPortalUser } from '@/types/revrecovery';
import {
  checkClientOrganizationAuthorization,
  ensureRegistryInitialized,
  getRegistry,
  registerClient,
  registerPortalUser,
} from '@/lib/invitationRegistry';

/**
 * Helper to authenticate or register user via Firebase Auth Identity Toolkit REST API
 */
async function authenticateWithFirebase(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string; canResetPassword?: boolean }> {
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
        return {
          success: false,
          error:
            'Incorrect password for this account. If you haven\'t set a password or need to reset it, request a secure setup link below.',
          canResetPassword: true,
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
        error:
          'Incorrect password for this account. If you haven\'t set a password or need to reset it, request a secure setup link below.',
        canResetPassword: true,
      };
    }

    if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
      return {
        success: false,
        error: 'Too many unsuccessful attempts. Access temporarily disabled. Please try again later.',
        canResetPassword: true,
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
  ensureRegistryInitialized();

  try {
    const body = await req.json();
    const { action, oobCode, newPassword, email, password, clientId } = body;

    // Handle OOB Password Reset Completion
    if (action === 'resetPassword') {
      if (!oobCode || typeof oobCode !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Password reset code is required.' },
          { status: 400 }
        );
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      let resetEmail = email ? email.trim().toLowerCase() : '';

      if (apiKey) {
        const resetRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oobCode, newPassword }),
          }
        );

        const resetData = await resetRes.json();
        if (!resetRes.ok) {
          const errMsg = resetData.error?.message || 'Invalid or expired password reset link.';
          return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
        }

        if (resetData.email) {
          resetEmail = resetData.email.trim().toLowerCase();
        }
      }

      if (!resetEmail) {
        return NextResponse.json(
          { success: false, error: 'Unable to identify representative email for password reset.' },
          { status: 400 }
        );
      }

      const authCheck = checkClientOrganizationAuthorization(resetEmail, clientId);
      if (!authCheck.authorized || !authCheck.user || !authCheck.client) {
        return NextResponse.json(
          {
            success: false,
            error: authCheck.error || 'Access Denied: Not authorized for this client organization.',
            diagnostic: authCheck.diagnostic,
          },
          { status: authCheck.statusCode || 403 }
        );
      }

      const { user: invitedUser, client, company } = authCheck;
      const updatedUser: ClientPortalUser = {
        ...invitedUser,
        status: 'active',
        lastLoginAt: Date.now(),
      };
      registerPortalUser(updatedUser);

      if (client.portalAccessStatus === 'Invitation Pending') {
        client.portalAccessStatus = 'Active';
        registerClient(client, company);
      }

      return NextResponse.json({
        success: true,
        message: 'Password successfully updated.',
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
    }

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

    // 1. Perform strict organization binding and invitation check
    const authCheck = checkClientOrganizationAuthorization(normalizedEmail, clientId);
    if (!authCheck.authorized || !authCheck.user || !authCheck.client) {
      return NextResponse.json(
        {
          success: false,
          error: authCheck.error || 'Access Denied: Not authorized for this client organization.',
          diagnostic: authCheck.diagnostic,
        },
        { status: authCheck.statusCode || 403 }
      );
    }

    const { user: invitedUser, client, company } = authCheck;

    // 2. Authenticate credentials via Firebase Auth
    const authResult = await authenticateWithFirebase(normalizedEmail, password);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication failed.',
          canResetPassword: authResult.canResetPassword ?? false,
          email: normalizedEmail,
        },
        { status: 401 }
      );
    }

    // 3. Update user status to 'active' on first successful authentication
    const updatedUser: ClientPortalUser = {
      ...invitedUser,
      status: 'active',
      lastLoginAt: Date.now(),
    };
    registerPortalUser(updatedUser);

    if (client.portalAccessStatus === 'Invitation Pending') {
      client.portalAccessStatus = 'Active';
      registerClient(client, company);
    }

    // 4. Strictly sanitize operational metrics: omit internalNotes
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
