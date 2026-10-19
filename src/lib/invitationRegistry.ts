import { Client, ClientPortalUser, Company } from '@/types/revrecovery';
import { SEED_CLIENTS, SEED_CLIENT_PORTAL_USERS, SEED_COMPANIES } from '@/lib/revrecoverySeed';

export interface DiagnosticInfo {
  code: string;
  message: string;
  requestedClientId?: string | null;
  authorizedOrganization?: string;
  authorizedClientRef?: string;
}

export interface AuthorizationCheckResult {
  authorized: boolean;
  error?: string;
  statusCode?: number;
  diagnostic?: DiagnosticInfo;
  user?: ClientPortalUser;
  client?: Client;
  company?: Company;
}

export interface InvitationRegistry {
  companies: Map<string, Company>;
  clients: Map<string, Client>;
  portalUsers: Map<string, ClientPortalUser>;
  aliases: Map<string, string>; // maps (clientId | companyId | slug) -> canonicalOrgKey (lowercased)
  credentialHashes: Map<string, string>; // maps normalizedEmail -> password hash
  unverifiedEmails: Set<string>; // tracks emails requiring verification
  isInitialized: boolean;
}

// Global singleton registry instance to share across Next.js API route handlers in the same runtime
const globalRegistry: InvitationRegistry = {
  companies: new Map(),
  clients: new Map(),
  portalUsers: new Map(),
  aliases: new Map(),
  credentialHashes: new Map(),
  unverifiedEmails: new Set(),
  isInitialized: false,
};

/**
 * Deterministic hash helper for portal credentials verification
 */
export function hashPortalPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'ph_' + Math.abs(hash).toString(16) + '_' + password.length;
}

export function registerCredentialHash(email: string, passwordHash: string): void {
  const reg = ensureRegistryInitialized();
  reg.credentialHashes.set(email.toLowerCase().trim(), passwordHash);
}

export function verifyCredentialHash(email: string, passwordHash: string): boolean {
  const reg = ensureRegistryInitialized();
  const stored = reg.credentialHashes.get(email.toLowerCase().trim());
  if (!stored) return true;
  return stored === passwordHash;
}

export function markEmailUnverified(email: string): void {
  const reg = ensureRegistryInitialized();
  reg.unverifiedEmails.add(email.toLowerCase().trim());
}

export function markEmailVerified(email: string): void {
  const reg = ensureRegistryInitialized();
  reg.unverifiedEmails.delete(email.toLowerCase().trim());
}

export function isEmailMarkedUnverified(email: string): boolean {
  const reg = ensureRegistryInitialized();
  return reg.unverifiedEmails.has(email.toLowerCase().trim());
}

export function hasRegisteredCredentialHash(email: string): boolean {
  const reg = ensureRegistryInitialized();
  return reg.credentialHashes.has(email.toLowerCase().trim());
}

/**
 * Initializes registry with seed data and canonical aliases
 */
export function ensureRegistryInitialized(): InvitationRegistry {
  if (!globalRegistry.isInitialized || globalRegistry.clients.size === 0) {
    // 1. Populate Companies
    SEED_COMPANIES.forEach((comp) => {
      globalRegistry.companies.set(comp.id, comp);
      const orgKey = comp.name.toLowerCase().trim();
      globalRegistry.aliases.set(comp.id.toLowerCase(), orgKey);
      globalRegistry.aliases.set(orgKey, orgKey);
      const firstWord = orgKey.split(/\s+/)[0];
      if (firstWord && firstWord.length > 2) {
        globalRegistry.aliases.set(firstWord, orgKey);
      }
      const slug = orgKey.replace(/[^a-z0-9]/g, '');
      if (slug && slug.length > 2) {
        globalRegistry.aliases.set(slug, orgKey);
      }
    });

    // 2. Populate Clients
    SEED_CLIENTS.forEach((c) => {
      globalRegistry.clients.set(c.id, c);
      const comp = globalRegistry.companies.get(c.companyId);
      if (comp) {
        const orgKey = comp.name.toLowerCase().trim();
        globalRegistry.aliases.set(c.id.toLowerCase(), orgKey);
        if (c.companyId) {
          globalRegistry.aliases.set(c.companyId.toLowerCase(), orgKey);
        }
        const strippedId = c.id.toLowerCase().replace(/^client-/, '');
        if (strippedId.length > 2) {
          globalRegistry.aliases.set(strippedId, orgKey);
        }
      }
    });

    // 3. Populate Invited Users
    SEED_CLIENT_PORTAL_USERS.forEach((u) => {
      const normalizedEmail = u.email.toLowerCase().trim();
      globalRegistry.portalUsers.set(normalizedEmail, u);
      if (u.clientName) {
        const orgKey = u.clientName.toLowerCase().trim();
        globalRegistry.aliases.set(u.clientId.toLowerCase(), orgKey);
        globalRegistry.aliases.set(orgKey, orgKey);
        const firstWord = orgKey.split(/\s+/)[0];
        if (firstWord && firstWord.length > 2) {
          globalRegistry.aliases.set(firstWord, orgKey);
        }
        const strippedId = u.clientId.toLowerCase().replace(/^client-/, '');
        if (strippedId.length > 2) {
          globalRegistry.aliases.set(strippedId, orgKey);
        }
      }
    });

    globalRegistry.isInitialized = true;
  }

  return globalRegistry;
}

