'use client';

import React, { useState } from 'react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import {
  X,
  CheckCircle,
  AlertCircle,
  Upload,
  Link as LinkIcon,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Key,
} from 'lucide-react';
import {
  VerificationStatus,
  LeadStage,
  TaskPriority,
  MeetingType,
  IntegrationConfig,
  IntegrationStatus,
} from '@/types/revrecovery';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 1. ICP VERIFICATION MODAL
interface VerifyCompanyModalProps extends ModalProps {
  companyId: string | null;
}

export const VerifyCompanyModal: React.FC<VerifyCompanyModalProps> = ({
  isOpen,
  onClose,
  companyId,
}) => {
  const { companies, verifyCompany, teamMembers } = useRevRecoveryStore();
  const company = companies.find((c) => c.id === companyId);

  const [status, setStatus] = useState<VerificationStatus>('Verified');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [reason, setReason] = useState('');
  const [reviewer, setReviewer] = useState(teamMembers[1]?.name || 'Elena Rostova');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !company) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Verification reason is required.');
      return;
    }
    if (status === 'Verified' && !evidenceUrl.trim()) {
      setError('A valid evidence URL (e.g. LinkedIn, Crunchbase, Website) is required for Verified status.');
      return;
    }

    setSubmitting(true);
    try {
      await verifyCompany(company.id, status, evidenceUrl.trim(), reason.trim(), reviewer);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to verify company');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-sm">ICP Verification Audit</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Company Target</label>
            <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-sm font-semibold flex items-center justify-between">
              <span>{company.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{company.website}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Verification Status</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Verified', 'Needs Review', 'Rejected', 'Pending'] as VerificationStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                    status === st
                      ? st === 'Verified'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 font-semibold'
                        : st === 'Rejected'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-semibold'
                        : 'bg-amber-500/10 border-amber-500 text-amber-500 font-semibold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Evidence Source URL {status === 'Verified' && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="url"
                placeholder="https://linkedin.com/company/... or https://crunchbase.com/..."
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Rule of Thumb: Never mark Verified without verifiable audit proof.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Audit Reasoning & ICP Alignment <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Confirmed 45 FTEs on LinkedIn, B2B SaaS ARR > $3M, Founder active on LI within 10 days."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Reviewer</label>
            <select
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              className="w-full p-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.name}>
                  {tm.name} ({tm.title})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {submitting ? 'Auditing...' : 'Confirm Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. QUICK ADD LEAD MODAL
export const QuickAddLeadModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { addCompany, addContact, addLead, teamMembers, outreachSources } = useRevRecoveryStore();

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('B2B SaaS');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTitle, setContactTitle] = useState('Founder & CEO');
  const [stage, setStage] = useState<LeadStage>('New');
  const [dealValue, setDealValue] = useState('6500');
  const [expectedValue, setExpectedValue] = useState('6500');
  const [outreachSource, setOutreachSource] = useState(outreachSources[0]?.name || 'LinkedIn');
  const [assignedTo, setAssignedTo] = useState(teamMembers[0]?.name || 'Sanskar Anand');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Company
      const comp = await addCompany({
        name: companyName.trim(),
        website: website.trim().startsWith('http') ? website.trim() : `https://${website.trim() || 'example.com'}`,
        industry,
        country: 'United States',
        city: 'San Francisco',
        size: '11-50',
        type: 'Product',
        servicesOffered: 'Outbound Client Acquisition',
        icpCriteria: 'Verified B2B, >$2M ARR, 15-100 FTEs',
        icpMatchStatus: 'unreviewed',
        researchSource: outreachSource || 'Manual Sourcing',
        verificationStatus: 'Pending',
        assignedResearcher: assignedTo,
        notes: `Created via RevRecovery quick add on ${new Date().toLocaleDateString()}`,
      });

      // 2. Create Contact if provided
      let contactId: string | undefined = undefined;
      if (contactName.trim()) {
        const contact = await addContact({
          name: contactName.trim(),
          title: contactTitle.trim(),
          companyId: comp.id,
          email: contactEmail.trim(),
          linkedinUrl: `https://linkedin.com/in/${contactName.toLowerCase().replace(/\s+/g, '-')}`,
          source: outreachSource || 'Manual Research',
          verificationStatus: 'Pending',
          assignedOwner: assignedTo,
        });
        contactId = contact.id;
      }

      // 3. Create Lead Deal
      await addLead({
        companyId: comp.id,
        primaryContactId: contactId,
        title: `Outbound Acquisition - ${comp.name}`,
        stage,
        value: parseFloat(dealValue) || 5000,
        expectedValue: parseFloat(expectedValue) || parseFloat(dealValue) || 5000,
        currency: 'USD',
        assignedTo,
        outreachSource,
        outreachChannel: outreachSource.toLowerCase().includes('email') ? 'Email' : 'LinkedIn',
        connectionStatus: 'Not Sent',
        messageStatus: 'Not Contacted',
        nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        notes: 'Initial lead record ready for qualification & outreach.',
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-sm">Add New Prospect Company & Lead</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. NexusCloud AI"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Website</label>
              <input
                type="text"
                placeholder="nexuscloud.io"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="B2B SaaS">B2B SaaS</option>
                <option value="Fintech">Fintech</option>
                <option value="DevTools">DevTools</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="HealthTech">HealthTech</option>
                <option value="IT Services">IT Services</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Deal Target ($ MRR/Fee)</label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Primary Decision-Maker
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Outreach Source / Channel</label>
              <select
                value={outreachSource}
                onChange={(e) => setOutreachSource(e.target.value)}
                className="w-full p-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {outreachSources.filter(s => s.active).map((src) => (
                  <option key={src.id} value={src.name}>
                    {src.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Pipeline Value ($)</label>
              <input
                type="number"
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Initial Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as LeadStage)}
                className="w-full p-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="New">New</option>
                <option value="Researching">Researching</option>
                <option value="Awaiting Verification">Awaiting Verification</option>
                <option value="Verified">Verified</option>
                <option value="Qualified">Qualified</option>
                <option value="Ready for Outreach">Ready for Outreach</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Assigned Owner</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {teamMembers.map((tm) => (
                  <option key={tm.id} value={tm.name}>
                    {tm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium bg-accent hover:opacity-90 text-accent-foreground rounded-lg transition-opacity"
            >
              {submitting ? 'Creating...' : 'Create Lead & Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. QUICK ADD TASK MODAL
export const QuickAddTaskModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { addTask, teamMembers, projects, clients, companies } = useRevRecoveryStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [assignedTo, setAssignedTo] = useState(teamMembers[0]?.name || 'Sanskar Anand');
  const [dueDateStr, setDueDateStr] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'Todo',
        assignedTo,
        creator: teamMembers[0]?.name || 'Sanskar Anand',
        dueDate: dueDateStr,
        relatedProjectId: selectedProjectId || undefined,
        relatedClientId: selectedClientId || undefined,
        relatedCompanyId: selectedCompanyId || undefined,
        labels: ['Operations'],
        subtasks: [
          { id: 'sub-1', title: 'Review requirements and setup prerequisites', completed: false },
          { id: 'sub-2', title: 'Execute deliverable and record documentation', completed: false },
        ],
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <h3 className="font-semibold text-sm">Create New Operational Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Audit verified decision-maker emails for Outreach Batch #4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Context or action checklist..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical 🔥</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Assigned Owner</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.name}>
                  {tm.name} ({tm.title})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Related Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Related Company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium bg-accent hover:opacity-90 text-accent-foreground rounded-lg transition-opacity"
            >
              {submitting ? 'Adding...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. ADD MEETING MODAL
export const AddMeetingModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { addMeeting, teamMembers, clients, companies } = useRevRecoveryStore();

  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('Sales Discovery');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [timeStr, setTimeStr] = useState('14:00');
  const [durationMins, setDurationMins] = useState(30);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [agenda, setAgenda] = useState('1. Introduction & Background\n2. Current Sales Acquisition Bottlenecks\n3. RevRecovery Outbound Process Fit\n4. Next Steps');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await addMeeting({
        title: title.trim(),
        type: meetingType,
        date: dateStr,
        time: timeStr,
        durationMinutes: durationMins,
        outcome: 'Scheduled',
        relatedCompanyId: selectedCompanyId || undefined,
        attendees: [
          teamMembers[0]?.name || 'Sanskar Anand',
          'Prospect Decision Maker',
        ],
        agenda,
        notes: 'Meeting scheduled. Notes will be populated during the call.',
        decisions: '',
        actionItems: [
          {
            id: 'act-init-1',
            title: 'Prepare custom ICP teardown presentation',
            assignedTo: teamMembers[0]?.name || 'Sanskar Anand',
            dueDate: dateStr,
          },
        ],
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-sm">Schedule Meeting / Discovery Call</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Meeting Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. RevRecovery Discovery Call with VentureScale AI"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Meeting Type</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="Sales Discovery">Sales Discovery</option>
                <option value="Client Kickoff">Client Kickoff</option>
                <option value="Campaign Review">Campaign Review</option>
                <option value="Weekly Team Sync">Weekly Team Sync</option>
                <option value="Monthly Review">Monthly Review</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Time</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Related Target Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">None</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Agenda & Call Plan</label>
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium bg-accent hover:opacity-90 text-accent-foreground rounded-lg transition-opacity"
            >
              {submitting ? 'Scheduling...' : 'Save Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. INTEGRATION CONFIG MODAL
interface IntegrationModalProps extends ModalProps {
  integration: IntegrationConfig | null;
}

export const ConfigureIntegrationModal: React.FC<IntegrationModalProps> = ({
  isOpen,
  onClose,
  integration,
}) => {
  const { updateIntegration } = useRevRecoveryStore();

  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [statusChoice, setStatusChoice] = useState<IntegrationStatus>('Connected');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen || !integration) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const configObj: Record<string, string> = {};
      if (apiKey) configObj.apiKey = apiKey.slice(0, 4) + '••••••••' + apiKey.slice(-4);
      if (webhookUrl) configObj.webhookUrl = webhookUrl;
      if (clientId) configObj.clientId = clientId;

      await updateIntegration(integration.provider, statusChoice, configObj);
      setFeedback('Integration credentials verified and configured successfully.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setFeedback('Error configuring integration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-sm">Configure {integration.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">{integration.name}</p>
            <p>{integration.description}</p>
            <div className="mt-2 text-[11px] font-mono text-muted-foreground">
              Current Status:{' '}
              <span className="font-semibold text-foreground">{integration.status}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              API Key / Auth Token
            </label>
            <input
              type="password"
              placeholder="Paste provider authorization token..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Webhook URL (for triggers & bi-directional sync)
            </label>
            <input
              type="url"
              placeholder="https://n8n.revrecovery.io/webhook/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Connection Verification State
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Connected', 'Setup Required', 'Not Connected'] as IntegrationStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusChoice(st)}
                  className={`py-2 px-1 text-xs rounded-lg border text-center transition-all ${
                    statusChoice === st
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium bg-accent hover:opacity-90 text-accent-foreground rounded-lg transition-opacity flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {submitting ? 'Testing & Saving...' : 'Save Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 6. CSV IMPORT MODAL
export const CsvImportModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { importLeadsFromCSV } = useRevRecoveryStore();

  const [csvContent, setCsvContent] = useState(`Company Name,Website,Industry,Contact Name,Contact Email,Deal Value
StripeClone Inc,https://stripeclone.io,Fintech,David Kim,david@stripeclone.io,7500
CloudScale Labs,https://cloudscalelabs.com,DevTools,Jessica Rao,jessica@cloudscale.com,12000
HealthMetric AI,https://healthmetric.ai,HealthTech,Thomas Wright,thomas@healthmetric.ai,5500`);

  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParsePreview = () => {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map((h) => h.trim());
    const parsed = lines.slice(1).map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || '';
      });
      return row;
    });
    setPreviewRows(parsed);
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    setResultMsg(null);
    try {
      const result = await importLeadsFromCSV(csvContent);
      setResultMsg(`Successfully imported ${result.imported} leads! ${result.errors.length > 0 ? `Errors: ${result.errors.join('; ')}` : ''}`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setResultMsg(`Import failed: ${err?.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-sm">Import Leads from CSV</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-muted-foreground">
            Paste raw CSV content with headers: <code className="text-foreground font-mono">Company Name, Website, Industry, Contact Name, Contact Email, Deal Value</code>
          </p>

          <textarea
            rows={5}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="w-full p-3 text-xs bg-background border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleParsePreview}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted text-muted-foreground"
            >
              Parse Preview ({csvContent.trim().split('\n').length - 1} rows)
            </button>
          </div>

          {previewRows.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                Validated Rows Preview ({previewRows.length} records ready)
              </div>
              <div className="max-h-40 overflow-y-auto text-xs divide-y divide-border">
                {previewRows.map((r, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between">
                    <span className="font-semibold">{r['Company Name'] || 'Unknown'}</span>
                    <span className="text-muted-foreground font-mono">{r['Contact Email']}</span>
                    <span className="text-emerald-500 font-medium">${r['Deal Value'] || '5000'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs">
              {resultMsg}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={importing}
            className="px-4 py-2 text-xs font-medium bg-accent hover:opacity-90 text-accent-foreground rounded-lg transition-opacity flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importing Rows...' : 'Confirm & Import to CRM'}
          </button>
        </div>
      </div>
    </div>
  );
};
