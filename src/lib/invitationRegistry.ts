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
  isInitialized: boolean;
}

// Global singleton registry instance to share across Next.js API route handlers in the same runtime
const globalRegistry: InvitationRegistry = {
  companies: new Map(),
  clients: new Map(),
  portalUsers: new Map(),
  aliases: new Map(),
  isInitialized: false,
};

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
      }
    });

    // 4. Explicit seed aliases for syscraft
    globalRegistry.aliases.set('client-syscraft', 'syscraft');
    globalRegistry.aliases.set('comp-syscraft', 'syscraft');
    globalRegistry.aliases.set('syscraft', 'syscraft');

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
  } else if (client.companyId) {
    const existingComp = reg.companies.get(client.companyId);
    if (existingComp) {
      const orgKey = existingComp.name.toLowerCase().trim();
      reg.aliases.set(client.id.toLowerCase(), orgKey);
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

  if (Array.isArray(data.portalUsers)) {
    data.portalUsers.forEach((u) => registerPortalUser(u));
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
  requestedClientId?: string | null
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

  // 1. Look up invitation record
  const invitedUser = reg.portalUsers.get(normalizedEmail);
  if (!invitedUser) {
    return {
      authorized: false,
      statusCode: 404,
      error:
        'Access Denied: This email address has not been invited to any RevRecovery client portal. Please contact your account manager.',
    };
  }

  // 2. Check user revocation status
  if (invitedUser.status === 'revoked') {
    return {
      authorized: false,
      statusCode: 403,
      error: 'Access Revoked: Portal access for this account has been revoked by the RevRecovery operations team.',
    };
  }

  // 3. Resolve assigned client record and company
  let client = reg.clients.get(invitedUser.clientId);
  if (!client) {
    // Find client by matching user ID in portalUserIds or matching contact email
    client = Array.from(reg.clients.values()).find(
      (c) =>
        c.portalUserIds?.includes(invitedUser.id) ||
        (c.contactEmail && c.contactEmail.toLowerCase() === normalizedEmail)
    );
  }

  let company = client ? reg.companies.get(client.companyId) : undefined;
  if (!company && invitedUser.clientName) {
    company = Array.from(reg.companies.values()).find(
      (comp) => comp.name.toLowerCase() === invitedUser.clientName?.toLowerCase()
    );
  }

  const authorizedOrgName = invitedUser.clientName || company?.name || 'Client';
  const authorizedOrgKey = authorizedOrgName.toLowerCase().trim();

  // 4. Cross-Client Organization Access Guard
  if (requestedClientId && requestedClientId.trim() !== '') {
    const normRequested = requestedClientId.trim().toLowerCase();
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
    // Check direct equality with company.id or company.name
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
    // Check if requestedClientId is a registered client belonging to the same company
    else if (reg.clients.has(requestedClientId)) {
      const matchingClient = reg.clients.get(requestedClientId)!;
      const matchingCompany = reg.companies.get(matchingClient.companyId);
      if (matchingCompany && matchingCompany.name.toLowerCase().trim() === authorizedOrgKey) {
        isMatch = true;
        // Bind to this active client record
        client = matchingClient;
        company = matchingCompany;
      }
    }
    // Check if requestedClientId is a registered company with matching name
    else if (reg.companies.has(requestedClientId)) {
      const matchingCompany = reg.companies.get(requestedClientId)!;
      if (matchingCompany.name.toLowerCase().trim() === authorizedOrgKey) {
        isMatch = true;
        company = matchingCompany;
      }
    }
    // Explicit known aliases for syscraft
    else if (
      authorizedOrgKey === 'syscraft' &&
      ['client-syscraft', 'comp-syscraft', 'syscraft'].includes(normRequested)
    ) {
      isMatch = true;
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

  // 5. Verify client record existence & portal configuration
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
