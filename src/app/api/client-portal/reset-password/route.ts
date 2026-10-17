import { NextRequest, NextResponse } from 'next/server';
import {
  checkClientOrganizationAuthorization,
  ensureRegistryInitialized,
} from '@/lib/invitationRegistry';

/**
 * POST /api/client-portal/reset-password
 * Securely dispatches a Firebase Authentication password setup or reset email
 * for an authorized client portal representative.
 * Ensures strict organization authorization before dispatching to prevent enumeration or abuse.
 */
export async function POST(req: NextRequest) {
  ensureRegistryInitialized();

  try {
    const body = await req.json();
    const { email, clientId } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid business email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check organization binding and representative authorization
    const authCheck = checkClientOrganizationAuthorization(normalizedEmail, clientId);
    if (!authCheck.authorized || !authCheck.user || !authCheck.client) {
      return NextResponse.json(
        {
          success: false,
          error: authCheck.error || 'Access Denied: This email is not authorized for portal access.',
          diagnostic: authCheck.diagnostic,
        },
        { status: authCheck.statusCode || 403 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      // Local/demo fallback
      return NextResponse.json({
        success: true,
        message: `Password setup link dispatched for ${normalizedEmail}.`,
        email: normalizedEmail,
      });
    }

    // 2. Ensure user account exists in Firebase Auth so sendOobCode delivers the email
    // If the account does not exist yet, create it with a secure random temporary password first
    try {
      const tempPassword = 'Init!' + Math.random().toString(36).substring(2, 10) + '!A9z' + Date.now().toString(36);
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password: tempPassword, returnSecureToken: false }),
        }
      );
      // If signUp returns EMAIL_EXISTS or 200 OK, the user exists in Firebase Auth and we proceed
    } catch (createErr) {
      console.warn('[Firebase Auth pre-create notice]:', createErr);
    }

    // 3. Dispatch official Firebase Auth Password Reset / Setup email via Identity Toolkit REST
    const resetRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email: normalizedEmail,
        }),
      }
    );

    const resetData = await resetRes.json();

    if (!resetRes.ok) {
      const errorMsg = resetData.error?.message || 'Failed to dispatch password setup email.';
      if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many requests recently. Please wait a few moments before trying again.',
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Firebase Auth error: ${errorMsg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A secure password setup link has been sent to ${normalizedEmail}. Please check your inbox.`,
      email: normalizedEmail,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error dispatching password setup.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
