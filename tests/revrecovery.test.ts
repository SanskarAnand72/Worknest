import { describe, it, expect, beforeEach } from 'vitest';
import { useRevRecoveryStore } from '../src/stores/revrecoveryStore';
import { VerificationStatus, LeadStage, TeamRole } from '../src/types/revrecovery';
import { checkFirebaseStatus } from '../src/lib/firebase';

describe('RevRecovery OS - Internal Operating System Suite', () => {
  beforeEach(async () => {
    // Initialize store
    const store = useRevRecoveryStore.getState();
    await store.init();
  });

  // Task 1: Clean Demo Data Verification
  it('Task 1: Workspace starts clean with genuine founder Sanskar Anand and zero fake business records', () => {
    const store = useRevRecoveryStore.getState();

    // Verify founder
    expect(store.teamMembers.length).toBeGreaterThanOrEqual(1);
    const founder = store.teamMembers.find((m) => m.name === 'Sanskar Anand');
    expect(founder).toBeDefined();
    expect(founder?.role).toBe('owner');
    expect(founder?.status).toBe('active');

    // Verify all integrations start in honest 'Not Connected' state
    expect(store.integrations.every((i) => i.status === 'Not Connected')).toBe(true);

    // Verify automation execution count starts at 0
    expect(store.automationRules.every((a) => a.executionCount === 0)).toBe(true);
  });

  // Task 2: Firebase Status Honesty
  it('Task 2: Honest Firebase Status reflects offline/local-first state without fake credentials', async () => {
    const status = await checkFirebaseStatus();
    expect(status.isConnected).toBe(false);
    expect(status.activeMode).toBe('indexeddb');
  });

  // Task 3: Team Member Management & Invitations
  it('Task 3: Manages team members: invites with role, generates link, updates role, and removes member', async () => {
    const store = useRevRecoveryStore.getState();

    // 1. Invite a new team member
    const { member, inviteLink } = await store.inviteTeamMember({
      name: 'Alex Rivera',
      email: 'alex.rivera@revrecovery.io',
      role: 'member',
      title: 'Growth Specialist',
    });

    expect(member.id).toBeDefined();
    expect(member.email).toBe('alex.rivera@revrecovery.io');
    expect(member.status).toBe('invited');
    expect(inviteLink).toContain('token=');

    // Verify in store
    const inStore = useRevRecoveryStore.getState().teamMembers.find((m) => m.id === member.id);
    expect(inStore).toBeDefined();
    expect(inStore?.role).toBe('member');

    // 2. Update role to admin
    await store.updateTeamMemberRole(member.id, 'admin');
    const updated = useRevRecoveryStore.getState().teamMembers.find((m) => m.id === member.id);
    expect(updated?.role).toBe('admin');

    // 3. Remove invited member
    await store.removeTeamMember(member.id);
    const afterRemoval = useRevRecoveryStore.getState().teamMembers.find((m) => m.id === member.id);
    expect(afterRemoval).toBeUndefined();
  });

  // Task 4: Company and Decision-Maker Creation
  it('Task 4: Creates a new company and linked decision-maker contact', async () => {
    const store = useRevRecoveryStore.getState();
    const company = await store.addCompany({
      name: 'OmniCloud Systems',
      website: 'https://omnicloud.io',
      industry: 'B2B SaaS',
      country: 'United States',
      city: 'Austin',
      size: '51-200',
      type: 'Product',
      servicesOffered: 'Cloud Optimization',
      icpCriteria: 'ARR > $5M, 50+ FTEs',
      icpMatchStatus: 'matched',
      researchSource: 'LinkedIn Sales Navigator',
      verificationStatus: 'Pending',
      assignedResearcher: 'Sanskar Anand',
      notes: 'High intent prospect',
    });

    expect(company.id).toBeDefined();
    expect(company.name).toBe('OmniCloud Systems');

    const contact = await store.addContact({
      companyId: company.id,
      name: 'Michael Chang',
      title: 'VP of Engineering',
      email: 'm.chang@omnicloud.io',
      linkedinUrl: 'https://linkedin.com/in/michaelchang',
      source: 'LinkedIn',
      verificationStatus: 'Verified',
      assignedOwner: 'Sanskar Anand',
      notes: 'Active decision maker',
    });

    expect(contact.id).toBeDefined();
    expect(contact.companyId).toBe(company.id);
    expect(contact.email).toBe('m.chang@omnicloud.io');
  });

  // Task 5: ICP Verification with Audit Evidence
  it('Task 5: Audits and verifies company with evidence URL, reason, and reviewer', async () => {
    const store = useRevRecoveryStore.getState();
    const company = await store.addCompany({
      name: 'VentureScale AI',
      website: 'https://venturescale.io',
      industry: 'B2B SaaS',
      country: 'United States',
      city: 'San Francisco',
      size: '51-200',
      type: 'Product',
      servicesOffered: 'Outbound Client Acquisition',
      icpCriteria: 'ARR > $2M',
      verificationStatus: 'Pending',
    });

    await store.verifyCompany(
      company.id,
      'Verified',
      'https://linkedin.com/company/venturescale-ai',
      'Verified 60 FTEs, Series A funded, active CEO posting on LinkedIn.',
      'Sanskar Anand'
    );

    const updated = useRevRecoveryStore.getState().companies.find((c) => c.id === company.id);
    expect(updated?.verificationStatus).toBe('Verified');
    expect(updated?.verificationEvidenceUrl).toBe('https://linkedin.com/company/venturescale-ai');
    expect(updated?.verificationReason).toContain('Verified 60 FTEs');
    expect(updated?.verifiedBy).toBe('Sanskar Anand');
  });

  // Task 6: Event-Sourced Activity Logging & Outreach Metrics
  it('Task 6: Logs outreach activities (connection, message, reply, positive reply) driving pipeline metrics', async () => {
    const store = useRevRecoveryStore.getState();

    // Create target company & lead
    const comp = await store.addCompany({ name: 'AlphaData Labs', website: 'https://alphadata.ai' });
    const lead = await store.addLead({
      companyId: comp.id,
      title: 'AlphaData Outbound Pilot',
      stage: 'Ready for Outreach',
      value: 8500,
      expectedValue: 8500,
      assignedTo: 'Sanskar Anand',
      outreachSource: 'LinkedIn',
    });

    const initialActivityCount = store.activities.length;

    // 1. Log connection sent
    const act1 = await store.logActivity({
      companyId: comp.id,
      leadId: lead.id,
      type: 'connection_request_sent',
      title: 'Connection request sent to Founder',
      recordedBy: 'Sanskar Anand',
      outreachSource: 'LinkedIn',
    });
    expect(act1.id).toBeDefined();

    // 2. Log message sent
    const act2 = await store.logActivity({
      companyId: comp.id,
      leadId: lead.id,
      type: 'message_sent',
      title: 'First personalized pitch message sent',
      recordedBy: 'Sanskar Anand',
      outreachSource: 'LinkedIn',
    });
    expect(act2.id).toBeDefined();

    // 3. Log reply received
    const act3 = await store.logActivity({
      companyId: comp.id,
      leadId: lead.id,
      type: 'reply_received',
      title: 'Prospect responded asking for case studies',
      recordedBy: 'Sanskar Anand',
    });
    expect(act3.id).toBeDefined();

    // 4. Log positive reply
    const act4 = await store.logActivity({
      companyId: comp.id,
      leadId: lead.id,
      type: 'positive_reply',
      title: 'Founder wants to book a discovery call',
      recordedBy: 'Sanskar Anand',
    });
    expect(act4.id).toBeDefined();

    const currentActivities = useRevRecoveryStore.getState().activities;
    expect(currentActivities.length).toBe(initialActivityCount + 4);

    // Verify activity deletion
    await store.deleteActivity(act4.id);
    expect(useRevRecoveryStore.getState().activities.find((a) => a.id === act4.id)).toBeUndefined();
  });

  // Task 7: Lead Conversion to Client without Duplication
  it('Task 7: Converts won prospect into active Client without duplicating company record', async () => {
    const store = useRevRecoveryStore.getState();

    const comp = await store.addCompany({ name: 'ScaleTech Corp', website: 'https://scaletech.com' });
    const lead = await store.addLead({
      companyId: comp.id,
      title: 'ScaleTech Retainer Deal',
      stage: 'Proposal Sent',
      value: 12000,
      currency: 'USD',
      assignedTo: 'Sanskar Anand',
    });

    const originalCompanyCount = useRevRecoveryStore.getState().companies.length;

    const newClient = await store.convertLeadToClient(lead.id);
    expect(newClient).not.toBeNull();
    expect(newClient?.companyId).toBe(comp.id);
    expect(newClient?.monthlyValue).toBe(12000);

    // Verify company was not duplicated
    expect(useRevRecoveryStore.getState().companies.length).toBe(originalCompanyCount);

    // Verify 10-step onboarding checklist was populated
    expect(newClient?.onboardingChecklist.length).toBe(10);
    expect(newClient?.contractStatus).toBe('Active');

    // Toggling onboarding checklist item
    const firstStep = newClient!.onboardingChecklist[0];
    const initialStatus = firstStep.completed;
    await store.toggleOnboardingItem(newClient!.id, firstStep.id);
    const updatedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === newClient!.id);
    expect(updatedClient?.onboardingChecklist.find((s) => s.id === firstStep.id)?.completed).toBe(!initialStatus);
  });

  // Task 8: Operational Tasks and Meeting Conversion
  it('Task 8: Creates operational tasks and converts meeting action items into tasks', async () => {
    const store = useRevRecoveryStore.getState();

    // 1. Create meeting with action items
    const meeting = await store.addMeeting({
      title: 'RevRecovery ICP Alignment Call',
      date: '2026-10-20',
      time: '14:00',
      type: 'Sales Discovery',
      outcome: 'Scheduled',
      attendees: ['Sanskar Anand'],
      actionItems: [
        { id: 'act-item-1', title: 'Prepare custom ROI benchmark', assignedTo: 'Sanskar Anand', dueDate: '2026-10-22' },
      ],
    });

    expect(meeting.id).toBeDefined();
    expect(meeting.actionItems.length).toBe(1);

    // 2. Convert action item to task
    const createdTask = await store.convertActionItemToTask(meeting.id, 'act-item-1');
    expect(createdTask).not.toBeNull();
    expect(createdTask?.title).toContain('Prepare custom ROI benchmark');
    expect(createdTask?.relatedMeetingId).toBe(meeting.id);

    // 3. Complete task
    await store.updateTask(createdTask!.id, { status: 'Done', completedAt: Date.now() });
    const updated = useRevRecoveryStore.getState().tasks.find((t) => t.id === createdTask!.id);
    expect(updated?.status).toBe('Done');
  });

  // Task 9: Custom Operating Modules & Records
  it('Task 9: Dynamic Custom Modules: builds custom module, stages, views, and manages records', async () => {
    const store = useRevRecoveryStore.getState();

    // 1. Add Custom Module
    const customMod = await store.addCustomModule({
      name: 'Talent Acquisition Tracker',
      slug: 'talent-tracker',
      description: 'Track candidate sourcing and technical interviews',
      icon: '👥',
      category: 'Operations',
      type: 'kanban',
      views: [
        { id: 'v1', name: 'Hiring Board', type: 'board', visibleFields: ['f1', 'f2'] },
        { id: 'v2', name: 'Candidate Roster', type: 'table', visibleFields: ['f1', 'f2', 'f3'] },
      ],
      stages: [
        { id: 's1', name: 'Sourced', color: 'blue', order: 0 },
        { id: 's2', name: 'Screening', color: 'indigo', order: 1 },
        { id: 's3', name: 'Offer Extended', color: 'emerald', order: 2, isWon: true },
      ],
      fields: [
        { id: 'f1', key: 'candidateRole', name: 'Candidate Role', type: 'text', required: true, appearsInTable: true, searchable: true, filterable: true },
        { id: 'f2', key: 'compensation', name: 'Expected Compensation', type: 'currency', required: false, appearsInTable: true, searchable: true, filterable: true },
        { id: 'f3', key: 'githubUrl', name: 'GitHub URL', type: 'url', required: false, appearsInTable: true, searchable: false, filterable: false },
      ],
      relations: [],
      accessRoles: ['owner', 'admin', 'member'],
    });

    expect(customMod.id).toBeDefined();
    expect(customMod.name).toBe('Talent Acquisition Tracker');

    // 2. Add Record into Custom Module
    const record = await store.addCustomRecord({
      moduleId: customMod.id,
      title: 'Devin Sharma (Staff Frontend)',
      stageId: 's1',
      data: {
        f1: 'Staff Frontend Engineer',
        f2: 180000,
        f3: 'https://github.com/dsharma',
      },
    });

    expect(record.id).toBeDefined();
    expect(record.moduleId).toBe(customMod.id);
    expect(record.data.f1).toBe('Staff Frontend Engineer');

    // 3. Move record to new stage
    await store.updateCustomRecord(record.id, { stageId: 's2' });
    const updatedRecord = useRevRecoveryStore.getState().customRecords.find((r) => r.id === record.id);
    expect(updatedRecord?.stageId).toBe('s2');

    // 4. Delete record
    await store.deleteCustomRecord(record.id);
    expect(useRevRecoveryStore.getState().customRecords.find((r) => r.id === record.id)).toBeUndefined();

    // 5. Delete Custom Module
    await store.deleteCustomModule(customMod.id);
    expect(useRevRecoveryStore.getState().customModules.find((m) => m.id === customMod.id)).toBeUndefined();
  });

  // Task 10: CSV Import/Export
  it('Task 10: Validates CSV import with column mapping and handles malformed rows gracefully', () => {
    const store = useRevRecoveryStore.getState();

    const validCsv = `Company Name,Website,Industry,Contact Name,Contact Email,Deal Value
TestCorp Alpha,https://testalpha.io,Fintech,John Doe,john@testalpha.io,8000
TestCorp Beta,https://testbeta.io,B2B SaaS,Jane Smith,jane@testbeta.io,6000`;

    const result = store.importLeadsFromCSV(validCsv);
    expect(result.imported).toBe(2);
    expect(result.errors.length).toBe(0);

    // Invalid CSV without company name
    const invalidCsv = `Company Name,Website,Industry,Contact Name,Contact Email,Deal Value
,https://noname.io,B2B SaaS,Unknown,unknown@test.io,5000`;

    const invalidResult = store.importLeadsFromCSV(invalidCsv);
    expect(invalidResult.imported).toBe(0);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  // Task 11: Co-Founder Role Renaming, Normalization & Backward-Compatibility
  it('Task 11: Invites team member as Co-Founder and safely maps legacy co-owner', async () => {
    const store = useRevRecoveryStore.getState();

    // Invite with 'co-founder' role
    const { member } = await store.inviteTeamMember({
      name: 'Elena Rostova',
      email: 'elena@revrecovery.io',
      role: 'co-founder',
      title: 'Co-Founder & Head of Research',
    });

    expect(member.role).toBe('co-founder');
    expect(member.title).toBe('Co-Founder & Head of Research');

    // Verify in store
    const inStore = useRevRecoveryStore.getState().teamMembers.find((m) => m.id === member.id);
    expect(inStore?.role).toBe('co-founder');

    // Test legacy 'co-owner' mapping to 'co-founder'
    await store.updateTeamMemberRole(member.id, 'co-owner' as any);
    const mapped = useRevRecoveryStore.getState().teamMembers.find((m) => m.id === member.id);
    expect(mapped?.role).toBe('co-founder');

    // Clean up
    await store.removeTeamMember(member.id);
  });

  // Task 12: Primary Workspace Owner Protection
  it('Task 12: Prevents demoting or removing the primary workspace Owner', async () => {
    const store = useRevRecoveryStore.getState();
    const founder = store.teamMembers.find((m) => m.role === 'owner');
    expect(founder).toBeDefined();

    // Demotion attempt must throw error
    await expect(store.updateTeamMemberRole(founder!.id, 'member')).rejects.toThrow(
      'Cannot demote the primary workspace owner'
    );

    // Removal attempt must throw error
    await expect(store.removeTeamMember(founder!.id)).rejects.toThrow(
      'Cannot remove the primary workspace owner'
    );

    // Verify role remains owner
    const afterAttempt = useRevRecoveryStore.getState().teamMembers.find((m) => m.id === founder!.id);
    expect(afterAttempt?.role).toBe('owner');
  });

  // Task 13: Editable Profile Feature
  it('Task 13: Updates personal profile details including full name, display name, and title', async () => {
    const store = useRevRecoveryStore.getState();

    const updatedProfile = await store.updateProfile({
      name: 'Sanskar Anand',
      displayName: 'Sanskar',
      title: 'Founder & CEO',
      avatarUrl: '/avatars/sanskar-anand.jpg',
    });

    expect(updatedProfile).toBeDefined();
    expect(updatedProfile?.title).toBe('Founder & CEO');
    expect(updatedProfile?.displayName).toBe('Sanskar');

    // Verify persisted in store
    const founder = useRevRecoveryStore.getState().teamMembers.find((m) => m.role === 'owner');
    expect(founder?.title).toBe('Founder & CEO');
    expect(founder?.displayName).toBe('Sanskar');

    // Revert back cleanly
    await store.updateProfile({
      title: 'Founder & Managing Director',
      displayName: 'Sanskar Anand',
    });
  });

  // Task 14: Comprehensive Client Editing
  it('Task 14: Edits client record fields including retainer, objectives, and contract status', async () => {
    const store = useRevRecoveryStore.getState();

    // 1. Create client
    const client = await store.addClient({
      companyId: 'comp-test-growth',
      monthlyValue: 5000,
      currency: 'USD',
      contractStatus: 'Active',
      accountOwner: 'Sanskar Anand',
      currentObjectives: 'Initial pilot campaign',
      successMetrics: '10 meetings/mo',
      notes: 'Pilot contract',
    });

    expect(client.id).toBeDefined();
    expect(client.monthlyValue).toBe(5000);

    // 2. Edit client details
    await store.updateClient(client.id, {
      monthlyValue: 8500,
      contractStatus: 'Active',
      currentObjectives: 'Scaled enterprise campaign across US & UK',
      successMetrics: '25 qualified discovery calls/mo with 90%+ ICP match',
      notes: 'Expanded to tier-1 enterprise outreach tier',
    });

    const updatedClient = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(updatedClient?.monthlyValue).toBe(8500);
    expect(updatedClient?.currentObjectives).toContain('Scaled enterprise campaign');
    expect(updatedClient?.successMetrics).toContain('25 qualified discovery calls');

    // Clean up
    await store.deleteClient(client.id);
  });

  // Task 15: Client Archival (Soft Delete), Restoration & Permanent Deletion
  it('Task 15: Archives client (soft-delete), updates active metrics, restores, and deletes', async () => {
    const store = useRevRecoveryStore.getState();

    const client = await store.addClient({
      companyId: 'comp-test-archive',
      monthlyValue: 7000,
      contractStatus: 'Active',
      accountOwner: 'Sanskar Anand',
    });

    const initialActive = useRevRecoveryStore.getState().clients.filter((c) => !c.archived && c.contractStatus === 'Active');
    const initialMRR = initialActive.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);

    // 1. Archive Client
    await store.archiveClient(client.id);

    const clientAfterArchive = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(clientAfterArchive?.archived).toBe(true);

    // Verify active count and MRR decreased accordingly
    const activeAfterArchive = useRevRecoveryStore.getState().clients.filter((c) => !c.archived && c.contractStatus === 'Active');
    const mrrAfterArchive = activeAfterArchive.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);
    expect(activeAfterArchive.length).toBe(initialActive.length - 1);
    expect(mrrAfterArchive).toBe(initialMRR - 7000);

    // 2. Restore Client
    await store.restoreClient(client.id);
    const clientAfterRestore = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(clientAfterRestore?.archived).toBe(false);

    // 3. Permanent Delete
    await store.deleteClient(client.id);
    const clientAfterDelete = useRevRecoveryStore.getState().clients.find((c) => c.id === client.id);
    expect(clientAfterDelete).toBeUndefined();
  });
});
