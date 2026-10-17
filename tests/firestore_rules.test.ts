import { describe, it, expect } from 'vitest';

/**
 * In-memory evaluation harness simulating the exact logic and semantics of firestore.rules
 */
interface AuthContext {
  uid: string;
  token?: {
    email?: string;
  };
}

interface FirestoreState {
  workspaces: Record<string, any>;
  members: Record<string, Record<string, any>>;
  clients: Record<string, Record<string, any>>;
  clientPortalUsers: Record<string, Record<string, any>>;
  leads: Record<string, Record<string, any>>;
  meetings: Record<string, Record<string, any>>;
  companies: Record<string, Record<string, any>>;
  tasks: Record<string, Record<string, any>>;
}

class FirestoreRulesSimulator {
  state: FirestoreState;

  constructor(initialState?: Partial<FirestoreState>) {
    this.state = {
      workspaces: {},
      members: {},
      clients: {},
      clientPortalUsers: {},
      leads: {},
      meetings: {},
      companies: {},
      tasks: {},
      ...initialState,
    };
  }

  // Helper 1: Authentication Helper
  isAuthenticated(auth?: AuthContext): boolean {
    return auth != null && auth.uid != null;
  }

  // Helper 2: Membership Check
  isRegisteredMember(workspaceId: string, auth?: AuthContext): boolean {
    if (!this.isAuthenticated(auth)) return false;
    return !!this.state.members[workspaceId]?.[auth!.uid];
  }

  getMember(workspaceId: string, auth?: AuthContext): any {
    return this.state.members[workspaceId]?.[auth!.uid];
  }

  // Helper 3: Workspace Owner
  isWorkspaceOwner(workspaceId: string, auth?: AuthContext): boolean {
    if (!this.isAuthenticated(auth)) return false;
    const ws = this.state.workspaces[workspaceId];
    const isDocOwner = ws && (ws.ownerId === auth!.uid || (ws.ownerEmail && auth!.token?.email && ws.ownerEmail === auth!.token.email));
    const member = this.getMember(workspaceId, auth);
    const isMemberOwner = member && ['owner', 'co-founder', 'co-owner'].includes(member.role);
    return !!(isDocOwner || isMemberOwner);
  }

  // Helper 4: Workspace Admin
  isWorkspaceAdmin(workspaceId: string, auth?: AuthContext): boolean {
    if (!this.isAuthenticated(auth)) return false;
    if (this.isWorkspaceOwner(workspaceId, auth)) return true;
    const member = this.getMember(workspaceId, auth);
    return !!(member && member.role === 'admin');
  }

  // Helper 5: Internal Team Member
  isInternalTeamMember(workspaceId: string, auth?: AuthContext): boolean {
    if (this.isWorkspaceOwner(workspaceId, auth)) return true;
    const member = this.getMember(workspaceId, auth);
    return !!(member && ['owner', 'co-founder', 'co-owner', 'admin', 'member', 'viewer'].includes(member.role));
  }

  // Helper 6: Client User Role
  isClientUser(workspaceId: string, auth?: AuthContext): boolean {
    const member = this.getMember(workspaceId, auth);
    return !!(member && ['client_admin', 'client_guest'].includes(member.role));
  }

  // Helper 7: Client Organization Active Check
  isClientPortalActive(workspaceId: string, clientId: string): boolean {
    const client = this.state.clients[workspaceId]?.[clientId];
    if (!client) return false;
    if (client.portalAccessStatus === 'Revoked') return false;
    if (client.portalSettings && client.portalSettings.enabled === false) return false;
    return true;
  }

  // Helper 8: Individual Representative Revocation Check
  isClientUserNotRevoked(workspaceId: string, auth?: AuthContext): boolean {
    const member = this.getMember(workspaceId, auth);
    if (!member) return false;

    if (member.invitationId) {
      const invite = this.state.clientPortalUsers[workspaceId]?.[member.invitationId];
      if (invite && invite.status === 'revoked') return false;
    }

    const directInvite = this.state.clientPortalUsers[workspaceId]?.[auth!.uid];
    if (directInvite && directInvite.status === 'revoked') return false;

    return true;
  }

