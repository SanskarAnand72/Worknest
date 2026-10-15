'use client';

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Shield,
  Copy,
  Check,
  AlertCircle,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { TeamRole } from '@/types/revrecovery';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { inviteTeamMember, integrations } = useRevRecoveryStore();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<TeamRole>('member');
  const [loading, setLoading] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Check if email integration is connected
  const emailIntegration = integrations.find((i) => i.provider === 'gmail');
  const hasEmailConfigured = emailIntegration && emailIntegration.status === 'Connected';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { inviteLink } = await inviteTeamMember({
        email: email.trim(),
        role,
        name: name.trim() || undefined,
        title: title.trim() || undefined,
      });

      setGeneratedInviteLink(inviteLink);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedInviteLink) {
      navigator.clipboard.writeText(generatedInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    setEmail('');
    setName('');
    setTitle('');
    setRole('member');
    setGeneratedInviteLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Invite Workspace Team Member</h2>
              <p className="text-[11px] text-muted-foreground">
                Grant role-based access to RevRecovery OS
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {generatedInviteLink ? (
            /* Invite Link Generated View */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-xs text-foreground">Invitation Record Created</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Member record for <strong className="text-foreground">{email}</strong> has been added with role <span className="uppercase text-accent font-semibold">{role}</span>.
                  </p>
                </div>
              </div>

              {!hasEmailConfigured && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Email Delivery Not Configured</strong>
                    Automatic SMTP/Gmail delivery is not enabled. Share this secure invitation link directly with your team member:
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">Direct Invitation URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="flex-1 px-3 py-2 bg-muted/60 border border-border rounded-lg text-xs font-mono text-muted-foreground select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Invitation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Team Member Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="colleague@revrecovery.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">
                    Title / Position (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Outbound Growth Lead"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-accent" /> Assign Access Role
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="font-bold text-xs text-foreground">Admin</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Full access to CRM, verification, onboarding & modules.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole('member')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      role === 'member'
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="font-bold text-xs text-foreground">Member</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Can research leads, log outreach, manage tasks & meetings.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole('viewer')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      role === 'viewer'
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="font-bold text-xs text-foreground">Viewer</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Read-only access to dashboards, SOPs, and reports.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole('co-founder')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      role === 'co-founder' || role === 'owner' || role === 'co-owner'
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="font-bold text-xs text-foreground">Co-Founder</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Full administrative authority and governance, with access to authorized workspace management features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 text-xs shadow-sm transition-opacity"
                >
                  {loading ? 'Creating Invite...' : 'Generate & Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
