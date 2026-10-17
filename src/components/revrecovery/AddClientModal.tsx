'use client';

import React, { useState } from 'react';
import {
  X,
  Building,
  User,
  DollarSign,
  Calendar,
  Briefcase,
  Target,
  Sparkles,
  Loader2,
  Mail,
  Globe,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { generateId } from '@/lib/utils';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (clientId: string) => void;
}

const AVAILABLE_SERVICES = [
  'Lead Research & Verification',
  'Outbound Outreach',
  'Discovery Call Booking',
  'Campaign Delivery',
  'Copywriting & Sequences',
  'Domain & Warmup Management',
];

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const {
    companies,
    contacts,
    teamMembers,
    addClient,
    addCompany,
    addContact,
    setSelectedClientId,
  } = useRevRecoveryStore();

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('B2B SaaS');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTitle, setContactTitle] = useState('Founder / CEO');
  const [accountOwner, setAccountOwner] = useState(teamMembers[0]?.name || 'Sarah Jenkins');
  const [monthlyValue, setMonthlyValue] = useState<number>(5000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [renewalDate, setRenewalDate] = useState(
    new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0]
  );
  const [servicesPurchased, setServicesPurchased] = useState<string[]>([
    'Lead Research & Verification',
    'Outbound Outreach',
    'Discovery Call Booking',
  ]);
  const [targetMarket, setTargetMarket] = useState('');
  const [currentObjectives, setCurrentObjectives] = useState('');
  const [successMetrics, setSuccessMetrics] = useState('15 verified meetings/month with 85%+ ICP accuracy');
  const [internalNotes, setInternalNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleService = (service: string) => {
    setServicesPurchased((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMsg('Company Name is required.');
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setErrorMsg('A valid primary contact email is required for the client record.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      // 1. Locate existing company or create a new one
      let company = companies.find(
        (c) => c.name.toLowerCase() === companyName.trim().toLowerCase()
      );
      if (!company) {
        company = await addCompany({
          name: companyName.trim(),
          industry: industry.trim() || 'B2B Services',
          website: website.trim() ? (website.startsWith('http') ? website : `https://${website}`) : undefined,
          verificationStatus: 'Verified',
        });
      }

      // 2. Locate or create contact
      let contact = contacts.find(
        (c) => c.email.toLowerCase() === contactEmail.trim().toLowerCase()
      );
      if (!contact) {
        contact = await addContact({
          name: contactName.trim() || contactEmail.split('@')[0],
          email: contactEmail.trim().toLowerCase(),
          title: contactTitle.trim() || 'Client Lead',
          companyId: company.id,
        });
      }

      // 3. Create the Client record
      // NOTE: Creating a client must NOT automatically create a client login or grant portal access!
      // portalAccessStatus is explicitly set to 'Not Invited'
      const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const newClient = await addClient({
        companyId: company.id,
        primaryContactId: contact.id,
        contactEmail: contact.email,
        portalAccessStatus: 'Not Invited',
        portalUserIds: [],
        servicesPurchased,
        commercialTerms: `$${(monthlyValue || 5000).toLocaleString()}/mo retainer commitment`,
        contractStatus: 'Active',
        monthlyValue: Number(monthlyValue) || 5000,
        startDate: startDate || new Date().toISOString().split('T')[0],
        renewalDate: renewalDate || new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
        accountOwner: accountOwner || 'Sarah Jenkins',
        currentObjectives:
          currentObjectives.trim() || `Deliver qualified discovery calls for ${company.name}`,
        successMetrics: successMetrics.trim() || '15 verified meetings/month with 85%+ ICP accuracy.',
        notes: internalNotes.trim(),
        operationalMetrics: {
          id: generateId(),
          clientId: '',
          reportingPeriod: currentMonthYear,
          campaignStatus: 'Active',
          targetAccounts: 0,
          contactsReached: 0,
          totalReplies: 0,
          positiveReplies: 0,
          qualifiedProspects: 0,
          meetingsBooked: 0,
          meetingsCompleted: 0,
          dealsClosed: 0,
          revenueGenerated: 0,
          internalNotes: internalNotes.trim(),
          updatedBy: accountOwner || 'RevRecovery Team',
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
        discoveryQuestionnaire: {
          targetMarket: targetMarket.trim() || `${industry} Mid-Market`,
          idealCustomerProfile: 'B2B Tech & Enterprise Decision Makers',
          targetGeographies: 'United States, North America & Global',
          dealSizeAverage: `$${(monthlyValue * 3).toLocaleString()} ACV`,
          currentSalesProcess: 'Outbound pipeline expansion',
          monthlyMeetingGoal: '15 qualified calls/month',
          monthlyBudget: `$${(monthlyValue || 5000).toLocaleString()}`,
          constraintsAndRequirements: 'Strict ICP verification before outreach launch.',
        },
      });

      // Keep user in internal Client Management workspace, selecting the new client
      setSelectedClientId(newClient.id);
      if (onCreated) {
        onCreated(newClient.id);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create client:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create client record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Add New Client Account</h2>
              <p className="text-xs text-muted-foreground">
                Set up an internal client organization, commercial retainer, and ICP parameters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security / Workflow Notice */}
        <div className="px-6 py-2.5 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2 text-xs text-blue-400">
          <ShieldAlert className="h-4 w-4 shrink-0 text-blue-400" />
          <span>
            <strong>Portal Security:</strong> Creating this client will <em>NOT</em> grant portal access or send login emails automatically. Access is granted manually with status <strong>Not Invited</strong>.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Company Profile */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-1.5">
              <Building className="h-3.5 w-3.5 text-primary" />
              Company Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Scale Media"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Industry / Vertical</label>
                <input
                  type="text"
                  placeholder="e.g. B2B SaaS, FinTech, Cybersecurity"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-muted-foreground font-medium mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. apexscale.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Primary Client Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-1.5">
              <User className="h-3.5 w-3.5 text-emerald-500" />
              Primary Client Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Blake"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Contact Email *</label>
                <div className="relative">
                  <Mail className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="jordan@client.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Founder & CEO"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Terms & Delivery */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-1.5">
              <DollarSign className="h-3.5 w-3.5 text-amber-500" />
              Commercial Retainer & Account Owner
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Monthly Retainer ($)</label>
                <div className="relative">
                  <DollarSign className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">RevRecovery Account Owner</label>
                <select
                  value={accountOwner}
                  onChange={(e) => setAccountOwner(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                  <option value="Sarah Jenkins">Sarah Jenkins (Account Lead)</option>
                  <option value="Sanskar Anand">Sanskar Anand (Founder)</option>
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Campaign Start Date</label>
                <div className="relative">
                  <Calendar className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Services Purchased */}
          <div className="space-y-2">
            <label className="block text-muted-foreground font-medium">Services Purchased</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_SERVICES.map((service) => {
                const isSelected = servicesPurchased.includes(service);
                return (
                  <button
                    type="button"
                    key={service}
                    onClick={() => toggleService(service)}
                    className={`px-3 py-2 rounded-lg text-left text-xs border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                        : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{service}</span>
                    <span className="text-[10px] font-mono">{isSelected ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Target Market & Success Metrics */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-1.5">
              <Target className="h-3.5 w-3.5 text-blue-500" />
              Campaign Objectives & Targets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Target Market / ICP Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Series A/B Fintech Founders in North America"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Success Metric / Monthly Meeting Goal</label>
                <input
                  type="text"
                  placeholder="e.g. 15 qualified discovery calls/month"
                  value={successMetrics}
                  onChange={(e) => setSuccessMetrics(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Internal Notes (Hidden from Client) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-muted-foreground font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-500" />
                Internal Team Notes
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono">
                Hidden from Client
              </span>
            </div>
            <textarea
              rows={2}
              placeholder="Internal notes regarding onboarding, account owner assignments, or commercial negotiations..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Client Account...</span>
                </>
              ) : (
                <>
                  <Building className="h-3.5 w-3.5" />
                  <span>Save Client Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