  // Helper 9: Client Organization Authorization Guard
  isAuthorizedClient(workspaceId: string, clientId: string, auth?: AuthContext): boolean {
    if (!this.isAuthenticated(auth) || !clientId) return false;
    if (!this.isClientUser(workspaceId, auth)) return false;
    const member = this.getMember(workspaceId, auth);
    if (member.clientId !== clientId) return false;
    if (!this.isClientUserNotRevoked(workspaceId, auth)) return false;
    if (!this.isClientPortalActive(workspaceId, clientId)) return false;
    return true;
  }

  // Helper 10: Valid Invitation Check for Member Creation
  isValidClientInvitation(workspaceId: string, memberId: string, memberData: any, auth?: AuthContext): boolean {
    if (!this.isAuthenticated(auth) || !auth!.token?.email) return false;
    if (memberData.email !== auth!.token.email) return false;

    const byInviteId = memberData.invitationId && this.state.clientPortalUsers[workspaceId]?.[memberData.invitationId];
    if (
      byInviteId &&
      byInviteId.email === auth!.token.email &&
      byInviteId.clientId === memberData.clientId &&
      byInviteId.role === memberData.role &&
      byInviteId.status !== 'revoked'
    ) {
      return true;
    }

    const byMemberId = this.state.clientPortalUsers[workspaceId]?.[memberId];
    if (
      byMemberId &&
      byMemberId.email === auth!.token.email &&
      byMemberId.clientId === memberData.clientId &&
      byMemberId.role === memberData.role &&
      byMemberId.status !== 'revoked'
    ) {
      return true;
    }

    return false;
  }

  // ==========================================
  // Evaluate Read/Write access on Collections
  // ==========================================

  canCreateMember(workspaceId: string, memberId: string, memberData: any, auth?: AuthContext): boolean {
    if (this.isWorkspaceAdmin(workspaceId, auth)) return true;

    // Case 1: Owner bootstrap
    const ws = this.state.workspaces[workspaceId];
    const isOwnerBootstrap =
      this.isAuthenticated(auth) &&
      auth!.uid === memberId &&
      (!ws || ws.ownerId === auth!.uid || (ws.ownerEmail && ws.ownerEmail === auth!.token?.email)) &&
      ['owner', 'co-founder', 'admin'].includes(memberData.role);
    if (isOwnerBootstrap) return true;

    // Case 2: Client accepting genuine invitation
    const isClientInviteAcceptance =
      this.isAuthenticated(auth) &&
      auth!.uid === memberId &&
      ['client_admin', 'client_guest'].includes(memberData.role) &&
      memberData.clientId != null &&
      this.isValidClientInvitation(workspaceId, memberId, memberData, auth);
    if (isClientInviteAcceptance) return true;

    return false;
  }

  canUpdateMember(workspaceId: string, auth?: AuthContext): boolean {
    return this.isWorkspaceAdmin(workspaceId, auth);
  }

  canReadClient(workspaceId: string, clientId: string, auth?: AuthContext): boolean {
    return this.isInternalTeamMember(workspaceId, auth) || this.isAuthorizedClient(workspaceId, clientId, auth);
  }

  canWriteClient(workspaceId: string, auth?: AuthContext): boolean {
    if (this.isWorkspaceAdmin(workspaceId, auth)) return true;
    const member = this.getMember(workspaceId, auth);
    return !!(this.isInternalTeamMember(workspaceId, auth) && member && member.role !== 'viewer');
  }

  canReadLead(workspaceId: string, leadId: string, auth?: AuthContext): boolean {
    const lead = this.state.leads[workspaceId]?.[leadId];
    if (!lead) return false;
    return this.isInternalTeamMember(workspaceId, auth) || (lead.clientId && this.isAuthorizedClient(workspaceId, lead.clientId, auth));
  }

