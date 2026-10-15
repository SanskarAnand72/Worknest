'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Briefcase,
  Image,
  CheckCircle,
  AlertTriangle,
  Lock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { getFirebaseAuth } from '@/lib/firebase';
import { verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  { label: 'Founder Photo', url: '/avatars/sanskar-anand.jpg' },
  { label: 'Executive Blue', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80' },
  { label: 'Creative Dark', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80' },
  { label: 'Minimal Studio', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80' },
  { label: 'Modern Tech', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateCurrentUser } = useWorkspaceStore();
  const { teamMembers, updateProfile } = useRevRecoveryStore();

  // Find corresponding team member record
  const currentMember = teamMembers.find(
    (m) => m.role === 'owner' || m.id === 'team-sanskar' || m.email === currentUser?.email
  ) || teamMembers[0];

  // Form State
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  // Re-authentication state for Firebase Auth email change
  const [isReauthRequired, setIsReauthRequired] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialName = currentMember?.name || currentUser?.name || 'Sanskar Anand';
      const initialDisplayName = currentMember?.displayName || currentUser?.displayName || initialName;
      const initialTitle = currentMember?.title || currentUser?.title || 'Founder & Managing Director';
      const initialAvatar = currentMember?.avatarUrl || currentUser?.avatarUrl || '/avatars/sanskar-anand.jpg';
      const initialEmail = currentMember?.email || currentUser?.email || 'sanskar@revrecovery.io';

      setFullName(initialName);
      setDisplayName(initialDisplayName);
      setJobTitle(initialTitle);
      setAvatarUrl(initialAvatar);
      setEmail(initialEmail);
      setCustomAvatarInput(initialAvatar.startsWith('http') ? initialAvatar : '');
      setIsReauthRequired(false);
      setReauthPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentMember, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMessage('Full name is required.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    setIsSaving(true);

    try {
      const initialEmail = (currentMember?.email || currentUser?.email || '').trim().toLowerCase();
      let emailChanged = trimmedEmail !== initialEmail;
      let emailChangeHandled = false;

      // Check if Firebase Auth is active
      const auth = getFirebaseAuth();
      const fbUser = auth?.currentUser;

      if (emailChanged && fbUser) {
        // Authenticated flow via Firebase Auth
        try {
          if (isReauthRequired && reauthPassword) {
            const credential = EmailAuthProvider.credential(fbUser.email || '', reauthPassword);
            await reauthenticateWithCredential(fbUser, credential);
            setIsReauthRequired(false);
          }

          // Use supported verifyBeforeUpdateEmail flow
          await verifyBeforeUpdateEmail(fbUser, trimmedEmail);
          emailChangeHandled = true;
          setSuccessMessage(
            `Profile updated. A verification link has been sent to ${trimmedEmail}. Your login email will update once verified.`
          );
        } catch (authErr: any) {
          if (authErr?.code === 'auth/requires-recent-login') {
            setIsReauthRequired(true);
            setIsSaving(false);
            setErrorMessage('For security, please enter your current password to confirm the email change.');
            return;
          }
          throw new Error(authErr?.message || 'Failed to initiate Firebase Auth email update.');
        }
      }

      // Prepare database updates
      const profileUpdates = {
        name: trimmedName,
        displayName: displayName.trim() || trimmedName,
        title: jobTitle.trim() || 'Founder & Managing Director',
        avatarUrl: avatarUrl.trim() || '/avatars/sanskar-anand.jpg',
        // If email was changed in offline/local mode, update it; otherwise preserve verified email
        ...(emailChanged && !fbUser ? { email: trimmedEmail } : {}),
      };

      // 1. Update revrecoveryStore teamMembers table
      await updateProfile(profileUpdates);

      // 2. Update workspaceStore currentUser
      await updateCurrentUser({
        ...profileUpdates,
        id: currentUser?.id || currentMember?.id || 'team-sanskar',
        role: currentUser?.role || currentMember?.role || 'owner',
      });

      if (!emailChangeHandled) {
        setSuccessMessage('Profile saved successfully.');
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMessage(err?.message || 'An error occurred while saving your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center text-accent">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Edit My Profile</h2>
              <p className="text-[11px] text-muted-foreground">
                Update personal details, job title, and avatar across RevRecovery OS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Avatar Preview & Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-accent" />
              <span>Profile Photo / Avatar</span>
            </label>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-accent/40 bg-muted shrink-0 shadow-xs">
                <img
                  src={avatarUrl || '/avatars/sanskar-anand.jpg'}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/sanskar-anand.jpg';
                  }}
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="text-[11px] font-medium text-muted-foreground">Select Preset:</div>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(preset.url);
                        setCustomAvatarInput(preset.url.startsWith('http') ? preset.url : '');
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                        avatarUrl === preset.url
                          ? 'bg-accent/15 border-accent text-accent font-semibold'
                          : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="pt-1">
              <input
                type="url"
                placeholder="Or paste custom image URL (https://...)"
                value={customAvatarInput}
                onChange={(e) => {
                  setCustomAvatarInput(e.target.value);
                  if (e.target.value) setAvatarUrl(e.target.value);
                }}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Full Name & Display Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sanskar Anand"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Display Name <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sanskar"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Job Title / Position */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-accent" />
              <span>Job Title / Position</span>
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Founder & Managing Director"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-[10px] text-muted-foreground">
              Shown below your name in the sidebar, team roster, and author tags.
            </p>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-accent" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@revrecovery.io"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-[10px] text-muted-foreground">
              Changing your email triggers verification through the authentication provider.
            </p>
          </div>

          {/* Re-auth Password Field (conditional on Firebase recent-login requirement) */}
          {isReauthRequired && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm Current Password to Update Email</span>
              </div>
              <input
                type="password"
                placeholder="Current account password"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          {/* Role Display (Read-Only) */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Access Role:</span>
            <span className="font-semibold text-foreground capitalize px-2 py-0.5 rounded bg-accent/15 text-accent">
              {currentMember?.role === 'owner' ? 'Owner' : currentMember?.role === 'co-founder' || currentMember?.role === 'co-owner' ? 'Co-Founder' : currentMember?.role || 'Owner'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 shadow-sm transition-opacity flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
