'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  User,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  FileText,
  Target,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useRevRecoveryStore } from '@/stores/revrecoveryStore';
import { Client, Company, Contact } from '@/types/revrecovery';

interface EditClientModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
}

const AVAILABLE_SERVICES = [
  'Lead Research & Verification',
  'Outbound Outreach',
  'Discovery Call Booking',
  'Campaign Delivery',
  'Copywriting & Sequences',
  'Domain & Warmup Management',
];

export const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  client,
  onClose,
}) => {
  const {
    companies,
    contacts,
    teamMembers,
    updateClient,
    updateCompany,
    updateContact,
    addContact,
  } = useRevRecoveryStore();

  const company = client ? companies.find((c) => c.id === client.companyId) : null;
  const primaryContact = client?.primaryContactId
    ? contacts.find((c) => c.id === client.primaryContactId)
    : contacts.find((c) => c.companyId === client?.companyId) || null;

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [monthlyValue, setMonthlyValue] = useState<number>(6500);
  const [currency, setCurrency] = useState('USD');
  const [contractStatus, setContractStatus] = useState<'Active' | 'Pending Renewal' | 'Paused' | 'Terminated'>('Active');
  const [startDate, setStartDate] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [servicesPurchased, setServicesPurchased] = useState<string[]>([]);
  const [currentObjectives, setCurrentObjectives] = useState('');
  const [successMetrics, setSuccessMetrics] = useState('');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client) {
      setCompanyName(company?.name || '');
      setIndustry(company?.industry || 'B2B SaaS');
      setTargetMarket(client.discoveryQuestionnaire?.targetMarket || '');
      setContactName(primaryContact?.name || '');
      setContactEmail(primaryContact?.email || '');
      setContactPhone(primaryContact?.phone || '');
      setContactTitle(primaryContact?.title || 'Decision Maker');
      setAccountOwner(client.accountOwner || teamMembers[0]?.name || 'Sanskar Anand');
      setMonthlyValue(client.monthlyValue || 6500);
      setCurrency(client.currency || 'USD');
      setContractStatus(client.contractStatus || 'Active');
      setStartDate(client.startDate || new Date().toISOString().split('T')[0]);
      setRenewalDate(client.renewalDate || '');
      setServicesPurchased(client.servicesPurchased || ['Lead Research & Verification', 'Outbound Outreach']);
      setCurrentObjectives(client.currentObjectives || '');
      setSuccessMetrics(client.successMetrics || '');
      setNotes(client.notes || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, client, company, primaryContact, teamMembers]);

  if (!isOpen || !client) return null;

  const toggleService = (srv: string) => {
    if (servicesPurchased.includes(srv)) {
      setServicesPurchased(servicesPurchased.filter((s) => s !== srv));
    } else {
      setServicesPurchased([...servicesPurchased, srv]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!companyName.trim()) {
      setErrorMsg('Client company name is required.');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Update Company Record
      if (company) {
        await updateCompany(company.id, {
          name: companyName.trim(),
          industry: industry.trim(),
        });
      }

      // 2. Update / Create Primary Contact Record
      let contactId = client.primaryContactId;
      if (contactName.trim() || contactEmail.trim()) {
        if (primaryContact) {
          await updateContact(primaryContact.id, {
            name: contactName.trim() || primaryContact.name,
            email: contactEmail.trim().toLowerCase(),
            phone: contactPhone.trim(),
            title: contactTitle.trim(),
          });
          contactId = primaryContact.id;
        } else if (company) {
          const newC = await addContact({
            companyId: company.id,
            name: contactName.trim() || 'Primary Contact',
            email: contactEmail.trim().toLowerCase(),
            phone: contactPhone.trim(),
            title: contactTitle.trim() || 'Key Executive',
            assignedOwner: accountOwner,
            verificationStatus: 'Verified',
          });
          contactId = newC.id;
        }
      }

      // 3. Update Client Record
      const updatedDiscovery = {
        ...client.discoveryQuestionnaire,
        targetMarket: targetMarket.trim(),
      };

      await updateClient(client.id, {
        primaryContactId: contactId,
        accountOwner,
        monthlyValue: Number(monthlyValue) || 0,
        currency,
        commercialTerms: `$${Number(monthlyValue).toLocaleString()}/mo retainer commitment`,
        contractStatus,
        startDate,
        renewalDate,
        servicesPurchased,
        currentObjectives: currentObjectives.trim(),
        successMetrics: successMetrics.trim(),
        notes: notes.trim(),
        discoveryQuestionnaire: updatedDiscovery,
      });

      setSuccessMsg('Client record successfully updated.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update client:', err);
      setErrorMsg(err?.message || 'Failed to save client updates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center text-accent">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Edit Client Account</h2>
              <p className="text-[11px] text-muted-foreground">
                Update account parameters, commercials, primary contact, and campaign scope
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Company & Profile */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-border">
              <Building className="w-3.5 h-3.5 text-accent" /> Client Company Identity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. B2B SaaS, HealthTech"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-muted-foreground font-medium">Target Market / Audience</label>
                <input
                  type="text"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  placeholder="e.g. US Mid-Market HR & People Leaders"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Primary Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-border">
              <User className="w-3.5 h-3.5 text-accent" /> Primary Client Contact
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Contact Full Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Michael Chang"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Job Title</label>
                <input
                  type="text"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  placeholder="e.g. Head of Growth / VP Sales"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Email Address</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Phone Number</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Commercials & Engagement */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-border">
              <DollarSign className="w-3.5 h-3.5 text-accent" /> Commercials & Terms
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Monthly Retainer ($)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={monthlyValue}
                  onChange={(e) => setMonthlyValue(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Contract Status</label>
                <select
                  value={contractStatus}
                  onChange={(e) => setContractStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Pending Renewal">Pending Renewal</option>
                  <option value="Paused">Paused</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Account Owner</label>
                <select
                  value={accountOwner}
                  onChange={(e) => setAccountOwner(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Renewal Date</label>
                <input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Services Purchased */}
          <div className="space-y-2">
            <label className="text-muted-foreground font-medium block">Services Purchased</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SERVICES.map((srv) => {
                const isSelected = servicesPurchased.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => toggleService(srv)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? 'bg-accent/15 border-accent text-accent font-semibold'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {srv}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Strategic Objectives & Metrics */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-border">
              <Target className="w-3.5 h-3.5 text-accent" /> Objectives & Deliverables
            </h3>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Client Objectives</label>
                <textarea
                  rows={2}
                  value={currentObjectives}
                  onChange={(e) => setCurrentObjectives(e.target.value)}
                  placeholder="e.g. Deliver qualified discovery calls and scale outbound pipeline"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Success Metric</label>
                <input
                  type="text"
                  value={successMetrics}
                  onChange={(e) => setSuccessMetrics(e.target.value)}
                  placeholder="e.g. Minimum 15 verified meetings/month with 85%+ ICP accuracy"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Internal Strategic Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Account nuances, key contacts, messaging points..."
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted border border-border transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg font-semibold bg-accent text-accent-foreground hover:opacity-90 shadow-sm transition-opacity flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Client Details</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
