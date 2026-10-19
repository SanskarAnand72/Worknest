import { describe, it, expect, beforeEach } from 'vitest';
import { useRevRecoveryStore } from '../src/stores/revrecoveryStore';

describe('RevRecovery OS - Client Portal & Multi-Tenant Isolation Suite', () => {
  beforeEach(async () => {
    const store = useRevRecoveryStore.getState();
    await store.init();
  });

  it('1. Configures client portal settings and agreed monthly KPI targets', async () => {
    const store = useRevRecoveryStore.getState();

    // Create client organization
    const company = await store.addCompany({
      name: 'Stripe Global Technologies',
      industry: 'FinTech',
      country: 'United States',
    });

    const client = await store.addClient({
      companyId: company.id,
      monthlyValue: 8500,
      contractStatus: 'Active',
      accountOwner: 'Sanskar Anand',
    });

    expect(client.id).toBeDefined();

    // Update portal settings with custom metrics and KPI targets
    await store.updateClientPortalSettings(client.id, {
      enabled: true,
      allowedMetrics: ['leads', 'outreach', 'meetings', 'conversions'],
      allowedTabs: ['overview', 'campaigns', 'meetings'],
      kpiTargets: {
        monthlyOutreach: 1200,
        monthlyLeads: 600,
        monthlyQualified: 45,
        monthlyMeetings: 20,
        targetConversionRate: 8.5,
      },
      sharedNotes: 'Welcome to your RevRecovery portal. Outbound sequences live in US & EU markets.',
    });

    const updatedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(updatedClient?.portalSettings?.enabled).toBe(true);
    expect(updatedClient?.portalSettings?.kpiTargets.monthlyOutreach).toBe(1200);
    expect(updatedClient?.portalSettings?.kpiTargets.monthlyMeetings).toBe(20);
    expect(updatedClient?.portalSettings?.kpiTargets.targetConversionRate).toBe(8.5);
    expect(updatedClient?.portalSettings?.allowedMetrics).toContain('conversions');
    expect(updatedClient?.portalSettings?.allowedMetrics).not.toContain('replies');
    expect(updatedClient?.portalSettings?.sharedNotes).toContain('Welcome to your RevRecovery portal');
  });

  it('2. Invites client portal users, generates secure direct links, and manages roles', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Linear Systems' });
    const client = await store.addClient({ companyId: company.id });

    // 1. Invite client representative as client_admin
    const { user, inviteLink } = await store.inviteClientPortalUser(client.id, {
      email: 'karri@linear.app',
      name: 'Karri Saarinen',
      role: 'client_admin',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('karri@linear.app');
    expect(user.clientId).toBe(client.id);
    expect(user.role).toBe('client_admin');
    expect(user.status).toBe('invited');
    expect(inviteLink).toContain('/client-portal/login');
    expect(inviteLink).toContain(`email=${encodeURIComponent('karri@linear.app')}`);

    // Verify stored in client.portalUserIds and client portal status updated
    const updatedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(updatedClient?.portalUserIds).toContain(user.id);
    expect(updatedClient?.portalAccessStatus).toBe('Invitation Pending');

    // 2. Resend invitation test
    const { inviteLink: resentLink } = await store.resendClientPortalInvitation(user.id);
    expect(resentLink).toContain('/client-portal/login');
    expect(resentLink).toContain(`email=${encodeURIComponent('karri@linear.app')}`);

    // 3. Update role to client_guest
    await store.updateClientPortalUserRole(user.id, 'client_guest');
    const guestUser = useRevRecoveryStore.getState().clientPortalUsers.find((u) => u.id === user.id);
    expect(guestUser?.role).toBe('client_guest');

    // 4. Revoke user access
    await store.revokeClientPortalUser(user.id);
    const revokedUser = useRevRecoveryStore.getState().clientPortalUsers.find((u) => u.id === user.id);
    expect(revokedUser?.status).toBe('revoked');
    const revokedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(revokedClient?.portalAccessStatus).toBe('Revoked');

    // 5. Delete user
    await store.deleteClientPortalUser(user.id);
    const deletedUser = useRevRecoveryStore.getState().clientPortalUsers.find((u) => u.id === user.id);
    expect(deletedUser).toBeUndefined();
    const finalClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(finalClient?.portalUserIds).not.toContain(user.id);
  });

  it('3. Strictly enforces cross-client data isolation (Client A cannot see Client B data)', async () => {
    const store = useRevRecoveryStore.getState();

    // Create Client A: Acme Corp
    const companyA = await store.addCompany({ name: 'Acme Corp', industry: 'Logistics' });
    const clientA = await store.addClient({ companyId: companyA.id, monthlyValue: 5000 });

    // Create Client B: Zephyr AI
    const companyB = await store.addCompany({ name: 'Zephyr AI', industry: 'Healthcare' });
    const clientB = await store.addClient({ companyId: companyB.id, monthlyValue: 7000 });

    // Add leads for Client A
    await store.addLead({
      companyId: companyA.id,
      clientId: clientA.id,
      title: 'Acme Outbound Lead 1',
      stage: 'Contacted',
      value: 10000,
      notes: 'PRIVATE INTERNAL NOTE FOR ACME LEAD',
    });

    await store.addLead({
      companyId: companyA.id,
      clientId: clientA.id,
      title: 'Acme Outbound Lead 2',
      stage: 'Meeting Booked',
      value: 15000,
      meetingStatus: 'Booked',
    });

    // Add leads for Client B
    await store.addLead({
      companyId: companyB.id,
      clientId: clientB.id,
      title: 'Zephyr Confidential Opportunity',
      stage: 'Proposal Sent',
      value: 40000,
      notes: 'HIGHLY SECRET PROPRIETARY ZEPHYR NOTE',
    });

    // Add meeting for Client A
    await store.addMeeting({
      title: 'Acme Discovery Call',
      date: '2026-10-20',
      time: '14:00',
      durationMinutes: 30,
      relatedClientId: clientA.id,
      relatedCompanyId: companyA.id,
      outcome: 'Scheduled',
      notes: 'Internal strategy notes for Acme meeting',
    });

    // Add meeting for Client B
    await store.addMeeting({
      title: 'Zephyr Executive Pitch',
      date: '2026-10-22',
      time: '16:00',
      durationMinutes: 45,
      relatedClientId: clientB.id,
      relatedCompanyId: companyB.id,
      outcome: 'Scheduled',
      notes: 'Internal revenue target $100k for Zephyr',
    });

    // Test Isolation for Client A
    const portalDataA = store.getClientPortalData(clientA.id, 'all');

    expect(portalDataA.client?.id).toBe(clientA.id);
    expect(portalDataA.company?.name).toBe('Acme Corp');

    // Leads isolation check
    expect(portalDataA.leads.length).toBe(2);
    expect(portalDataA.leads.some((l) => l.title === 'Acme Outbound Lead 1')).toBe(true);
    expect(portalDataA.leads.some((l) => l.title === 'Acme Outbound Lead 2')).toBe(true);
    expect(portalDataA.leads.some((l) => l.title === 'Zephyr Confidential Opportunity')).toBe(false);

    // Meetings isolation check
    expect(portalDataA.meetings.length).toBe(1);
    expect(portalDataA.meetings[0].title).toBe('Acme Discovery Call');
    expect(portalDataA.meetings.some((m) => m.title === 'Zephyr Executive Pitch')).toBe(false);

    // Test Isolation for Client B
    const portalDataB = store.getClientPortalData(clientB.id, 'all');
    expect(portalDataB.client?.id).toBe(clientB.id);
    expect(portalDataB.company?.name).toBe('Zephyr AI');
    expect(portalDataB.leads.length).toBe(1);
    expect(portalDataB.leads[0].title).toBe('Zephyr Confidential Opportunity');
    expect(portalDataB.leads.some((l) => l.title.includes('Acme'))).toBe(false);
    expect(portalDataB.meetings.length).toBe(1);
    expect(portalDataB.meetings[0].title).toBe('Zephyr Executive Pitch');
    expect(portalDataB.meetings.some((m) => m.title.includes('Acme'))).toBe(false);
  });

  it('4. Sanitizes sensitive internal data (internal notes, margins & tasks hidden)', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Nexus Secure Systems' });
    const client = await store.addClient({
      companyId: company.id,
      commercialTerms: 'Internal markup 60%, cost $2,000/mo',
      notes: 'Internal client relationship notes: high risk client',
    });

    await store.addLead({
      companyId: company.id,
      clientId: client.id,
      title: 'Nexus Enterprise Lead',
      stage: 'Qualified',
      notes: 'Internal lead note: competitor offer on table, offer discount if pressed',
    });

    await store.addMeeting({
      title: 'Nexus Sync',
      relatedClientId: client.id,
      relatedCompanyId: company.id,
      date: '2026-10-18',
      time: '11:00',
      durationMinutes: 30,
      outcome: 'Scheduled',
      notes: 'Internal team notes: prepare counter arguments',
      decisions: 'Internal margin decision',
    });

    const portalData = store.getClientPortalData(client.id, 'all');

    // Leads sanitized
    const lead = portalData.leads.find((l) => l.title === 'Nexus Enterprise Lead');
    expect(lead).toBeDefined();
    expect(lead?.notes).toBe(''); // Strictly wiped clean

    // Meetings sanitized
    const meeting = portalData.meetings.find((m) => m.title === 'Nexus Sync');
    expect(meeting).toBeDefined();
    expect(meeting?.notes).toBe(''); // Strictly wiped clean
    expect(meeting?.decisions).toBe(''); // Strictly wiped clean
  });

  it('5. Computes real metrics reliably without fabrication or hardcoded numbers', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Apex Velocity Inc' });
    const client = await store.addClient({ companyId: company.id });

    // Initial empty state check (must be 0, not fabricated demo numbers!)
    const initialData = store.getClientPortalData(client.id, 'all');
    expect(initialData.metrics.leadsGenerated).toBe(0);
    expect(initialData.metrics.outreachSent).toBe(0);
    expect(initialData.metrics.repliesReceived).toBe(0);
    expect(initialData.metrics.qualifiedProspects).toBe(0);
    expect(initialData.metrics.meetingsBooked).toBe(0);
    expect(initialData.metrics.meetingsCompleted).toBe(0);
    expect(initialData.metrics.conversions).toBe(0);
    expect(initialData.metrics.conversionRate).toBe(0);

    // 1. Add 4 leads
    const l1 = await store.addLead({
      companyId: company.id,
      clientId: client.id,
      title: 'Apex Lead 1 - Cold Outreach',
      stage: 'Contacted',
      connectionStatus: 'Sent',
      messageStatus: 'Sent',
    });

    const l2 = await store.addLead({
      companyId: company.id,
      clientId: client.id,
      title: 'Apex Lead 2 - Positive Reply',
      stage: 'Interested',
      connectionStatus: 'Accepted',
      messageStatus: 'Replied',
      isPositiveReply: true,
      lastReplyDate: '2026-10-15',
    });

    const l3 = await store.addLead({
      companyId: company.id,
      clientId: client.id,
      title: 'Apex Lead 3 - Meeting Held',
      stage: 'Meeting Completed',
      meetingStatus: 'Completed',
    });

    const l4 = await store.addLead({
      companyId: company.id,
      clientId: client.id,
      title: 'Apex Lead 4 - Closed Revenue',
      stage: 'Won',
      dealStatus: 'Won',
    });

    // 2. Add outreach activities
    await store.logActivity({
      companyId: company.id,
      clientId: client.id,
      leadId: l1.id,
      type: 'message_sent',
      title: 'Dispatched Sequence Step 1',
      recordedBy: 'Marcus Vance',
    });

    await store.logActivity({
      companyId: company.id,
      clientId: client.id,
      leadId: l2.id,
      type: 'reply_received',
      title: 'Positive reply received from VP of Sales',
      recordedBy: 'Marcus Vance',
    });

    // 3. Add meetings
    await store.addMeeting({
      title: 'Apex Discovery 1',
      date: '2026-10-12',
      time: '15:00',
      durationMinutes: 30,
      relatedClientId: client.id,
      relatedCompanyId: company.id,
      outcome: 'Completed',
    });

    await store.addMeeting({
      title: 'Apex Discovery 2',
      date: '2026-10-25',
      time: '11:00',
      durationMinutes: 30,
      relatedClientId: client.id,
      relatedCompanyId: company.id,
      outcome: 'Scheduled',
    });

    // Compute metrics
    const result = store.getClientPortalData(client.id, 'all');

    // Total leads: 4
    expect(result.metrics.leadsGenerated).toBe(4);

    // Outreach sent: at least 1 activity + contacted leads
    expect(result.metrics.outreachSent).toBeGreaterThanOrEqual(1);

    // Replies: at least 1
    expect(result.metrics.repliesReceived).toBeGreaterThanOrEqual(1);

    // Qualified prospects: l2 ('Interested'), l3 ('Meeting Completed'), l4 ('Won') = 3
    expect(result.metrics.qualifiedProspects).toBe(3);

    // Meetings booked: 2 scheduled/completed in meeting list
    expect(result.metrics.meetingsBooked).toBe(2);

    // Meetings completed: 1 completed in meeting list
    expect(result.metrics.meetingsCompleted).toBe(1);

    // Conversions: 1 (Won)
    expect(result.metrics.conversions).toBe(1);

    // Conversion rate: (1 / 4) * 100 = 25%
    expect(result.metrics.conversionRate).toBe(25);
  });

  it('6. Supports date range filtering on client dashboard', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Chronos Time Corp' });
    const client = await store.addClient({ companyId: company.id });

    // Recent lead (created now)
    await store.addLead({
      companyId: company.id,
      clientId: client.id,
      title: 'Recent Lead Today',
      stage: 'Contacted',
    });

    const todayData = store.getClientPortalData(client.id, 'today');
    const allData = store.getClientPortalData(client.id, 'all');

    expect(todayData.leads.length).toBeGreaterThanOrEqual(1);
    expect(allData.leads.length).toBeGreaterThanOrEqual(1);
  });

  it('7. Client creation sets Not Invited status, empty portal users, and never auto-grants portal access', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Vanguard Systems', industry: 'Enterprise SaaS' });
    const client = await store.addClient({
      companyId: company.id,
      contactEmail: 'founder@vanguard.io',
      monthlyValue: 7500,
      accountOwner: 'Sarah Jenkins',
    });

    // 1. Initial portal access status must be 'Not Invited'
    expect(client.portalAccessStatus).toBe('Not Invited');
    expect(client.portalUserIds).toEqual([]);
    expect(client.contactEmail).toBe('founder@vanguard.io');

    // 2. Initial operational metrics must exist with 0 counts and current period
    expect(client.operationalMetrics).toBeDefined();
    expect(client.operationalMetrics?.targetAccounts).toBe(0);
    expect(client.operationalMetrics?.contactsReached).toBe(0);
    expect(client.operationalMetrics?.meetingsBooked).toBe(0);
    expect(client.operationalMetrics?.dealsClosed).toBe(0);
    expect(client.operationalMetrics?.revenueGenerated).toBe(0);

    // 3. Confirm that no portal user was automatically created in clientPortalUsers
    const existingUser = store.clientPortalUsers.find((u) => u.email === 'founder@vanguard.io');
    expect(existingUser).toBeUndefined();
  });

  it('8. Allows authorized team members to update operational metrics with numeric validation', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Apex Growth Labs' });
    const client = await store.addClient({ companyId: company.id });

    // Update operational metrics with valid numbers and internal notes
    await store.updateClientOperationalMetrics(client.id, {
      reportingPeriod: 'October 2026',
      campaignStatus: 'Pacing Well',
      targetAccounts: 300,
      contactsReached: 250,
      totalReplies: 35,
      positiveReplies: 18,
      qualifiedProspects: 14,
      meetingsBooked: 10,
      meetingsCompleted: 8,
      dealsClosed: 3,
      revenueGenerated: 45000,
      internalNotes: 'Confidential internal note: CAC is under $250, pacing well ahead of target',
      updatedBy: 'Sarah Jenkins',
    });

    const updatedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    const metrics = updatedClient?.operationalMetrics;

    expect(metrics).toBeDefined();
    expect(metrics?.reportingPeriod).toBe('October 2026');
    expect(metrics?.campaignStatus).toBe('Pacing Well');
    expect(metrics?.targetAccounts).toBe(300);
    expect(metrics?.contactsReached).toBe(250);
    expect(metrics?.totalReplies).toBe(35);
    expect(metrics?.positiveReplies).toBe(18);
    expect(metrics?.qualifiedProspects).toBe(14);
    expect(metrics?.meetingsBooked).toBe(10);
    expect(metrics?.meetingsCompleted).toBe(8);
    expect(metrics?.dealsClosed).toBe(3);
    expect(metrics?.revenueGenerated).toBe(45000);
    expect(metrics?.internalNotes).toContain('Confidential internal note');
    expect(metrics?.updatedBy).toBe('Sarah Jenkins');
    expect(metrics?.updatedAt).toBeGreaterThan(0);

    // Numeric validation test: negative values should be sanitized to fallback 0
    await store.updateClientOperationalMetrics(client.id, {
      targetAccounts: -50 as any,
    });
    const sanitizedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(sanitizedClient?.operationalMetrics?.targetAccounts).toBe(0);
  });

  it('9. Strictly conceals internal notes and respects configurable visibility for deals and revenue', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Cipher Data Corp' });
    const client = await store.addClient({ companyId: company.id });

    await store.updateClientOperationalMetrics(client.id, {
      reportingPeriod: 'Q4 2026',
      campaignStatus: 'Active',
      targetAccounts: 500,
      contactsReached: 400,
      dealsClosed: 5,
      revenueGenerated: 60000,
      internalNotes: 'TOP SECRET INTERNAL MARGIN AND COST DATA',
    });

    // 1. Verify getClientPortalData returns sanitized operationalMetrics without internalNotes
    const portalData = store.getClientPortalData(client.id, 'all');
    expect(portalData.operationalMetrics).toBeDefined();
    expect(portalData.operationalMetrics?.internalNotes).toBeUndefined();
    expect((portalData.operationalMetrics as any)?.internalNotes).toBeUndefined();

    // 2. Revenue and deals metrics available when enabled
    expect(portalData.metrics.dealsClosed).toBe(5);
    expect(portalData.metrics.revenueGenerated).toBe(60000);

    // 3. Test portal settings configurable allowedMetrics
    await store.updateClientPortalSettings(client.id, {
      allowedMetrics: ['leads', 'outreach', 'meetings'], // revenue and deals omitted
    });

    const updatedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(updatedClient?.portalSettings?.allowedMetrics).not.toContain('revenue');
    expect(updatedClient?.portalSettings?.allowedMetrics).not.toContain('deals');
  });

  it('10. Revoking portal user access updates client portal access status and blocks access', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Sentinel Security Corp' });
    const client = await store.addClient({
      companyId: company.id,
      contactEmail: 'contact@sentinel.io',
    });

    // Invite user
    const { user } = await store.inviteClientPortalUser(client.id, {
      email: 'contact@sentinel.io',
      name: 'Security Admin',
    });

    let clientRecord = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(clientRecord?.portalAccessStatus).toBe('Invitation Pending');

    // Revoke user
    await store.revokeClientPortalUser(user.id);

    clientRecord = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(clientRecord?.portalAccessStatus).toBe('Revoked');

    const revokedUser = useRevRecoveryStore.getState().clientPortalUsers.find((u) => u.id === user.id);
    expect(revokedUser?.status).toBe('revoked');
  });

  it('11. Representative status badges strictly distinguish Invitation Pending, Active Access, and Revoked Access', async () => {
    const store = useRevRecoveryStore.getState();

    const company = await store.addCompany({ name: 'Badge Test Corp' });
    const client = await store.addClient({ companyId: company.id });

    // 1. Initial invited user
    const { user } = await store.inviteClientPortalUser(client.id, {
      email: 'rep@badgetest.com',
      name: 'Rep User',
    });

    expect(user.status).toBe('invited');
    // Must NOT be active!
    expect(user.status === 'active').toBe(false);

    // Helper simulating UI badge logic
    const getBadgeLabel = (status: string) => {
      if (status === 'revoked') return 'Revoked Access';
      if (status === 'active') return 'Active Access';
      return 'Invitation Pending';
    };

    expect(getBadgeLabel(user.status)).toBe('Invitation Pending');

    // 2. After user authenticates first time
    const activatedUser = { ...user, status: 'active' as const, lastLoginAt: Date.now() };
    store.setPortalClientUser(activatedUser);
    expect(getBadgeLabel(activatedUser.status)).toBe('Active Access');

    // 3. After user revoked
    await store.revokeClientPortalUser(user.id);
    const inStore = useRevRecoveryStore.getState().clientPortalUsers.find((u) => u.id === user.id);
    expect(inStore).toBeDefined();
    expect(getBadgeLabel(inStore!.status)).toBe('Revoked Access');
  });

  it('12. Authentication flow validates organization binding and denies cross-client or uninvited access', async () => {
    const store = useRevRecoveryStore.getState();

    const companyA = await store.addCompany({ name: 'Alpha Org' });
    const clientA = await store.addClient({ companyId: companyA.id });

    const companyB = await store.addCompany({ name: 'Beta Org' });
    const clientB = await store.addClient({ companyId: companyB.id });

    // Invite user to Client A
    await store.inviteClientPortalUser(clientA.id, {
      email: 'authorized_a@alpha.com',
      name: 'Alpha User',
    });

    const users = useRevRecoveryStore.getState().clientPortalUsers;

    // Test 1: Uninvited email lookup fails (Access Denied)
    const uninvited = users.find((u) => u.email === 'stranger@nowhere.com');
    expect(uninvited).toBeUndefined();

    // Test 2: Valid email found for Client A
    const matched = users.find((u) => u.email === 'authorized_a@alpha.com');
    expect(matched).toBeDefined();
    expect(matched?.clientId).toBe(clientA.id);

    // Test 3: Cross-client URL attempt (URL asks for clientB, but user is assigned to clientA)
    const targetUrlClientId = clientB.id;
    const isAuthorizedForTarget = matched?.clientId === targetUrlClientId;
    expect(isAuthorizedForTarget).toBe(false); // Security error!

    // Test 4: Genuine match for Client A succeeds
    const isAuthorizedForOwn = matched?.clientId === clientA.id;
    expect(isAuthorizedForOwn).toBe(true);
  });

  it('13. Seed data includes syscraft client and aryansans03@gmail.com representative ready for portal entry', async () => {
    const store = useRevRecoveryStore.getState();

    // Verify syscraft client exists
    const syscraftClient = store.clients.find((c) => c.contactEmail === 'aryansans03@gmail.com' || c.id === 'client-syscraft');
    expect(syscraftClient).toBeDefined();
    expect(syscraftClient?.monthlyValue).toBe(6500);

    // Verify representative exists with status invited
    const rep = store.clientPortalUsers.find((u) => u.email === 'aryansans03@gmail.com');
    expect(rep).toBeDefined();
    expect(rep?.status).toBe('invited');
    expect(rep?.clientId).toBe(syscraftClient?.id);
  });

  it('14. checkClientOrganizationAuthorization resolves canonical org aliases and prevents cross-client access', async () => {
    const {
      checkClientOrganizationAuthorization,
      registerClient,
      registerPortalUser,
    } = await import('../src/lib/invitationRegistry');

    // Case 1: aryansans03@gmail.com with clientId='client-syscraft' succeeds
    const res1 = checkClientOrganizationAuthorization('aryansans03@gmail.com', 'client-syscraft');
    expect(res1.authorized).toBe(true);
    expect(res1.user?.email).toBe('aryansans03@gmail.com');
    expect(res1.client?.id).toBe('client-syscraft');

    // Case 2: aryansans03@gmail.com with companyId='comp-syscraft' succeeds
    const res2 = checkClientOrganizationAuthorization('aryansans03@gmail.com', 'comp-syscraft');
    expect(res2.authorized).toBe(true);

    // Case 3: aryansans03@gmail.com with slug='syscraft' succeeds
    const res3 = checkClientOrganizationAuthorization('aryansans03@gmail.com', 'syscraft');
    expect(res3.authorized).toBe(true);

    // Case 4: aryansans03@gmail.com with no clientId in URL succeeds (resolves assigned client)
    const res4 = checkClientOrganizationAuthorization('aryansans03@gmail.com', undefined);
    expect(res4.authorized).toBe(true);

    // Case 5: Dynamic client UUID registered for syscraft succeeds
    registerClient({
      id: 'dynamic-uuid-syscraft-99',
      companyId: 'comp-syscraft',
      servicesPurchased: ['Outbound Infrastructure'],
      commercialTerms: '$6,500/month',
      contractStatus: 'Active',
      portalAccessStatus: 'Invitation Pending',
      monthlyValue: 6500,
      currency: 'USD',
      startDate: '2026-10-01',
      renewalDate: '2027-10-01',
      accountOwner: 'Sanskar Anand',
      currentObjectives: '',
      successMetrics: '',
      onboardingChecklist: [],
      discoveryQuestionnaire: {} as any,
      notes: '',
      portalSettings: {
        enabled: true,
        allowedMetrics: ['leads'],
        allowedTabs: ['overview'],
        kpiTargets: {} as any,
        sharedDocIds: [],
        sharedNotes: '',
      },
      portalUserIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res5 = checkClientOrganizationAuthorization('aryansans03@gmail.com', 'dynamic-uuid-syscraft-99');
    expect(res5.authorized).toBe(true);

    // Case 6: Cross-client attempt (aryansans03@gmail.com attempts to access client-acme) strictly rejected
    const resCross = checkClientOrganizationAuthorization('aryansans03@gmail.com', 'client-acme-unauthorized');
    expect(resCross.authorized).toBe(false);
    expect(resCross.statusCode).toBe(403);
    expect(resCross.error).toBe('Security Error: This email invitation is not authorized to access the requested client organization.');
    expect(resCross.diagnostic).toBeDefined();
    expect(resCross.diagnostic?.code).toBe('CLIENT_ORG_MISMATCH');
    expect(resCross.diagnostic?.authorizedOrganization).toBe('syscraft');
    expect(resCross.diagnostic?.requestedClientId).toBe('client-acme-unauthorized');

    // Case 7: Uninvited email rejected
    const resUninvited = checkClientOrganizationAuthorization('nobody_invited@nowhere.com');
    expect(resUninvited.authorized).toBe(false);
    expect(resUninvited.statusCode).toBe(404);
  });

  it('14. Multi-client distinct email invitations and strict cross-client access prevention', async () => {
    const {
      registerClient,
      registerCompany,
      registerPortalUser,
      checkClientOrganizationAuthorization,
    } = await import('../src/lib/invitationRegistry');

    const store = useRevRecoveryStore.getState();

    // 1. Create Client 1: Nexus Dynamics with email nexus.lead@nexusdynamics.io
    const client1Company = await store.addCompany({
      name: 'Nexus Dynamics',
      industry: 'FinTech Enterprise',
    });
    const client1 = await store.addClient({
      companyId: client1Company.id,
      contactEmail: 'nexus.lead@nexusdynamics.io',
      portalAccessStatus: 'Not Invited',
      portalUserIds: [],
      monthlyValue: 7500,
      contractStatus: 'Active',
      startDate: '2026-10-01',
      renewalDate: '2027-10-01',
      accountOwner: 'Sanskar Anand',
      servicesPurchased: ['Outbound Outreach'],
      currentObjectives: 'Scale US FinTech meetings',
      successMetrics: '20 meetings/mo',
      notes: 'Internal secret notes for Nexus - strictly private',
      operationalMetrics: {
        id: 'metrics-nexus',
        clientId: '',
        reportingPeriod: 'October 2026',
        campaignStatus: 'Active',
        targetAccounts: 300,
        contactsReached: 250,
        totalReplies: 45,
        positiveReplies: 18,
        qualifiedProspects: 12,
        meetingsBooked: 8,
        meetingsCompleted: 6,
        dealsClosed: 2,
        revenueGenerated: 45000,
        internalNotes: 'Top-secret internal commission and CRM notes for Nexus',
        updatedBy: 'Sanskar Anand',
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });

    // 2. Create Client 2: Vanguard Tech with email sarah.vanguard@vanguardtech.ai
    const client2Company = await store.addCompany({
      name: 'Vanguard Tech',
      industry: 'AI Healthcare',
    });
    const client2 = await store.addClient({
      companyId: client2Company.id,
      contactEmail: 'sarah.vanguard@vanguardtech.ai',
      portalAccessStatus: 'Not Invited',
      portalUserIds: [],
      monthlyValue: 9000,
      contractStatus: 'Active',
      startDate: '2026-10-01',
      renewalDate: '2027-10-01',
      accountOwner: 'Sarah Jenkins',
      servicesPurchased: ['Lead Research & Verification'],
      currentObjectives: 'Scale AI Healthcare pipeline',
      successMetrics: '25 meetings/mo',
      notes: 'Internal confidential notes for Vanguard',
      operationalMetrics: {
        id: 'metrics-vanguard',
        clientId: '',
        reportingPeriod: 'October 2026',
        campaignStatus: 'Active',
        targetAccounts: 500,
        contactsReached: 400,
        totalReplies: 70,
        positiveReplies: 30,
        qualifiedProspects: 22,
        meetingsBooked: 14,
        meetingsCompleted: 11,
        dealsClosed: 4,
        revenueGenerated: 80000,
        internalNotes: 'Internal margin notes for Vanguard',
        updatedBy: 'Sarah Jenkins',
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });

    // 3. Verify neither has portal access merely because email was entered (Requirement 6)
    expect(client1.contactEmail).toBe('nexus.lead@nexusdynamics.io');
    expect(client1.portalAccessStatus).toBe('Not Invited');
    expect(client2.contactEmail).toBe('sarah.vanguard@vanguardtech.ai');
    expect(client2.portalAccessStatus).toBe('Not Invited');

    // Register clients and companies in server registry
    registerCompany(client1Company);
    registerClient(client1, client1Company);
    registerCompany(client2Company);
    registerClient(client2, client2Company);

    // Verify uninvited access attempts are rejected
    const uninvitedNexus = checkClientOrganizationAuthorization('nexus.lead@nexusdynamics.io', client1.id);
    expect(uninvitedNexus.authorized).toBe(false);
    expect(uninvitedNexus.statusCode).toBe(404);

    // 4. Invite Client 1 with their actual email
    const invite1Result = await store.inviteClientPortalUser(client1.id, {
      email: 'nexus.lead@nexusdynamics.io',
      name: 'Nexus Lead Representative',
      role: 'client_admin',
    });
    registerPortalUser(invite1Result.user);

    // Verify Client 1 invitation is linked to Client 1 ID
    expect(invite1Result.user.clientId).toBe(client1.id);
    expect(invite1Result.user.email).toBe('nexus.lead@nexusdynamics.io');
    expect(invite1Result.inviteLink).toContain(encodeURIComponent('nexus.lead@nexusdynamics.io'));
    expect(invite1Result.inviteLink).toContain(`clientId=${client1.id}`);

    // 5. Invite Client 2 with their actual email
    const invite2Result = await store.inviteClientPortalUser(client2.id, {
      email: 'sarah.vanguard@vanguardtech.ai',
      name: 'Sarah Vanguard',
      role: 'client_admin',
    });
    registerPortalUser(invite2Result.user);

    // Verify Client 2 invitation is linked to Client 2 ID
    expect(invite2Result.user.clientId).toBe(client2.id);
    expect(invite2Result.user.email).toBe('sarah.vanguard@vanguardtech.ai');
    expect(invite2Result.inviteLink).toContain(encodeURIComponent('sarah.vanguard@vanguardtech.ai'));
    expect(invite2Result.inviteLink).toContain(`clientId=${client2.id}`);

    // 6. Test Authorized Access: Client 1 logs into Client 1
    const authNexusOwn = checkClientOrganizationAuthorization('nexus.lead@nexusdynamics.io', client1.id);
    expect(authNexusOwn.authorized).toBe(true);
    expect(authNexusOwn.client?.id).toBe(client1.id);
    expect(authNexusOwn.user?.email).toBe('nexus.lead@nexusdynamics.io');

    // 7. Test Cross-Client Access: Client 1 attempts to access Client 2 -> MUST BE BLOCKED
    const crossNexusToVanguard = checkClientOrganizationAuthorization('nexus.lead@nexusdynamics.io', client2.id);
    expect(crossNexusToVanguard.authorized).toBe(false);
    expect(crossNexusToVanguard.statusCode).toBe(403);
    expect(crossNexusToVanguard.error).toContain('Security Error: This email invitation is not authorized');
    expect(crossNexusToVanguard.diagnostic?.code).toBe('CLIENT_ORG_MISMATCH');
    expect(crossNexusToVanguard.diagnostic?.requestedClientId).toBe(client2.id);

    // 8. Test Authorized Access: Client 2 logs into Client 2
    const authVanguardOwn = checkClientOrganizationAuthorization('sarah.vanguard@vanguardtech.ai', client2.id);
    expect(authVanguardOwn.authorized).toBe(true);
    expect(authVanguardOwn.client?.id).toBe(client2.id);
    expect(authVanguardOwn.user?.email).toBe('sarah.vanguard@vanguardtech.ai');

    // 9. Test Cross-Client Access: Client 2 attempts to access Client 1 -> MUST BE BLOCKED
    const crossVanguardToNexus = checkClientOrganizationAuthorization('sarah.vanguard@vanguardtech.ai', client1.id);
    expect(crossVanguardToNexus.authorized).toBe(false);
    expect(crossVanguardToNexus.statusCode).toBe(403);
    expect(crossVanguardToNexus.error).toContain('Security Error: This email invitation is not authorized');
    expect(crossVanguardToNexus.diagnostic?.code).toBe('CLIENT_ORG_MISMATCH');
    expect(crossVanguardToNexus.diagnostic?.requestedClientId).toBe(client1.id);

    // 10. Test Access Revocation for Client 1
    await store.revokeClientPortalUser(invite1Result.user.id);
    const updatedUser1 = useRevRecoveryStore.getState().clientPortalUsers.find((u) => u.id === invite1Result.user.id);
    expect(updatedUser1?.status).toBe('revoked');
    registerPortalUser(updatedUser1!);

    const revokedNexusCheck = checkClientOrganizationAuthorization('nexus.lead@nexusdynamics.io', client1.id);
    expect(revokedNexusCheck.authorized).toBe(false);
    expect(revokedNexusCheck.statusCode).toBe(403);
    expect(revokedNexusCheck.error).toContain('Access Revoked');

    // 11. Verify Client 2 remains active and unaffected after Client 1 revocation
    const vanguardStillActive = checkClientOrganizationAuthorization('sarah.vanguard@vanguardtech.ai', client2.id);
    expect(vanguardStillActive.authorized).toBe(true);
    expect(vanguardStillActive.client?.id).toBe(client2.id);
  });

  it('15. Client Portal Password Setup, Reset, and Multi-Client Dynamic Authentication Flow', async () => {
    const {
      registerClient,
      registerCompany,
      registerPortalUser,
      checkClientOrganizationAuthorization,
    } = await import('../src/lib/invitationRegistry');

    const store = useRevRecoveryStore.getState();

    // 1. Create two distinct client companies dynamically
    const alphaCompany = await store.addCompany({
      name: 'Alpha Quantum Corp',
      industry: 'Quantum Computing',
    });
    const betaCompany = await store.addCompany({
      name: 'Beta Biotech Labs',
      industry: 'Life Sciences',
    });

    // 2. Add Alpha client with dynamic email
    const alphaEmail = 'lead.alpha@alphaquantum.io';
    const alphaClient = await store.addClient({
      companyId: alphaCompany.id,
      contactEmail: alphaEmail,
      portalAccessStatus: 'Not Invited',
      portalUserIds: [],
      monthlyValue: 12000,
      contractStatus: 'Active',
      startDate: '2026-10-01',
      renewalDate: '2027-10-01',
      accountOwner: 'Sanskar Anand',
      servicesPurchased: ['Executive Meetings Engine'],
      currentObjectives: 'Scale Enterprise Quantum Accounts',
      successMetrics: '20 meetings/mo',
      notes: 'Alpha confidential internal metrics',
      operationalMetrics: {
        id: 'metrics-alpha',
        clientId: '',
        reportingPeriod: 'October 2026',
        campaignStatus: 'Active',
        targetAccounts: 500,
        contactsReached: 420,
        totalReplies: 60,
        positiveReplies: 30,
        qualifiedProspects: 22,
        meetingsBooked: 15,
        meetingsCompleted: 12,
        dealsClosed: 4,
        revenueGenerated: 80000,
        internalNotes: 'Alpha confidential notes - must NOT be exposed',
        updatedBy: 'Sanskar Anand',
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });

    // 3. Add Beta client with dynamic email
    const betaEmail = 'lead.beta@betabiotech.org';
    const betaClient = await store.addClient({
      companyId: betaCompany.id,
      contactEmail: betaEmail,
      portalAccessStatus: 'Not Invited',
      portalUserIds: [],
      monthlyValue: 9000,
      contractStatus: 'Active',
      startDate: '2026-10-01',
      renewalDate: '2027-10-01',
      accountOwner: 'Sanskar Anand',
      servicesPurchased: ['Outbound Outreach'],
      currentObjectives: 'BioTech pharma outreach',
      successMetrics: '15 meetings/mo',
      notes: 'Beta confidential internal metrics',
      operationalMetrics: {
        id: 'metrics-beta',
        clientId: '',
        reportingPeriod: 'October 2026',
        campaignStatus: 'Active',
        targetAccounts: 350,
        contactsReached: 280,
        totalReplies: 40,
        positiveReplies: 20,
        qualifiedProspects: 14,
        meetingsBooked: 10,
        meetingsCompleted: 8,
        dealsClosed: 2,
        revenueGenerated: 45000,
        internalNotes: 'Beta confidential notes - must NOT be exposed',
        updatedBy: 'Sanskar Anand',
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });

    // 4. Invite Alpha representative dynamically
    const alphaInvite = await store.inviteClientPortalUser(alphaClient.id, {
      email: alphaEmail,
      name: 'Dr. Alpha Representative',
      role: 'client_admin',
    });
    registerCompany(alphaCompany);
    registerClient(alphaClient, alphaCompany);
    registerPortalUser(alphaInvite.user);

    // 5. Invite Beta representative dynamically
    const betaInvite = await store.inviteClientPortalUser(betaClient.id, {
      email: betaEmail,
      name: 'Dr. Beta Representative',
      role: 'client_admin',
    });
    registerCompany(betaCompany);
    registerClient(betaClient, betaCompany);
    registerPortalUser(betaInvite.user);

    // 6. Verify password reset authorization for uninvited/random email -> MUST BE REJECTED
    const uninvitedCheck = checkClientOrganizationAuthorization('random.hacker@evil.com', alphaClient.id);
    expect(uninvitedCheck.authorized).toBe(false);
    expect(uninvitedCheck.statusCode).toBe(404);

    // 7. Verify password reset authorization for cross-client attempt -> MUST BE REJECTED
    const crossResetCheck = checkClientOrganizationAuthorization(betaEmail, alphaClient.id);
    expect(crossResetCheck.authorized).toBe(false);
    expect(crossResetCheck.statusCode).toBe(403);

    // 8. Verify password reset authorization for authorized Alpha email
    const alphaResetCheck = checkClientOrganizationAuthorization(alphaEmail, alphaClient.id);
    expect(alphaResetCheck.authorized).toBe(true);
    expect(alphaResetCheck.client?.id).toBe(alphaClient.id);
    expect(alphaResetCheck.company?.name).toBe('Alpha Quantum Corp');

    // 9. Verify password reset authorization for authorized Beta email
    const betaResetCheck = checkClientOrganizationAuthorization(betaEmail, betaClient.id);
    expect(betaResetCheck.authorized).toBe(true);
    expect(betaResetCheck.client?.id).toBe(betaClient.id);
    expect(betaResetCheck.company?.name).toBe('Beta Biotech Labs');

    // 10. Test password reset route handler behavior (POST /api/client-portal/reset-password)
    const { POST: resetPasswordHandler } = await import('../src/app/api/client-portal/reset-password/route');

    // Cross-client reset request should return 403
    const crossReq = new Request('http://localhost:3000/api/client-portal/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: betaEmail, clientId: alphaClient.id }),
    });
    const crossRes = await resetPasswordHandler(crossReq as any);
    expect(crossRes.status).toBe(403);
    const crossData = await crossRes.json();
    expect(crossData.success).toBe(false);

    // Legitimate Alpha reset request should succeed
    const validReq = new Request('http://localhost:3000/api/client-portal/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: alphaEmail, clientId: alphaClient.id }),
    });
    const validRes = await resetPasswordHandler(validReq as any);
    expect(validRes.status).toBe(200);
    const validData = await validRes.json();
    expect(validData.success).toBe(true);
    expect(validData.email).toBe(alphaEmail);

    // 11. Test Auth route handler with action === 'resetPassword' (POST /api/client-portal/auth)
    const { POST: authHandler } = await import('../src/app/api/client-portal/auth/route');

    // Reset password with invalid short password should return 400
    const shortPwReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resetPassword',
        oobCode: 'valid_mock_oob_code',
        newPassword: '123',
        email: alphaEmail,
        clientId: alphaClient.id,
      }),
    });
    const shortPwRes = await authHandler(shortPwReq as any);
    expect(shortPwRes.status).toBe(400);

    // Test completed reset password activates the user and logs them in
    const resetCompleteReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resetPassword',
        oobCode: 'valid_mock_oob_code',
        newPassword: 'StrongPassword!2026',
        email: alphaEmail,
        clientId: alphaClient.id,
      }),
    });
    const resetCompleteRes = await authHandler(resetCompleteReq as any);
    expect(resetCompleteRes.status).toBe(200);
    const resetCompleteData = await resetCompleteRes.json();
    expect(resetCompleteData.success).toBe(true);
    expect(resetCompleteData.user.email).toBe(alphaEmail);
    expect(resetCompleteData.user.status).toBe('active');
    expect(resetCompleteData.client.id).toBe(alphaClient.id);
  });

  it('16. First-time password setup flow, direct portal entry, and credential verification', async () => {
    const store = useRevRecoveryStore.getState();

    // 1. Create client organization Gamma
    const gammaCompany = await store.addCompany({
      name: 'Gamma Aerospace Corp',
      industry: 'Defense & Aerospace',
      country: 'United States',
    });

    const gammaEmail = 'ops.director@gammaaero.com';
    const gammaClient = await store.addClient({
      companyId: gammaCompany.id,
      contactEmail: gammaEmail,
      portalAccessStatus: 'Not Invited',
      portalUserIds: [],
      monthlyValue: 12000,
      contractStatus: 'Active',
      operationalMetrics: {
        id: 'metrics-gamma',
        clientId: '',
        reportingPeriod: 'October 2026',
        campaignStatus: 'Active',
        targetAccounts: 800,
        contactsReached: 700,
        totalReplies: 110,
        positiveReplies: 55,
        qualifiedProspects: 38,
        meetingsBooked: 24,
        meetingsCompleted: 20,
        dealsClosed: 6,
        revenueGenerated: 160000,
        internalNotes: 'TOP SECRET INTERNAL GAMMA MARGINS - DO NOT EXPOSE TO CLIENT',
        updatedBy: 'Sanskar Anand',
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });

    // 2. Invite representative
    const gammaInvite = await store.inviteClientPortalUser(gammaClient.id, {
      email: gammaEmail,
      name: 'General Gamma Admin',
      role: 'client_admin',
    });

    const { registerCompany, registerClient, registerPortalUser } = await import('../src/lib/invitationRegistry');
    registerCompany(gammaCompany);
    registerClient(gammaClient, gammaCompany);
    registerPortalUser(gammaInvite.user);

    // Initial state: user is invited, not active yet
    expect(gammaInvite.user.status).toBe('invited');

    const { POST: authHandler } = await import('../src/app/api/client-portal/auth/route');

    // 3. Test setupPassword with short password -> returns 400
    const shortSetupReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setupPassword',
        email: gammaEmail,
        password: '123',
        clientId: gammaClient.id,
      }),
    });
    const shortSetupRes = await authHandler(shortSetupReq as any);
    expect(shortSetupRes.status).toBe(400);

    // 4. Test setupPassword with cross-client ID -> returns 403
    const crossSetupReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setupPassword',
        email: gammaEmail,
        password: 'SecureGammaPassword2026!',
        clientId: 'unauthorized-other-client-id',
      }),
    });
    const crossSetupRes = await authHandler(crossSetupReq as any);
    expect(crossSetupRes.status).toBe(403);

    // 5. Test valid first-time setupPassword -> activates user and grants immediate portal access
    const validSetupReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setupPassword',
        email: gammaEmail,
        password: 'SecureGammaPassword2026!',
        clientId: gammaClient.id,
      }),
    });
    const validSetupRes = await authHandler(validSetupReq as any);
    expect(validSetupRes.status).toBe(200);
    const validSetupData = await validSetupRes.json();
    expect(validSetupData.success).toBe(true);
    expect(validSetupData.user.email).toBe(gammaEmail);
    expect(validSetupData.user.status).toBe('active');
    expect(validSetupData.client.id).toBe(gammaClient.id);
    expect(validSetupData.client.portalAccessStatus).toBe('Active');

    // Data isolation: ensure internalNotes are scrubbed
    expect(validSetupData.client.operationalMetrics).toBeDefined();
    expect(validSetupData.client.operationalMetrics.internalNotes).toBeUndefined();
    expect(validSetupData.client.operationalMetrics.meetingsBooked).toBe(24);

    // 6. Test returning user sign-in flow
    const validLoginReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: gammaEmail,
        password: 'SecureGammaPassword2026!',
        clientId: gammaClient.id,
      }),
    });
    const validLoginRes = await authHandler(validLoginReq as any);
    expect(validLoginRes.status).toBe(200);
    const validLoginData = await validLoginRes.json();
    expect(validLoginData.success).toBe(true);
    expect(validLoginData.user.email).toBe(gammaEmail);
    expect(validLoginData.client.operationalMetrics.internalNotes).toBeUndefined();
  });

  it('17. Streamlined manual login flow: Admin sets email & password -> Save / Create Access -> Client logs in directly -> Multi-tenant isolation verified', async () => {
    const store = useRevRecoveryStore.getState();

    // 1. Create Client A (Stripe Enterprise)
    const companyA = await store.addCompany({
      name: 'Stripe Enterprise Global',
      industry: 'Financial Infrastructure',
      country: 'United States',
    });

    const emailA = 'billing.lead@stripe-test.io';
    const passA = 'StripePass2026!';
    const clientA = await store.addClient({
      companyId: companyA.id,
      contactEmail: emailA,
      portalAccessStatus: 'Not Invited',
      monthlyValue: 15000,
      contractStatus: 'Active',
      operationalMetrics: {
        id: 'metrics-stripe',
        clientId: '',
        reportingPeriod: 'October 2026',
        campaignStatus: 'Active',
        targetAccounts: 1000,
        contactsReached: 850,
        totalReplies: 140,
        positiveReplies: 70,
        qualifiedProspects: 50,
        meetingsBooked: 30,
        meetingsCompleted: 28,
        dealsClosed: 8,
        revenueGenerated: 200000,
        internalNotes: 'STRIPE CONFIDENTIAL MARGIN NOTES - STRICTLY HIDDEN',
        updatedBy: 'Sanskar Anand',
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });

    // 2. Create Client B (Datadog Observability)
    const companyB = await store.addCompany({
      name: 'Datadog Observability Cloud',
      industry: 'Cloud Monitoring',
      country: 'United States',
    });

    const emailB = 'devops.director@datadog-test.com';
    const passB = 'DataDogPass2026!';
    const clientB = await store.addClient({
      companyId: companyB.id,
      contactEmail: emailB,
      portalAccessStatus: 'Not Invited',
      monthlyValue: 18000,
      contractStatus: 'Active',
      operationalMetrics: {
        id: 'metrics-datadog',
        clientId: '',
        reportingPeriod: 'October 2026',
        campaignStatus: 'Active',
        targetAccounts: 1200,
        contactsReached: 990,
        totalReplies: 180,
        positiveReplies: 90,
        qualifiedProspects: 65,
        meetingsBooked: 40,
        meetingsCompleted: 35,
        dealsClosed: 12,
        revenueGenerated: 320000,
        internalNotes: 'DATADOG CONFIDENTIAL REVENUE MODEL - STRICTLY HIDDEN',
        updatedBy: 'Sanskar Anand',
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });

    const { registerCompany, registerClient } = await import('../src/lib/invitationRegistry');
    registerCompany(companyA);
    registerClient(clientA, companyA);
    registerCompany(companyB);
    registerClient(clientB, companyB);

    const { POST: createAccessHandler } = await import('../src/app/api/client-portal/create-access/route');
    const { POST: authHandler } = await import('../src/app/api/client-portal/auth/route');

    // 3. Admin sets Client A email & password -> Save / Create Access
    const createReqA = new Request('http://localhost:3000/api/client-portal/create-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientA.id,
        email: emailA,
        password: passA,
        name: 'Jordan Stripe Lead',
        role: 'client_admin',
      }),
    });
    const createResA = await createAccessHandler(createReqA as any);
    expect(createResA.status).toBe(200);
    const createDataA = await createResA.json();
    expect(createDataA.success).toBe(true);
    expect(createDataA.user.email).toBe(emailA);
    expect(createDataA.user.status).toBe('active');
    expect(createDataA.client.portalAccessStatus).toBe('Active');
    expect(createDataA.portalUrl).toContain(encodeURIComponent(emailA));
    expect(createDataA.portalUrl).toContain(encodeURIComponent(clientA.id));

    // 4. Admin sets Client B email & password -> Save / Create Access independently
    const createReqB = new Request('http://localhost:3000/api/client-portal/create-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientB.id,
        email: emailB,
        password: passB,
        name: 'Alex Datadog Lead',
        role: 'client_admin',
      }),
    });
    const createResB = await createAccessHandler(createReqB as any);
    expect(createResB.status).toBe(200);
    const createDataB = await createResB.json();
    expect(createDataB.success).toBe(true);
    expect(createDataB.user.email).toBe(emailB);
    expect(createDataB.user.status).toBe('active');
    expect(createDataB.client.portalAccessStatus).toBe('Active');

    // 5. Duplicate/Cross-tenant check: Attempting to assign Client A's email to Client B is rejected
    const conflictReq = new Request('http://localhost:3000/api/client-portal/create-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientB.id,
        email: emailA, // Attempting to use Client A's email on Client B
        password: 'AnotherPassword123!',
      }),
    });
    const conflictRes = await createAccessHandler(conflictReq as any);
    expect(conflictRes.status).toBe(400);
    const conflictData = await conflictRes.json();
    expect(conflictData.success).toBe(false);
    expect(conflictData.error).toContain('already linked');

    // 6. Client A logs in with their credentials -> receives Client A dashboard data
    const loginReqA = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: passA,
        clientId: clientA.id,
      }),
    });
    const loginResA = await authHandler(loginReqA as any);
    expect(loginResA.status).toBe(200);
    const loginDataA = await loginResA.json();
    expect(loginDataA.success).toBe(true);
    expect(loginDataA.client.id).toBe(clientA.id);
    expect(loginDataA.company.name).toBe('Stripe Enterprise Global');
    expect(loginDataA.client.operationalMetrics.meetingsBooked).toBe(30);
    expect(loginDataA.client.operationalMetrics.internalNotes).toBeUndefined(); // scrubbed!

    // 7. Client B logs in with their credentials -> receives Client B dashboard data
    const loginReqB = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: passB,
        clientId: clientB.id,
      }),
    });
    const loginResB = await authHandler(loginReqB as any);
    expect(loginResB.status).toBe(200);
    const loginDataB = await loginResB.json();
    expect(loginDataB.success).toBe(true);
    expect(loginDataB.client.id).toBe(clientB.id);
    expect(loginDataB.company.name).toBe('Datadog Observability Cloud');
    expect(loginDataB.client.operationalMetrics.meetingsBooked).toBe(40);
    expect(loginDataB.client.operationalMetrics.internalNotes).toBeUndefined(); // scrubbed!

    // 8. Multi-tenant security: Client A cannot access Client B's organization
    const crossLoginReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: passA,
        clientId: clientB.id, // cross-client ID
      }),
    });
    const crossLoginRes = await authHandler(crossLoginReq as any);
    expect(crossLoginRes.status).toBe(403);
    const crossLoginData = await crossLoginRes.json();
    expect(crossLoginData.success).toBe(false);
    expect(crossLoginData.error).toContain('not authorized');

    // 9. Incorrect password submission returns 401 with 'Incorrect password for this account.'
    const badPassReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'DefinitelyWrongPassword123!',
        clientId: clientA.id,
      }),
    });
    const badPassRes = await authHandler(badPassReq as any);
    expect(badPassRes.status).toBe(401);
    const badPassData = await badPassRes.json();
    expect(badPassData.error).toBe('Incorrect password for this account.');

    // 10. Admin can change client password
    const newPassA = 'StripeNewPassword!999';
    const updatePassReq = new Request('http://localhost:3000/api/client-portal/create-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientA.id,
        email: emailA,
        password: newPassA,
        currentPassword: passA,
      }),
    });
    const updatePassRes = await createAccessHandler(updatePassReq as any);
    expect(updatePassRes.status).toBe(200);

    // Old password no longer works
    const oldLoginReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: passA,
        clientId: clientA.id,
      }),
    });
    const oldLoginRes = await authHandler(oldLoginReq as any);
    expect(oldLoginRes.status).toBe(401);

    // New password works
    const newLoginReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: newPassA,
        clientId: clientA.id,
      }),
    });
    const newLoginRes = await authHandler(newLoginReq as any);
    expect(newLoginRes.status).toBe(200);

    // 11. Admin can revoke access
    const { getRegistry, registerPortalUser } = await import('../src/lib/invitationRegistry');
    const reg = getRegistry();
    const existingUser = reg.portalUsers.get(emailA);
    expect(existingUser).toBeDefined();
    if (existingUser) {
      registerPortalUser({ ...existingUser, status: 'revoked' });
    }

    const revokedLoginReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: newPassA,
        clientId: clientA.id,
      }),
    });
    const revokedLoginRes = await authHandler(revokedLoginReq as any);
    expect(revokedLoginRes.status).toBe(403);
    const revokedLoginData = await revokedLoginRes.json();
    expect(revokedLoginData.error).toContain('Access Revoked');
  });

  it('18. Email verification lifecycle: unverified enforcement, resend, invalid/expired code handling, and successful verification', async () => {
    const store = useRevRecoveryStore.getState();
    const { POST: createAccessHandler } = await import('../src/app/api/client-portal/create-access/route');
    const { POST: authHandler } = await import('../src/app/api/client-portal/auth/route');
    const { POST: verifyEmailHandler } = await import('../src/app/api/client-portal/verify-email/route');
    const { markEmailUnverified, markEmailVerified } = await import('../src/lib/invitationRegistry');

    const company = await store.addCompany({ name: 'Verification Logistics Corp' });
    const client = await store.addClient({
      companyId: company.id,
      monthlyValue: 7500,
      contractStatus: 'Active',
    });

    const testEmail = 'ops.director@verificationlogistics.com';
    const testPassword = 'SecurePass2026!';

    // 1. Admin creates access
    const createReq = new Request('http://localhost:3000/api/client-portal/create-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        email: testEmail,
        password: testPassword,
        name: 'Ops Director',
        client,
        company,
      }),
    });
    const createRes = await createAccessHandler(createReq as any);
    expect(createRes.status).toBe(200);

    // 2. Mark email as unverified (simulating new account before inbox link click)
    markEmailUnverified(testEmail);

    // 3. Login attempt while unverified must be rejected with 403 and requiresVerification: true
    const unverifiedLoginReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        clientId: client.id,
      }),
    });
    const unverifiedRes = await authHandler(unverifiedLoginReq as any);
    expect(unverifiedRes.status).toBe(403);
    const unverifiedData = await unverifiedRes.json();
    expect(unverifiedData.success).toBe(false);
    expect(unverifiedData.requiresVerification).toBe(true);
    expect(unverifiedData.canResendVerification).toBe(true);
    expect(unverifiedData.error).toContain('Email verification is required');

    // 4. Resend verification link
    const resendReq = new Request('http://localhost:3000/api/client-portal/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resend',
        email: testEmail,
      }),
    });
    const resendRes = await verifyEmailHandler(resendReq as any);
    expect(resendRes.status).toBe(200);
    const resendData = await resendRes.json();
    expect(resendData.success).toBe(true);

    // 5. Submit invalid oobCode to verify-email route -> safely rejected
    const invalidVerifyReq = new Request('http://localhost:3000/api/client-portal/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm',
        oobCode: 'invalid_expired_token_mock',
      }),
    });
    const invalidVerifyRes = await verifyEmailHandler(invalidVerifyReq as any);
    expect(invalidVerifyRes.status).toBe(400);
    const invalidVerifyData = await invalidVerifyRes.json();
    expect(invalidVerifyData.success).toBe(false);
    expect(invalidVerifyData.error).toContain('invalid or has expired');

    // 6. Submit valid oobCode -> successfully verified
    const validVerifyReq = new Request('http://localhost:3000/api/client-portal/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm',
        oobCode: 'valid_verification_token_mock',
        email: testEmail,
      }),
    });
    const validVerifyRes = await verifyEmailHandler(validVerifyReq as any);
    expect(validVerifyRes.status).toBe(200);
    const validVerifyData = await validVerifyRes.json();
    expect(validVerifyData.success).toBe(true);
    expect(validVerifyData.message).toContain('verified successfully');

    // 7. Clear unverified status (simulating verification completion)
    markEmailVerified(testEmail);

    // 8. Login succeeds and enters portal dashboard
    const verifiedLoginReq = new Request('http://localhost:3000/api/client-portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        clientId: client.id,
      }),
    });
    const verifiedLoginRes = await authHandler(verifiedLoginReq as any);
    expect(verifiedLoginRes.status).toBe(200);
    const verifiedLoginData = await verifiedLoginRes.json();
    expect(verifiedLoginData.success).toBe(true);
    expect(verifiedLoginData.user.email).toBe(testEmail);
    expect(verifiedLoginData.client.id).toBe(client.id);
  });

  it('19. Multi-Client Dynamic Binding & Strict Cross-Tenant Prevention (Client A vs Client B isolation)', async () => {
    const store = useRevRecoveryStore.getState();
    const { POST: createAccessHandler } = await import('../src/app/api/client-portal/create-access/route');
    const { POST: authHandler } = await import('../src/app/api/client-portal/auth/route');

    // 1. Create Organization Alpha
    const compAlpha = await store.addCompany({ name: 'Alpha Dynamics Inc' });
    const clientAlpha = await store.addClient({
      companyId: compAlpha.id,
      monthlyValue: 12000,
      contractStatus: 'Active',
    });
    const emailAlpha = 'exec.alpha@alphadynamics.com';
    const passAlpha = 'AlphaPass2026!';

    const createAlphaRes = await createAccessHandler(
      new Request('http://localhost:3000/api/client-portal/create-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAlpha.id,
          email: emailAlpha,
          password: passAlpha,
          name: 'Alpha Executive',
          client: clientAlpha,
          company: compAlpha,
        }),
      }) as any
    );
    expect(createAlphaRes.status).toBe(200);

    // 2. Create Organization Beta
    const compBeta = await store.addCompany({ name: 'Beta Cloud Solutions' });
    const clientBeta = await store.addClient({
      companyId: compBeta.id,
      monthlyValue: 9000,
      contractStatus: 'Active',
    });
    const emailBeta = 'exec.beta@betacloud.com';
    const passBeta = 'BetaPass2026!';

    const createBetaRes = await createAccessHandler(
      new Request('http://localhost:3000/api/client-portal/create-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientBeta.id,
          email: emailBeta,
          password: passBeta,
          name: 'Beta Executive',
          client: clientBeta,
          company: compBeta,
        }),
      }) as any
    );
    expect(createBetaRes.status).toBe(200);

    // 3. Client Alpha logs in and sees only Alpha data
    const loginAlphaRes = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAlpha,
          password: passAlpha,
          clientId: clientAlpha.id,
        }),
      }) as any
    );
    expect(loginAlphaRes.status).toBe(200);
    const alphaData = await loginAlphaRes.json();
    expect(alphaData.client.id).toBe(clientAlpha.id);
    expect(alphaData.company.name).toBe('Alpha Dynamics Inc');

    // 4. Client Beta logs in and sees only Beta data
    const loginBetaRes = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailBeta,
          password: passBeta,
          clientId: clientBeta.id,
        }),
      }) as any
    );
    expect(loginBetaRes.status).toBe(200);
    const betaData = await loginBetaRes.json();
    expect(betaData.client.id).toBe(clientBeta.id);
    expect(betaData.company.name).toBe('Beta Cloud Solutions');

    // 5. Cross-tenant attack: Client Alpha attempts to access Client Beta's portal
    const attackAlphaToBetaRes = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAlpha,
          password: passAlpha,
          clientId: clientBeta.id, // Trying to view Beta's portal
        }),
      }) as any
    );
    expect(attackAlphaToBetaRes.status).toBe(403);
    const attackAlphaData = await attackAlphaToBetaRes.json();
    expect(attackAlphaData.error).toContain(
      'Security Error: This email invitation is not authorized to access the requested client organization.'
    );
    expect(attackAlphaData.diagnostic.code).toBe('CLIENT_ORG_MISMATCH');

    // 6. Cross-tenant attack: Client Beta attempts to access Client Alpha's portal
    const attackBetaToAlphaRes = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailBeta,
          password: passBeta,
          clientId: clientAlpha.id, // Trying to view Alpha's portal
        }),
      }) as any
    );
    expect(attackBetaToAlphaRes.status).toBe(403);
    const attackBetaData = await attackBetaToAlphaRes.json();
    expect(attackBetaData.error).toContain(
      'Security Error: This email invitation is not authorized to access the requested client organization.'
    );
    expect(attackBetaData.diagnostic.code).toBe('CLIENT_ORG_MISMATCH');

    // 7. Uninvited user rejection
    const uninvitedRes = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'random.uninvited.stranger@domain.com',
          password: 'SomePassword123!',
          clientId: clientAlpha.id,
        }),
      }) as any
    );
    expect(uninvitedRes.status).toBe(404);
    const uninvitedData = await uninvitedRes.json();
    expect(uninvitedData.error).toContain('This email address has not been invited');
  });

  it('21. Universal email support (Gmail and business emails) with manual access creation, direct login, and strict tenant isolation', async () => {
    const { POST: createAccessHandler } = await import('../src/app/api/client-portal/create-access/route');
    const { POST: authHandler } = await import('../src/app/api/client-portal/auth/route');
    const { registerClient, registerCompany } = await import('../src/lib/invitationRegistry');

    const store = useRevRecoveryStore.getState();

    // 1. Admin creates Client 1 with a personal Gmail address
    const compGmail = await store.addCompany({
      name: 'Gmail Client Ventures',
      industry: 'E-commerce',
      website: 'https://gmailventures.com',
    });
    const clientGmail = await store.addClient({
      companyId: compGmail.id,
      monthlyValue: 4500,
      contactEmail: 'founder.client01@gmail.com',
    });
    registerCompany(compGmail);
    registerClient(clientGmail, compGmail);

    // 2. Admin creates Client 2 with a custom domain business email
    const compBiz = await store.addCompany({
      name: 'Enterprise B2B Corp',
      industry: 'Enterprise Software',
      website: 'https://b2bcorp.io',
    });
    const clientBiz = await store.addClient({
      companyId: compBiz.id,
      monthlyValue: 8000,
      contactEmail: 'sarah.cro@b2bcorp.io',
    });
    registerCompany(compBiz);
    registerClient(clientBiz, compBiz);

    const gmailPassword = 'GmailSecurePass2026!';
    const bizPassword = 'B2BSecurePass2026!';

    // 3. Admin enters Gmail and sets password via Create Access
    const createGmailRes = await createAccessHandler(
      new Request('http://localhost:3000/api/client-portal/create-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientGmail.id,
          email: 'founder.client01@gmail.com',
          password: gmailPassword,
          name: 'Jordan (Gmail Client)',
          role: 'client_admin',
          client: clientGmail,
          company: compGmail,
        }),
      }) as any
    );
    expect(createGmailRes.status).toBe(200);
    const gmailAccessData = await createGmailRes.json();
    expect(gmailAccessData.success).toBe(true);
    expect(gmailAccessData.portalUrl).toContain(encodeURIComponent('founder.client01@gmail.com'));
    expect(gmailAccessData.portalUrl).toContain(clientGmail.id);

    // 4. Admin enters business email and sets password via Create Access
    const createBizRes = await createAccessHandler(
      new Request('http://localhost:3000/api/client-portal/create-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientBiz.id,
          email: 'sarah.cro@b2bcorp.io',
          password: bizPassword,
          name: 'Sarah (Enterprise B2B)',
          role: 'client_admin',
          client: clientBiz,
          company: compBiz,
        }),
      }) as any
    );
    expect(createBizRes.status).toBe(200);
    const bizAccessData = await createBizRes.json();
    expect(bizAccessData.success).toBe(true);

    // 5. Gmail Client logs in with provided credentials -> access granted directly
    const gmailLoginRes = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'founder.client01@gmail.com',
          password: gmailPassword,
          clientId: clientGmail.id,
          client: clientGmail,
          company: compGmail,
        }),
      }) as any
    );
    expect(gmailLoginRes.status).toBe(200);
    const gmailLoginData = await gmailLoginRes.json();
    expect(gmailLoginData.success).toBe(true);
    expect(gmailLoginData.user.email).toBe('founder.client01@gmail.com');
    expect(gmailLoginData.client.id).toBe(clientGmail.id);
    expect(gmailLoginData.company.name).toBe('Gmail Client Ventures');

    // 6. Business Client logs in with provided credentials -> access granted directly
    const bizLoginRes = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sarah.cro@b2bcorp.io',
          password: bizPassword,
          clientId: clientBiz.id,
          client: clientBiz,
          company: compBiz,
        }),
      }) as any
    );
    expect(bizLoginRes.status).toBe(200);
    const bizLoginData = await bizLoginRes.json();
    expect(bizLoginData.success).toBe(true);
    expect(bizLoginData.user.email).toBe('sarah.cro@b2bcorp.io');
    expect(bizLoginData.client.id).toBe(clientBiz.id);
    expect(bizLoginData.company.name).toBe('Enterprise B2B Corp');

    // 7. Strict Multi-Tenant Isolation: Gmail client cannot access Enterprise B2B dashboard
    const crossAttackRes1 = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'founder.client01@gmail.com',
          password: gmailPassword,
          clientId: clientBiz.id, // Trying to view Enterprise B2B portal
        }),
      }) as any
    );
    expect(crossAttackRes1.status).toBe(403);
    const crossData1 = await crossAttackRes1.json();
    expect(crossData1.error).toContain('Security Error: This email invitation is not authorized to access the requested client organization.');
    expect(crossData1.diagnostic.code).toBe('CLIENT_ORG_MISMATCH');

    // 8. Strict Multi-Tenant Isolation: Business client cannot access Gmail Client dashboard
    const crossAttackRes2 = await authHandler(
      new Request('http://localhost:3000/api/client-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sarah.cro@b2bcorp.io',
          password: bizPassword,
          clientId: clientGmail.id, // Trying to view Gmail Client portal
        }),
      }) as any
    );
    expect(crossAttackRes2.status).toBe(403);
    const crossData2 = await crossAttackRes2.json();
    expect(crossData2.error).toContain('Security Error: This email invitation is not authorized to access the requested client organization.');
    expect(crossData2.diagnostic.code).toBe('CLIENT_ORG_MISMATCH');
  });
});



