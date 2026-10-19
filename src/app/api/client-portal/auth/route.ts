import { NextRequest, NextResponse } from 'next/server';
import { ClientPortalUser } from '@/types/revrecovery';
import {
  checkClientOrganizationAuthorization,
  ensureRegistryInitialized,
  getRegistry,
  hashPortalPassword,
  hasRegisteredCredentialHash,
  isEmailMarkedUnverified,
  registerClient,
  registerCredentialHash,
  registerPortalUser,
  verifyCredentialHash,
} from '@/lib/invitationRegistry';

/**
 * Helper to authenticate returning user via Firebase Auth Identity Toolkit REST API
 */
async function authenticateWithFirebase(
  email: string,
  pass: string
): Promise<{
  success: boolean;
  error?: string;
  canResetPassword?: boolean;
  requiresVerification?: boolean;
  canResendVerification?: boolean;
  idToken?: string;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (apiKey) {
    try {
      // Attempt Sign-In
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password: pass, returnSecureToken: true }),
        }
      );

      const signInData = await signInRes.json();
      if (signInRes.ok && signInData.idToken) {
        // Inspect email verification status
        try {
          const lookupRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: signInData.idToken }),
            }
          );
          const lookupData = await lookupRes.json();
          const userObj = lookupData.users?.[0];

          if (userObj && userObj.emailVerified === false) {
            return {
              success: false,
              requiresVerification: true,
              canResendVerification: true,
              idToken: signInData.idToken,
              error:
                'Email verification is required before accessing your portal. A verification link has been sent to your email. Please check your inbox (and spam folder) or click Resend Verification below.',
            };
          }
        } catch (lookupErr) {
          console.warn('accounts:lookup emailVerified check notice:', lookupErr);
        }

        return { success: true, idToken: signInData.idToken };
      }

      const errorMsg = signInData.error?.message || '';

      if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return {
          success: false,
          error: 'Too many unsuccessful attempts. Access temporarily disabled. Please try again later.',
          canResetPassword: true,
        };
      }

      if (errorMsg === 'INVALID_PASSWORD' || errorMsg === 'INVALID_LOGIN_CREDENTIALS') {
        return {
          success: false,
          error: 'Incorrect password for this account.',
          canResetPassword: true,
        };
      }
    } catch (err) {
      console.warn('Firebase Auth REST check fallback notice:', err);
    }
  }

  // Fallback verification against registered credential hash (for offline/test environments)
  if (hasRegisteredCredentialHash(normalizedEmail)) {
    const inputHash = hashPortalPassword(pass);
    const matches = verifyCredentialHash(normalizedEmail, inputHash);
    if (!matches) {
      return {
        success: false,
        error: 'Incorrect password for this account.',
        canResetPassword: true,
      };
    }

    if (isEmailMarkedUnverified(normalizedEmail)) {
      return {
        success: false,
        requiresVerification: true,
        canResendVerification: true,
        error:
          'Email verification is required before accessing your portal. A verification link has been sent to your email. Please check your inbox (and spam folder) or click Resend Verification below.',
      };
    }

    return { success: true };
  }

  if (!apiKey) {
    if (isEmailMarkedUnverified(normalizedEmail)) {
      return {
        success: false,
        requiresVerification: true,
        canResendVerification: true,
        error:
          'Email verification is required before accessing your portal. A verification link has been sent to your email. Please check your inbox (and spam folder) or click Resend Verification below.',
      };
    }
    // If no Firebase API key in environment and no hash registered, allow default
    return { success: true };
  }

  return {
    success: false,
    error: 'Incorrect password for this account.',
    canResetPassword: true,
  };
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

    // Handle First-Time Password Setup for Invited Representatives
    if (action === 'setupPassword') {
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

      // Verify representative authorization for requested organization
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
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

      if (apiKey) {
        // Attempt first-time account creation with user's chosen password
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, password, returnSecureToken: true }),
          }
        );

        const signUpData = await signUpRes.json();

        if (signUpRes.ok && signUpData.idToken) {
          // Account created successfully with client's chosen password
        } else if (signUpData.error?.message === 'EMAIL_EXISTS') {
          // Email was previously registered in Firebase Auth. Check if credentials match:
          const signInRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: normalizedEmail, password, returnSecureToken: true }),
            }
          );

          const signInData = await signInRes.json();
          if (signInRes.ok && signInData.idToken) {
            // Password matches existing credentials
          } else {
            // Existing Firebase account with different password: dispatch secure verification email
            try {
              await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: normalizedEmail }),
                }
              );
            } catch (resetErr) {
              console.warn('Auto password reset dispatch notice:', resetErr);
            }

            return NextResponse.json(
              {
                success: false,
                requiresReset: true,
                error: `An existing account was found for ${normalizedEmail}. For your security, a password setup link has been sent to your email inbox. Please click the link to confirm your password.`,
                email: normalizedEmail,
              },
              { status: 400 }
            );
          }
        } else {
          const errMsg = signUpData.error?.message || 'Failed to initialize portal password.';
          return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
        }
      }

      // User status updated to 'active' upon successful password setup
      const updatedUser: ClientPortalUser = {
        ...invitedUser,
        status: 'active',
        lastLoginAt: Date.now(),
      };
      registerPortalUser(updatedUser);
      registerCredentialHash(normalizedEmail, hashPortalPassword(password));

      if (client.portalAccessStatus === 'Invitation Pending' || client.portalAccessStatus === 'Not Invited') {
        client.portalAccessStatus = 'Active';
        registerClient(client, company);
      }

      return NextResponse.json({
        success: true,
        message: 'Password set successfully. Welcome to your Client Portal!',
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
          operationalMetrics: client.operationalMetrics ? {
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
          } : undefined,
        },
        company: company ? {
          id: company.id,
          name: company.name,
          website: company.website,
          industry: company.industry,
        } : null,
      });
    }

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
      registerCredentialHash(resetEmail, hashPortalPassword(newPassword));

      if (client.portalAccessStatus === 'Invitation Pending' || client.portalAccessStatus === 'Not Invited') {
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
      if (authResult.requiresVerification) {
        return NextResponse.json(
          {
            success: false,
            requiresVerification: true,
            canResendVerification: true,
            error: authResult.error || 'Email verification is required before accessing your portal.',
            email: normalizedEmail,
          },
          { status: 403 }
        );
      }

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

    if (client.portalAccessStatus === 'Invitation Pending' || client.portalAccessStatus === 'Not Invited') {
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
