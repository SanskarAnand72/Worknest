'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  Users,
  Shield,
  CheckCircle,
  XCircle,
  UserPlus,
  Mail,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Send,
  Calendar,
  Check,
  Clock,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { TeamMember, TeamRole, getRoleLabel } from '@/types/revrecovery';
import { InviteMemberModal } from './InviteMemberModal';
import { EditProfileModal } from './EditProfileModal';
import { Pencil, User } from 'lucide-react';

export const TeamView: React.FC = () => {
  const {
    teamMembers,
    updateTeamMemberRole,
    removeTeamMember,
    resendInvitation,
    cancelInvitation,
    tasks,
  } = useRevRecoveryStore();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filtered members
  const filteredMembers = teamMembers.filter((m) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.title && m.title.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (roleFilter !== 'all') {
      const targetRole = m.role === 'co-owner' ? 'co-founder' : m.role;
      if (targetRole !== roleFilter) return false;
    }
    if (statusFilter !== 'all') {
      const memberStatus = m.status || (m.isActive ? 'active' : 'invited');
      if (memberStatus !== statusFilter) return false;
    }
    return true;
  });

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    try {
      await updateTeamMemberRole(memberId, newRole);
      setActionNotice('Member access role updated successfully.');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update role');
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (confirm(`Are you sure you want to remove ${member.name} (${member.email}) from this workspace?`)) {
      try {
        await removeTeamMember(member.id);
        setActionNotice(`Removed ${member.name} from workspace.`);
        setTimeout(() => setActionNotice(null), 3000);
      } catch (err: any) {
        alert(err?.message || 'Failed to remove member');
      }
    }
  };

  const handleResend = async (member: TeamMember) => {
    try {
      const { inviteLink } = await resendInvitation(member.id);
      navigator.clipboard.writeText(inviteLink);
      setCopiedTokenId(member.id);
      setActionNotice(`New invitation link copied for ${member.email}`);
      setTimeout(() => {
        setCopiedTokenId(null);
        setActionNotice(null);
      }, 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to resend invite');
    }
  };

  const handleCancelInvite = async (member: TeamMember) => {
    if (confirm(`Cancel pending invitation for ${member.email}?`)) {
      try {
        await cancelInvitation(member.id);
        setActionNotice(`Invitation for ${member.email} cancelled.`);
        setTimeout(() => setActionNotice(null), 3000);
      } catch (err: any) {
        alert(err?.message || 'Failed to cancel invitation');
      }
    }
  };

  const PERMISSIONS = [
    { feature: 'View RevRecovery HQ & Live KPIs', owner: true, coFounder: true, admin: true, member: true, viewer: true },
    { feature: 'Manage Companies & Contacts', owner: true, coFounder: true, admin: true, member: true, viewer: false },
    { feature: 'Execute ICP Verification Audits', owner: true, coFounder: true, admin: true, member: true, viewer: false },
    { feature: 'Advance Pipeline Stages & Outreach', owner: true, coFounder: true, admin: true, member: true, viewer: false },
    { feature: 'Convert Leads to Active Clients', owner: true, coFounder: true, admin: true, member: false, viewer: false },
    { feature: 'Create & Complete Onboarding Protocols', owner: true, coFounder: true, admin: true, member: true, viewer: false },
    { feature: 'View & Edit Commercial Terms & Pricing', owner: true, coFounder: true, admin: true, member: false, viewer: false },
    { feature: 'Build & Modify Custom Operating Modules', owner: true, coFounder: true, admin: true, member: false, viewer: false },
    { feature: 'Invite & Manage Workspace Team Members', owner: true, coFounder: true, admin: true, member: false, viewer: false },
    { feature: 'Configure API Integrations & Webhooks', owner: true, coFounder: true, admin: true, member: false, viewer: false },
    { feature: 'Export Full Database to CSV', owner: true, coFounder: true, admin: true, member: false, viewer: false },
    { feature: 'Manage SOPs & Knowledge Wiki', owner: true, coFounder: true, admin: true, member: true, viewer: false },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Team Management & Access Governance</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-semibold font-mono">
              {teamMembers.length} member{teamMembers.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Invite colleagues, configure role permissions, and assign outbound ownership
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold shadow-xs transition-colors"
          >
            <User className="w-4 h-4 text-accent" />
            <span>Edit My Profile</span>
          </button>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-500 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 2. Filter & Search Controls */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search team members by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground text-[11px]">Filters:</span>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="co-founder">Co-Founder</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="invited">Pending Invitations</option>
          </select>
        </div>
      </div>

      {/* 3. Main Content: Member List Table & Permissions Matrix */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Member Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" /> Team Roster ({filteredMembers.length})
            </h2>
          </div>

          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/60 border-b border-border text-muted-foreground select-none">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Member</th>
                  <th className="py-2.5 px-3 font-semibold">Email</th>
                  <th className="py-2.5 px-3 font-semibold">Access Role</th>
                  <th className="py-2.5 px-3 font-semibold">Invitation Status</th>
                  <th className="py-2.5 px-3 font-semibold">Assigned Tasks</th>
                  <th className="py-2.5 px-3 font-semibold">Joined / Invited</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((member) => {
                  const assignedTasksCount = tasks.filter((t) => t.assignedTo === member.name && t.status !== 'Done').length;
                  const isInvited = member.status === 'invited';
                  const isOwner = member.role === 'owner';

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                            <img
                              src={
                                member.name === 'Sanskar Anand' || member.id === 'team-sanskar'
                                  ? '/avatars/sanskar-anand.jpg'
                                  : member.avatarUrl
                              }
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <span>{member.displayName || member.name}</span>
                              {isOwner && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-accent/20 text-accent uppercase">
                                  Owner
                                </span>
                              )}
                              {(member.role === 'co-founder' || (member.role as string) === 'co-owner') && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-500/15 text-indigo-500 uppercase border border-indigo-500/20">
                                  Co-Founder
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground block">{member.title || 'Team Member'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                        {member.email}
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-3 px-3">
                        <select
                          value={member.role === 'co-owner' ? 'co-founder' : member.role}
                          disabled={isOwner}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                          className="bg-background border border-border rounded-md px-2 py-1 text-xs font-semibold focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                          title={isOwner ? 'Primary Owner role cannot be modified' : 'Change access role'}
                        >
                          {isOwner && <option value="owner">Owner</option>}
                          <option value="co-founder">Co-Founder</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {isInvited ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Invited (Pending)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Assigned Tasks */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-medium text-foreground">
                          {assignedTasksCount} active
                        </span>
                      </td>

                      {/* Join / Invite Date */}
                      <td className="py-3 px-3 text-muted-foreground">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : member.invitedAt
                          ? new Date(member.invitedAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isInvited && (
                            <>
                              <button
                                onClick={() => handleResend(member)}
                                title="Copy / Resend Invitation Link"
                                className="px-2 py-1 rounded bg-muted hover:bg-background border border-border text-[11px] font-medium flex items-center gap-1"
                              >
                                {copiedTokenId === member.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>{copiedTokenId === member.id ? 'Copied' : 'Resend'}</span>
                              </button>
                              <button
                                onClick={() => handleCancelInvite(member)}
                                title="Cancel Invitation"
                                className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {!isOwner && (
                            <button
                              onClick={() => handleRemove(member)}
                              title="Remove Member from Workspace"
                              className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs max-w-4xl">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" /> RevRecovery Authorization & Access Matrix
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permissions are enforced on the state and data layer, protecting pipeline data, revenue metrics, and custom modules.
            </p>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Capability / Operation</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Owner</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Co-Founder</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Admin</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Member</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMISSIONS.map((perm, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="py-2.5 px-4 font-medium text-foreground">{perm.feature}</td>
                    <td className="py-2.5 px-3 text-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {perm.member ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground mx-auto opacity-30" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {perm.viewer ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground mx-auto opacity-30" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
};