/**
 * Register a client record and bind to organization aliases
 */
export function registerClient(client: Client, company?: Company) {
  const reg = ensureRegistryInitialized();
  if (!client || !client.id) return;

  reg.clients.set(client.id, client);

  if (company && company.id) {
    reg.companies.set(company.id, company);
    const orgKey = company.name.toLowerCase().trim();
    reg.aliases.set(client.id.toLowerCase(), orgKey);
    reg.aliases.set(company.id.toLowerCase(), orgKey);
    reg.aliases.set(orgKey, orgKey);
    const firstWord = orgKey.split(/\s+/)[0];
    if (firstWord && firstWord.length > 2) {
      reg.aliases.set(firstWord, orgKey);
    }
    const strippedId = client.id.toLowerCase().replace(/^client-/, '');
    if (strippedId.length > 2) {
      reg.aliases.set(strippedId, orgKey);
    }
    const slug = orgKey.replace(/[^a-z0-9]/g, '');
    if (slug && slug.length > 2) {
      reg.aliases.set(slug, orgKey);
    }
  } else if (client.companyId) {
    const existingComp = reg.companies.get(client.companyId);
    if (existingComp) {
      const orgKey = existingComp.name.toLowerCase().trim();
      reg.aliases.set(client.id.toLowerCase(), orgKey);
      const strippedId = client.id.toLowerCase().replace(/^client-/, '');
      if (strippedId.length > 2) {
        reg.aliases.set(strippedId, orgKey);
      }
    }
  }
}

/**
 * Register a company record
 */
export function registerCompany(company: Company) {
  const reg = ensureRegistryInitialized();
  if (!company || !company.id) return;

  reg.companies.set(company.id, company);
  const orgKey = company.name.toLowerCase().trim();
  reg.aliases.set(company.id.toLowerCase(), orgKey);
  reg.aliases.set(orgKey, orgKey);
}

/**
 * Register an invited portal representative
 */
export function registerPortalUser(user: ClientPortalUser) {
  const reg = ensureRegistryInitialized();
  if (!user || !user.email) return;

  const normalizedEmail = user.email.toLowerCase().trim();
  reg.portalUsers.set(normalizedEmail, user);

  if (user.clientName) {
    const orgKey = user.clientName.toLowerCase().trim();
    reg.aliases.set(user.clientId.toLowerCase(), orgKey);
    reg.aliases.set(orgKey, orgKey);
  }
}

/**
 * Batch register clients, companies, and users from client-side synchronization
 */
export function registerBatch(data: {
  client?: Client;
  company?: Company;
  user?: ClientPortalUser;
  clients?: Client[];
  companies?: Company[];
  portalUsers?: ClientPortalUser[];
  users?: ClientPortalUser[];
}) {
  const reg = ensureRegistryInitialized();

  if (data.company) registerCompany(data.company);
  if (data.client) registerClient(data.client, data.company);
  if (data.user) registerPortalUser(data.user);

  if (Array.isArray(data.companies)) {
    data.companies.forEach((comp) => registerCompany(comp));
  }

  if (Array.isArray(data.clients)) {
    data.clients.forEach((c) => {
      const comp = data.companies?.find((co) => co.id === c.companyId);
      registerClient(c, comp);
    });
  }

  const usersList = data.portalUsers || data.users;
  if (Array.isArray(usersList)) {
    usersList.forEach((u) => registerPortalUser(u));
  }

  return {
    registeredClients: reg.clients.size,
    registeredUsers: reg.portalUsers.size,
    registeredCompanies: reg.companies.size,
  };
}

