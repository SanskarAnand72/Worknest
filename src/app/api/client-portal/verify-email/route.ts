import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/client-portal/verify-email
 * Verifies email confirmation codes (oobCode) or dispatches new verification links.
 *
 * Supported Actions:
 * 1. 'confirm': Validates oobCode via Firebase Auth accounts:update
 * 2. 'resend': Dispatches new verification link via accounts:sendOobCode
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'confirm', oobCode, email, password, idToken } = body;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    // Action 1: Confirm Email Verification Code
    if (action === 'confirm') {
      if (!oobCode || typeof oobCode !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Verification code (oobCode) is required.' },
          { status: 400 }
        );
      }

      if (!apiKey) {
        // Offline / mock testing mode
        if (oobCode.includes('invalid') || oobCode.includes('expired')) {
          return NextResponse.json(
            {
              success: false,
              error: 'The email verification link is invalid or has expired. Please request a new verification email.',
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          email: email || 'client@example.com',
          message: 'Email verified successfully! You may now sign in to your Client Portal.',
        });
      }

      // Live Firebase Auth accounts:update call
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobCode }),
        }
      );

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        const rawErr = verifyData.error?.message || '';
        let errorMsg = 'Failed to verify email address.';

        if (rawErr === 'INVALID_OOB_CODE') {
          errorMsg = 'This verification link is invalid. It may have already been used.';
        } else if (rawErr === 'EXPIRED_OOB_CODE') {
          errorMsg = 'This verification link has expired. Please request a new verification email.';
        } else if (rawErr === 'USER_DISABLED') {
          errorMsg = 'This account has been disabled. Please contact support.';
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMsg,
            code: rawErr,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        email: verifyData.email,
        emailVerified: true,
        message: 'Email verified successfully! You may now sign in to your Client Portal.',
      });
    }

    // Action 2: Resend Verification Email
    if (action === 'resend') {
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid business email address.' },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!apiKey) {
        return NextResponse.json({
          success: true,
          message: `Verification link sent to ${normalizedEmail} (offline test mode).`,
        });
      }

      let activeIdToken = idToken;

      // If idToken not provided but password is provided, sign in to acquire idToken
      if (!activeIdToken && password && typeof password === 'string') {
        const signInRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: normalizedEmail,
              password,
              returnSecureToken: true,
            }),
          }
        );

        const signInData = await signInRes.json();
        if (signInRes.ok && signInData.idToken) {
          activeIdToken = signInData.idToken;
        }
      }

      // If we have an idToken, send VERIFY_EMAIL
      if (activeIdToken) {
        const sendRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestType: 'VERIFY_EMAIL',
              idToken: activeIdToken,
              continueUrl: 'https://notion-f316c.firebaseapp.com',
            }),
          }
        );

        const sendData = await sendRes.json();
        if (!sendRes.ok) {
          return NextResponse.json(
            {
              success: false,
              error: sendData.error?.message || 'Failed to dispatch verification email.',
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Verification email dispatched to ${normalizedEmail}! Please check your inbox and spam folder.`,
        });
      }

      // Fallback: Dispatch PASSWORD_RESET link to client email inbox
      // (Setting password via this link also validates email ownership)
      const pwResetRes = await fetch(
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

      const pwResetData = await pwResetRes.json();
      if (!pwResetRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: pwResetData.error?.message || 'Failed to send account setup link.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Account setup & verification link sent to ${normalizedEmail}. Please check your inbox and spam folder.`,
      });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error in verify-email.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/client-portal/verify-email?oobCode=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const oobCode = searchParams.get('oobCode');

  if (!oobCode) {
    return NextResponse.json({ success: false, error: 'oobCode parameter is required.' }, { status: 400 });
  }

  // Reuse POST confirm logic
  const mockReq = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'confirm', oobCode }),
  });

  return POST(mockReq);
}
