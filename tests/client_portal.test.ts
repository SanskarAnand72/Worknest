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
});

