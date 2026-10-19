import { NextRequest, NextResponse } from 'next/server';
import {
  ensureRegistryInitialized,
  hashPortalPassword,
  markEmailVerified,
  registerClient,
  registerCompany,
  registerCredentialHash,
  registerPortalUser,
} from '@/lib/invitationRegistry';
import { ClientPortalUser } from '@/types/revrecovery';

/**
 * POST /api/client-portal/create-access
 * Creates or updates Client Portal authentication credentials and links them to a specific client record.
 *
 * Workflow:
 * 1. Admin enters client's email address and sets password directly.
 * 2. Validates email & password (min 6 characters).
 * 3. Enforces multi-tenant uniqueness (email cannot belong to another client organization).
 * 4. Provisions or updates the account in Firebase Authentication.
 * 5. Securely activates portal access without storing plaintext passwords in the database.
 * 6. Returns the direct portal URL for the admin to copy and send to the client.
 */
export async function POST(req: NextRequest) {
  const reg = ensureRegistryInitialized();

  try {
    const body = await req.json();
    const {
      clientId,
      email,
      password,
      name,
      role,
      currentPassword,
      client: clientPayload,
      company: companyPayload,
    } = body;

    // 1. Validation
    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Target client ID is required.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid client business email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Resolve Client & Company (register payload if passed from client store)
    if (clientPayload && clientPayload.id) {
      registerClient(clientPayload, companyPayload);
    }
    if (companyPayload && companyPayload.id) {
      registerCompany(companyPayload);
    }

    let targetClient = reg.clients.get(clientId);
    if (!targetClient && clientPayload) {
      targetClient = clientPayload;
      reg.clients.set(clientPayload.id, clientPayload);
    }
    if (!targetClient) {
      targetClient = Array.from(reg.clients.values()).find(
        (c) =>
          c.id.toLowerCase() === clientId.toLowerCase() ||
          (c.contactEmail && c.contactEmail.toLowerCase().trim() === normalizedEmail)
      );
    }

    if (!targetClient) {
      return NextResponse.json(
        { success: false, error: `Client account "${clientId}" could not be found.` },
        { status: 404 }
      );
    }

    let company =
      (companyPayload && companyPayload.id ? companyPayload : null) ||
      reg.companies.get(targetClient.companyId);
    if (!company) {
      company = Array.from(reg.companies.values()).find(
        (c) => c.id.toLowerCase() === targetClient!.companyId?.toLowerCase()
      );
    }

    const clientName = company?.name || 'Client';

    // 3. Multi-Tenant Conflict Check: Verify email is not linked to ANOTHER client organization
    const existingUser = reg.portalUsers.get(normalizedEmail);
    const isSeedUser = existingUser && existingUser.id === 'cpu-syscraft-aryan';
    const isSameEmailRebind =
      targetClient.contactEmail && targetClient.contactEmail.toLowerCase().trim() === normalizedEmail;

    if (existingUser && existingUser.clientId !== targetClient.id && !isSeedUser && !isSameEmailRebind) {
      const otherClient = reg.clients.get(existingUser.clientId);
      const otherCompany = otherClient ? reg.companies.get(otherClient.companyId) : undefined;
      const otherName = existingUser.clientName || otherCompany?.name || existingUser.clientId;

      return NextResponse.json(
        {
          success: false,
          error: `Cross-Tenant Security: Email "${normalizedEmail}" is already linked to client "${otherName}". Each client must use a unique email address.`,
        },
        { status: 400 }
      );
    }

    // 4. Firebase Authentication Account Provisioning / Password Update
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    let authMethodNote = 'Account credentials configured successfully.';
    let verificationLinkSent = false;

    if (apiKey) {
      // Step A: Attempt accounts:signUp to create user with chosen password
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            displayName: targetClient.id,
            returnSecureToken: true,
          }),
        }
      );

      const signUpData = await signUpRes.json();

      if (signUpRes.ok && signUpData.idToken) {
        authMethodNote = 'New Firebase Authentication account created with your specified password.';
      } else if (signUpData.error?.message === 'EMAIL_EXISTS') {
        // Account already exists in Firebase Auth.
        // Step B: Test if the provided password matches
        const testSignInRes = await fetch(
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

        const testSignInData = await testSignInRes.json();

        if (testSignInRes.ok && testSignInData.idToken) {
          authMethodNote = 'Existing Firebase account verified with matching password.';

          // Update displayName to bind user to this client record
          try {
            await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: testSignInData.idToken,
                displayName: targetClient.id,
                returnSecureToken: true,
              }),
            });
          } catch (updateErr) {
            console.warn('accounts:update displayName notice:', updateErr);
          }
        } else {
          // Password doesn't match existing password.
          // Step C: If currentPassword provided, update via accounts:update
          let passwordUpdated = false;

          if (currentPassword && typeof currentPassword === 'string') {
            const currentSignInRes = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: normalizedEmail,
                  password: currentPassword,
                  returnSecureToken: true,
                }),
              }
            );

            const currentSignInData = await currentSignInRes.json();
            if (currentSignInRes.ok && currentSignInData.idToken) {
              const updateRes = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    idToken: currentSignInData.idToken,
                    password,
                    displayName: targetClient.id,
                    returnSecureToken: true,
                  }),
                }
              );

              if (updateRes.ok) {
                passwordUpdated = true;
                authMethodNote = 'Client password successfully updated in Firebase Authentication.';
              }
            }
          }

          if (!passwordUpdated) {
            // Dispatch a password reset link so the account can be aligned if necessary
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
              console.warn('sendOobCode fallback:', resetErr);
            }

            authMethodNote = `Existing Firebase Auth account detected. Access has been authorized for ${clientName}. If the client cannot log in with this password, a password setup link has also been sent to ${normalizedEmail}.`;
          }
        }
      } else {
        const errorMsg = signUpData.error?.message || 'Failed to configure Firebase credentials.';
        return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
      }
    }

    // 5. Securely link representative to client record in registry
    const portalUser: ClientPortalUser = {
      id: existingUser?.id || `cpu-${targetClient.id}-${Date.now().toString(36)}`,
      clientId: targetClient.id,
      clientName: clientName,
      name: name?.trim() || clientName,
      email: normalizedEmail,
      role: role === 'client_guest' ? 'client_guest' : 'client_admin',
      status: 'active',
      invitedBy: existingUser?.invitedBy || 'admin',
      invitedAt: existingUser?.invitedAt || Date.now(),
      lastLoginAt: existingUser?.lastLoginAt,
      createdAt: existingUser?.createdAt || Date.now(),
    };

    registerPortalUser(portalUser);
    registerCredentialHash(normalizedEmail, hashPortalPassword(password));
    markEmailVerified(normalizedEmail);

    // Update target client status
    targetClient.portalAccessStatus = 'Active';
    targetClient.contactEmail = normalizedEmail;
    if (!targetClient.portalUserIds) {
      targetClient.portalUserIds = [];
    }
    if (!targetClient.portalUserIds.includes(portalUser.id)) {
      targetClient.portalUserIds.push(portalUser.id);
    }
    registerClient(targetClient, company);

    // 6. Generate Portal URL
    const origin = req.nextUrl?.origin || 'https://worknest-seven-rosy.vercel.app';
    const portalUrl = `${origin}/client-portal/login?email=${encodeURIComponent(normalizedEmail)}&clientId=${encodeURIComponent(targetClient.id)}`;

    return NextResponse.json({
      success: true,
      message: `Client Portal access active for ${normalizedEmail}.`,
      note: authMethodNote,
      user: {
        id: portalUser.id,
        email: portalUser.email,
        name: portalUser.name,
        role: portalUser.role,
        status: portalUser.status,
        clientId: portalUser.clientId,
        clientName: portalUser.clientName,
      },
      client: {
        id: targetClient.id,
        companyId: targetClient.companyId,
        portalAccessStatus: targetClient.portalAccessStatus,
        contactEmail: targetClient.contactEmail,
      },
      portalUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error creating portal access.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