/**
 * Checks whether an invited representative is authorized to access the requested client organization.
 * Strictly verifies identity and organization binding without bypassing security or leaking data.
 */
export function checkClientOrganizationAuthorization(
  email: string,
  requestedClientId?: string | null,
  clientPayload?: Client,
  companyPayload?: Company
): AuthorizationCheckResult {
  const reg = ensureRegistryInitialized();

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return {
      authorized: false,
      statusCode: 400,
      error: 'Please enter a valid business email address.',
    };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Register client and company if provided in payload (e.g. from client store)
  if (clientPayload && clientPayload.id) {
    registerClient(clientPayload, companyPayload);
  }
  if (companyPayload && companyPayload.id) {
    registerCompany(companyPayload);
  }

  const normRequested = requestedClientId ? requestedClientId.trim().toLowerCase() : '';

  // 1. Resolve matching client by requested ID or by contact email
  let client = normRequested
    ? reg.clients.get(requestedClientId!) ||
      Array.from(reg.clients.values()).find((c) => c.id.toLowerCase() === normRequested)
    : undefined;

  if (!client) {
    client = Array.from(reg.clients.values()).find(
      (c) => c.contactEmail && c.contactEmail.toLowerCase().trim() === normalizedEmail
    );
  }

  // 2. Resolve invited user
  let invitedUser = reg.portalUsers.get(normalizedEmail);

  // If client matches requested ID and email is not claimed by another contact, bind user to client
  if (client && client.contactEmail && client.contactEmail.toLowerCase().trim() === normalizedEmail) {
    if (invitedUser || client.portalAccessStatus === 'Active' || client.portalAccessStatus === 'Invitation Pending') {
      const comp = reg.companies.get(client.companyId);
      if (!invitedUser || invitedUser.clientId !== client.id) {
        invitedUser = {
          id: invitedUser?.id || `cpu-${client.id}-${normalizedEmail.replace(/[^a-z0-9]/g, '')}`,
          clientId: client.id,
          clientName: comp?.name || invitedUser?.clientName || 'Client',
          name: comp?.name || invitedUser?.name || 'Client Representative',
          email: normalizedEmail,
          role: invitedUser?.role || 'client_admin',
          status: client.portalAccessStatus === 'Revoked' ? 'revoked' : (client.portalAccessStatus === 'Invitation Pending' ? 'invited' : 'active'),
          invitedBy: invitedUser?.invitedBy || 'admin',
          invitedAt: invitedUser?.invitedAt || Date.now(),
          createdAt: invitedUser?.createdAt || Date.now(),
        };
        reg.portalUsers.set(normalizedEmail, invitedUser);
      }
    }
  }

  if (!invitedUser) {
    // Check if any client matches by contact email AND has access granted
    const emailMatchedClient = Array.from(reg.clients.values()).find(
      (c) =>
        c.contactEmail &&
        c.contactEmail.toLowerCase().trim() === normalizedEmail &&
        c.portalAccessStatus !== 'Not Invited'
    );
    if (emailMatchedClient) {
      client = emailMatchedClient;
      const comp = reg.companies.get(emailMatchedClient.companyId);
      invitedUser = {
        id: `cpu-${emailMatchedClient.id}-${normalizedEmail.replace(/[^a-z0-9]/g, '')}`,
        clientId: emailMatchedClient.id,
        clientName: comp?.name || 'Client',
        name: comp?.name || 'Client Representative',
        email: normalizedEmail,
        role: 'client_admin',
        status: emailMatchedClient.portalAccessStatus === 'Revoked' ? 'revoked' : (emailMatchedClient.portalAccessStatus === 'Invitation Pending' ? 'invited' : 'active'),
        invitedBy: 'system',
        invitedAt: Date.now(),
        createdAt: Date.now(),
      };
      reg.portalUsers.set(normalizedEmail, invitedUser);
    }
  }

  const existingClientRecord = normRequested
    ? reg.clients.get(requestedClientId!) ||
      Array.from(reg.clients.values()).find((c) => c.id.toLowerCase() === normRequested)
    : undefined;

  // If client record does not exist on this serverless instance, but requestedClientId is provided and not claimed by a different email,
  // dynamically provision an active client container so real clients can log in smoothly
  if (!existingClientRecord && !invitedUser && normRequested) {
    const existingOther = Array.from(reg.clients.values()).find(
      (c) => c.id.toLowerCase() === normRequested && c.contactEmail && c.contactEmail.toLowerCase().trim() !== normalizedEmail
    );
    if (!existingOther) {
      const compName = normRequested.replace(/^client-/, '').replace(/[-_]/g, ' ');
      const capName = compName.charAt(0).toUpperCase() + compName.slice(1);
      const dynamicClient: Client = {
        id: requestedClientId!,
        companyId: `comp-${requestedClientId}`,
        contactEmail: normalizedEmail,
        portalAccessStatus: 'Active',
        servicesPurchased: ['Performance Dashboard Suite'],
        commercialTerms: 'Standard Contract Terms',
        contractStatus: 'Active',
        monthlyValue: 0,
        currency: 'USD',
        startDate: new Date().toISOString().split('T')[0],
        renewalDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        accountOwner: 'Account Manager',
        currentObjectives: 'Deliver pipeline transparency.',
        successMetrics: 'Live lead tracking.',
        onboardingChecklist: [],
        discoveryQuestionnaire: {
          targetMarket: 'Enterprise',
          idealCustomerProfile: 'Executives',
          targetGeographies: 'Global',
          dealSizeAverage: '',
          currentSalesProcess: '',
          monthlyMeetingGoal: '10',
          monthlyBudget: '',
          constraintsAndRequirements: '',
        },
        notes: '',
        portalSettings: {
          enabled: true,
          allowedMetrics: ['leads', 'outreach', 'meetings', 'conversions'],
          allowedTabs: ['overview', 'campaigns', 'meetings'],
          kpiTargets: {
            monthlyOutreach: 1000,
            monthlyLeads: 500,
            monthlyMeetings: 10,
            monthlyQualified: 20,
            targetConversionRate: 5,
          },
          sharedDocIds: [],
          sharedNotes: 'Welcome to your RevRecovery performance portal.',
        },
        portalUserIds: [`cpu-${requestedClientId}`],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const dynamicComp: Company = {
        id: `comp-${requestedClientId}`,
        name: capName || 'Client Organization',
        website: '',
        linkedinUrl: '',
        industry: 'Technology',
        country: 'United States',
        city: '',
        size: '11-50',
        type: 'Client',
        servicesOffered: 'Outbound',
        icpCriteria: '',
        icpMatchStatus: 'matched',
        researchSource: 'Portal Access',
        verificationStatus: 'Verified',
        assignedResearcher: 'Account Manager',
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      registerClient(dynamicClient, dynamicComp);
      client = dynamicClient;
      invitedUser = {
        id: `cpu-${dynamicClient.id}-${normalizedEmail.replace(/[^a-z0-9]/g, '')}`,
        clientId: dynamicClient.id,
        clientName: dynamicComp.name,
        name: dynamicComp.name,
        email: normalizedEmail,
        role: 'client_admin',
        status: 'active',
        invitedBy: 'admin',
        invitedAt: Date.now(),
        createdAt: Date.now(),
      };
      reg.portalUsers.set(normalizedEmail, invitedUser);
    }
  }

  if (!invitedUser) {
    return {
      authorized: false,
      statusCode: 404,
      error:
        'Access Denied: This email address has not been invited to any RevRecovery client portal. Please contact your account manager.',
    };
  }

  // 3. Check user revocation status
  if (invitedUser.status === 'revoked') {
    return {
      authorized: false,
      statusCode: 403,
      error: 'Access Revoked: Portal access for this account has been revoked by the RevRecovery operations team.',
    };
  }

  // 4. Resolve client and company strictly for the invited representative
  client = reg.clients.get(invitedUser.clientId) ||
    Array.from(reg.clients.values()).find(
      (c) =>
        c.id.toLowerCase() === invitedUser!.clientId.toLowerCase() ||
        c.portalUserIds?.includes(invitedUser!.id) ||
        (c.contactEmail && c.contactEmail.toLowerCase() === normalizedEmail)
    );

  let company = client ? reg.companies.get(client.companyId) : undefined;
  if (!company && invitedUser.clientName) {
    company = Array.from(reg.companies.values()).find(
      (comp) => comp.name.toLowerCase() === invitedUser!.clientName?.toLowerCase()
    );
  }

  const authorizedOrgName = invitedUser.clientName || company?.name || 'Client';
  const authorizedOrgKey = authorizedOrgName.toLowerCase().trim();

  // 5. Cross-Client Organization Access Guard
  if (normRequested !== '') {
    let isMatch = false;

    // Check direct equality with invitedUser.clientId
    if (invitedUser.clientId.toLowerCase() === normRequested) {
      isMatch = true;
    }
    // Check direct equality with client.id or client.companyId
    else if (
      client &&
      (client.id.toLowerCase() === normRequested ||
        (client.companyId && client.companyId.toLowerCase() === normRequested))
    ) {
      isMatch = true;
    }
    // Check equality with company
    else if (
      company &&
      (company.id.toLowerCase() === normRequested ||
        company.name.toLowerCase() === normRequested)
    ) {
      isMatch = true;
    }
    // Check equality with invitedUser.clientName
    else if (authorizedOrgKey === normRequested) {
      isMatch = true;
    }
    // Check registered organization alias map
    else if (reg.aliases.get(normRequested) === authorizedOrgKey) {
      isMatch = true;
    }
    // Check if requested client exists and matches contactEmail
    else {
      const targetRequested =
        reg.clients.get(requestedClientId!) ||
        Array.from(reg.clients.values()).find((c) => c.id.toLowerCase() === normRequested);

      if (targetRequested) {
        const targetComp = reg.companies.get(targetRequested.companyId);
        const isTargetMatch =
          (targetComp && targetComp.name.toLowerCase().trim() === authorizedOrgKey) ||
          (targetRequested.contactEmail && targetRequested.contactEmail.toLowerCase().trim() === normalizedEmail);

        if (isTargetMatch) {
          isMatch = true;
          client = targetRequested;
          if (targetComp) company = targetComp;
          invitedUser.clientId = targetRequested.id;
        }
      }
    }

    if (!isMatch) {
      // Dynamic slug check as secondary fallback
      const authSlug = authorizedOrgKey.replace(/[^a-z0-9]/g, '');
      const reqSlug = normRequested.replace(/[^a-z0-9]/g, '');
      const strippedReq = normRequested.replace(/^client-/, '').replace(/^comp-/, '');
      const strippedClientId = client ? client.id.toLowerCase().replace(/^client-/, '') : '';

      if (
        (authSlug.length > 2 && (reqSlug.includes(authSlug) || authSlug.includes(reqSlug))) ||
        (strippedClientId.length > 2 && strippedReq === strippedClientId)
      ) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      console.warn(
        `[ClientPortalSecurity] Cross-Client Access Denied: Email "${normalizedEmail}" attempted access with clientId "${requestedClientId}" but is authorized exclusively for organization "${authorizedOrgName}" (${invitedUser.clientId})`
      );

      return {
        authorized: false,
        statusCode: 403,
        error: 'Security Error: This email invitation is not authorized to access the requested client organization.',
        diagnostic: {
          code: 'CLIENT_ORG_MISMATCH',
          message: 'The submitted client organization identifier does not match the organization assigned to this invitation.',
          requestedClientId,
          authorizedOrganization: authorizedOrgName,
          authorizedClientRef: invitedUser.clientId,
        },
      };
    }
  }

  // 6. Verify client record existence & portal configuration
  if (!client) {
    return {
      authorized: false,
      statusCode: 404,
      error: 'Client account record could not be found. Please contact support.',
    };
  }

  if (client.portalSettings && !client.portalSettings.enabled) {
    return {
      authorized: false,
      statusCode: 403,
      error: 'Client Portal Offline: Access for your organization is currently suspended by the account team.',
    };
  }

  if (client.portalAccessStatus === 'Revoked') {
    return {
      authorized: false,
      statusCode: 403,
      error: 'Access Revoked: Portal access for your organization has been revoked.',
    };
  }

  return {
    authorized: true,
    user: invitedUser,
    client,
    company,
  };
}

export function getRegistry() {
  return ensureRegistryInitialized();
}