  canReadMeeting(workspaceId: string, meetingId: string, auth?: AuthContext): boolean {
    const meeting = this.state.meetings[workspaceId]?.[meetingId];
    if (!meeting) return false;
    const targetClientId = meeting.relatedClientId || meeting.clientId;
    return this.isInternalTeamMember(workspaceId, auth) || (targetClientId && this.isAuthorizedClient(workspaceId, targetClientId, auth));
  }

  canAccessInternalCollection(workspaceId: string, collectionName: string, auth?: AuthContext): boolean {
    return this.isInternalTeamMember(workspaceId, auth);
  }
}

describe('Firestore Security Rules Policy Verification Suite', () => {
  const wsId = 'ws-main';

  it('1. Verifies that the existing workspace owner retains full access', () => {
    // Scenario A: Workspace owner identified by workspace document ownerId
    const sim = new FirestoreRulesSimulator({
      workspaces: {
        [wsId]: { id: wsId, name: 'Main Agency', ownerId: 'owner-uid-1' },
      },
      companies: {
        [wsId]: { 'comp-1': { id: 'comp-1', name: 'Internal Client Company' } },
      },
    });

    const ownerAuth = { uid: 'owner-uid-1', token: { email: 'sanskar@revrecovery.io' } };
    expect(sim.isWorkspaceOwner(wsId, ownerAuth)).toBe(true);
    expect(sim.isInternalTeamMember(wsId, ownerAuth)).toBe(true);
    expect(sim.canAccessInternalCollection(wsId, 'companies', ownerAuth)).toBe(true);
    expect(sim.canWriteClient(wsId, ownerAuth)).toBe(true);

    // Scenario B: Workspace owner identified by ownerEmail
    const simEmailOwner = new FirestoreRulesSimulator({
      workspaces: {
        [wsId]: { id: wsId, name: 'Main Agency', ownerEmail: 'sanskar@revrecovery.io' },
      },
    });
    expect(simEmailOwner.isWorkspaceOwner(wsId, ownerAuth)).toBe(true);
    expect(simEmailOwner.isInternalTeamMember(wsId, ownerAuth)).toBe(true);

    // Scenario C: Workspace owner identified by member record role
    const simMemberOwner = new FirestoreRulesSimulator({
      members: {
        [wsId]: { 'owner-uid-1': { id: 'owner-uid-1', role: 'owner' } },
      },
    });
    expect(simMemberOwner.isWorkspaceOwner(wsId, ownerAuth)).toBe(true);
    expect(simMemberOwner.isInternalTeamMember(wsId, ownerAuth)).toBe(true);
  });

  it('2. Ensures client users can read only their own authorized client data and prevents cross-client access', () => {
    const sim = new FirestoreRulesSimulator({
      clients: {
        [wsId]: {
          'client-alpha': { id: 'client-alpha', name: 'Alpha Corp', portalAccessStatus: 'Active' },
          'client-beta': { id: 'client-beta', name: 'Beta Ltd', portalAccessStatus: 'Active' },
        },
      },
      members: {
        [wsId]: {
          'user-alpha': { id: 'user-alpha', role: 'client_admin', clientId: 'client-alpha' },
          'user-beta': { id: 'user-beta', role: 'client_admin', clientId: 'client-beta' },
        },
      },
      leads: {
        [wsId]: {
          'lead-alpha-1': { id: 'lead-alpha-1', clientId: 'client-alpha', title: 'Alpha Lead' },
          'lead-beta-1': { id: 'lead-beta-1', clientId: 'client-beta', title: 'Beta Lead' },
        },
      },
      meetings: {
        [wsId]: {
          'meet-alpha-1': { id: 'meet-alpha-1', relatedClientId: 'client-alpha', title: 'Alpha Discovery' },
          'meet-beta-1': { id: 'meet-beta-1', relatedClientId: 'client-beta', title: 'Beta Discovery' },
        },
      },
    });

    const alphaAuth = { uid: 'user-alpha', token: { email: 'alice@alpha.com' } };
    const betaAuth = { uid: 'user-beta', token: { email: 'bob@beta.com' } };

    // Alpha reads Alpha data -> ALLOWED
    expect(sim.canReadClient(wsId, 'client-alpha', alphaAuth)).toBe(true);
    expect(sim.canReadLead(wsId, 'lead-alpha-1', alphaAuth)).toBe(true);
    expect(sim.canReadMeeting(wsId, 'meet-alpha-1', alphaAuth)).toBe(true);

    // Alpha attempts cross-client access to Beta data -> STRICTLY BLOCKED
    expect(sim.canReadClient(wsId, 'client-beta', alphaAuth)).toBe(false);
    expect(sim.canReadLead(wsId, 'lead-beta-1', alphaAuth)).toBe(false);
    expect(sim.canReadMeeting(wsId, 'meet-beta-1', alphaAuth)).toBe(false);

    // Beta reads Beta data -> ALLOWED
    expect(sim.canReadClient(wsId, 'client-beta', betaAuth)).toBe(true);
    expect(sim.canReadLead(wsId, 'lead-beta-1', betaAuth)).toBe(true);
    expect(sim.canReadMeeting(wsId, 'meet-beta-1', betaAuth)).toBe(true);

    // Beta attempts cross-client access to Alpha data -> STRICTLY BLOCKED
    expect(sim.canReadClient(wsId, 'client-alpha', betaAuth)).toBe(false);
    expect(sim.canReadLead(wsId, 'lead-alpha-1', betaAuth)).toBe(false);
    expect(sim.canReadMeeting(wsId, 'meet-alpha-1', betaAuth)).toBe(false);
  });

  it('3. Ensures clients cannot change their own role, clientId, email, or grant themselves access', () => {
    const sim = new FirestoreRulesSimulator({
      members: {
        [wsId]: {
          'user-client': { id: 'user-client', role: 'client_admin', clientId: 'client-alpha' },
        },
      },
    });

    const clientAuth = { uid: 'user-client', token: { email: 'client@alpha.com' } };
    const adminAuth = { uid: 'admin-user', token: { email: 'admin@agency.com' } };
    sim.state.members[wsId]['admin-user'] = { id: 'admin-user', role: 'admin' };

    // Client attempts to update their own member record (e.g. self-escalate to owner or change clientId)
    expect(sim.canUpdateMember(wsId, clientAuth)).toBe(false);

    // Only Admin can update members
    expect(sim.canUpdateMember(wsId, adminAuth)).toBe(true);

    // Client attempts to write to clients directory -> BLOCKED
    expect(sim.canWriteClient(wsId, clientAuth)).toBe(false);
  });

  it('4. Enforces genuine invitation requirement: client cannot self-assign membership without admin invitation', () => {
    const sim = new FirestoreRulesSimulator({
      clientPortalUsers: {
        [wsId]: {
          'invite-123': {
            id: 'invite-123',
            email: 'invited@client.com',
            clientId: 'client-legit',
            role: 'client_admin',
            status: 'invited',
          },
        },
      },
    });

    // Legitimate invited user accepting invitation with matching email, clientId, role
    const legitAuth = { uid: 'uid-legit', token: { email: 'invited@client.com' } };
    const legitPayload = {
      email: 'invited@client.com',
      clientId: 'client-legit',
      role: 'client_admin',
      invitationId: 'invite-123',
    };
    expect(sim.canCreateMember(wsId, 'uid-legit', legitPayload, legitAuth)).toBe(true);

    // Attacker attempting to claim uninvited client
    const attackerAuth = { uid: 'uid-attacker', token: { email: 'attacker@evil.com' } };
    const attackerPayload = {
      email: 'attacker@evil.com',
      clientId: 'client-legit',
      role: 'client_admin',
    };
    expect(sim.canCreateMember(wsId, 'uid-attacker', attackerPayload, attackerAuth)).toBe(false);

    // Attacker attempting to self-assign 'owner' role without being owner
    const fakeOwnerPayload = {
      role: 'owner',
    };
    sim.state.workspaces[wsId] = { id: wsId, ownerId: 'real-owner-uid' };
    expect(sim.canCreateMember(wsId, 'uid-attacker', fakeOwnerPayload, attackerAuth)).toBe(false);
  });

  it('5. Strictly blocks revoked client invitations and revoked portal access', () => {
    const sim = new FirestoreRulesSimulator({
      clients: {
        [wsId]: {
          'client-revoked': { id: 'client-revoked', portalAccessStatus: 'Revoked' },
          'client-offline': {
            id: 'client-offline',
            portalAccessStatus: 'Active',
            portalSettings: { enabled: false },
          },
        },
      },
      members: {
        [wsId]: {
          'user-revoked': {
            id: 'user-revoked',
            role: 'client_admin',
            clientId: 'client-revoked',
            invitationId: 'invite-revoked',
          },
          'user-offline': {
            id: 'user-offline',
            role: 'client_admin',
            clientId: 'client-offline',
          },
          'user-rep-revoked': {
            id: 'user-rep-revoked',
            role: 'client_admin',
            clientId: 'client-active',
            invitationId: 'invite-rep-revoked',
          },
        },
      },
      clientPortalUsers: {
        [wsId]: {
          'invite-revoked': { id: 'invite-revoked', status: 'revoked', email: 'revoked@client.com' },
          'invite-rep-revoked': { id: 'invite-rep-revoked', status: 'revoked', email: 'rep@client.com' },
        },
      },
    });

    const revokedClientAuth = { uid: 'user-revoked', token: { email: 'revoked@client.com' } };
    const offlineClientAuth = { uid: 'user-offline', token: { email: 'offline@client.com' } };
    const repRevokedAuth = { uid: 'user-rep-revoked', token: { email: 'rep@client.com' } };

    // Case A: Client organization portalAccessStatus == 'Revoked' -> BLOCKED
    expect(sim.canReadClient(wsId, 'client-revoked', revokedClientAuth)).toBe(false);

    // Case B: Client organization portalSettings.enabled == false -> BLOCKED
    expect(sim.canReadClient(wsId, 'client-offline', offlineClientAuth)).toBe(false);

    // Case C: Individual representative invitation revoked -> BLOCKED
    expect(sim.canReadClient(wsId, 'client-active', repRevokedAuth)).toBe(false);

    // Case D: Revoked invitation cannot be accepted to create member
    expect(
      sim.canCreateMember(wsId, 'user-revoked', {
        email: 'revoked@client.com',
        clientId: 'client-revoked',
        role: 'client_admin',
        invitationId: 'invite-revoked',
      }, revokedClientAuth)
    ).toBe(false);
  });

  it('6. Strictly prevents clients from reading internal agency collections', () => {
    const sim = new FirestoreRulesSimulator({
      members: {
        [wsId]: {
          'user-client': { id: 'user-client', role: 'client_admin', clientId: 'client-alpha' },
        },
      },
    });

    const clientAuth = { uid: 'user-client', token: { email: 'client@alpha.com' } };
    const internalCollections = [
      'companies',
      'contacts',
      'tasks',
      'proposals',
      'contentItems',
      'customModules',
      'customRecords',
      'outreachSources',
      'automationRules',
      'integrations',
      'pages',
      'databases',
      'teamMembers',
      'kpiTargets',
    ];

    internalCollections.forEach((col) => {
      expect(sim.canAccessInternalCollection(wsId, col, clientAuth)).toBe(false);
    });
  });
});
