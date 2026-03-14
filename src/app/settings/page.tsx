'use client';

import { useState, useEffect } from 'react';
import { User, Building, Bell, Shield, Palette, Key, Save, Moon, Sun, Globe, CreditCard, Check, Zap, Users, Briefcase, TrendingUp, ExternalLink, AlertTriangle, Monitor } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme';
import { PLAN_LIMITS, type PlanLimits } from '@/lib/subscription/limits';
import type { Plan } from '@/types';

interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
}

interface OrganizationSettings {
  name: string;
  website: string;
  industry: string;
  size: string;
}

interface NotificationSettings {
  emailNewCandidate: boolean;
  emailInterviewScheduled: boolean;
  emailWeeklyDigest: boolean;
  pushNewCandidate: boolean;
  pushScoreUpdates: boolean;
}

interface ScoringWeights {
  sdi: number;
  csig: number;
  iae: number;
  cta: number;
  err: number;
}

interface BillingInfo {
  isStripeConfigured: boolean;
  currentPlan: Plan;
  planStatus: string;
  customerId: string | null;
  subscriptionId: string | null;
  usage: {
    candidates: { used: number; limit: number; percentage: number };
    jobs: { used: number; limit: number; percentage: number };
    users: { used: number; limit: number; percentage: number };
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'billing' | 'notifications' | 'scoring' | 'security' | 'appearance'>('profile');
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  
  const [userSettings, setUserSettings] = useState<UserSettings>({
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@trajectiq.com',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
  });
  
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: 'Demo Company',
    website: 'https://democompany.com',
    industry: 'Technology',
    size: '51-200',
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNewCandidate: true,
    emailInterviewScheduled: true,
    emailWeeklyDigest: false,
    pushNewCandidate: true,
    pushScoreUpdates: true,
  });
  
  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>({
    sdi: 40,
    csig: 15,
    iae: 20,
    cta: 15,
    err: 10,
  });

  // Fetch billing info
  useEffect(() => {
    if (activeTab === 'billing') {
      fetchBillingInfo();
    }
  }, [activeTab]);

  const fetchBillingInfo = async () => {
    setLoadingBilling(true);
    try {
      const response = await fetch('/api/billing');
      const data = await response.json();
      if (data.success) {
        setBillingInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch billing info:', error);
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });
      const data = await response.json();
      if (data.success && data.data.portalUrl) {
        window.location.href = data.data.portalUrl;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', plan }),
      });
      const data = await response.json();
      if (data.success && data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const totalWeight = scoringWeights.sdi + scoringWeights.csig + scoringWeights.iae + scoringWeights.cta + scoringWeights.err;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'scoring', label: 'Scoring Weights', icon: Shield },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const getPlanBadgeColor = (plan: Plan) => {
    switch (plan) {
      case 'ENTERPRISE': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
      case 'PROFESSIONAL': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
      case 'STARTER': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="page-header animate-fade-in">
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage your account and application preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0 animate-fade-in-up stagger-1">
            <div className="card p-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 animate-fade-in-up stagger-2">
            <div className="card">
              <div className="card-content">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>
                      <p className="text-sm text-muted-foreground">Update your personal information</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {userSettings.firstName[0]}{userSettings.lastName[0]}
                      </div>
                      <div>
                        <button className="btn-outline btn-md">Change Photo</button>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          value={userSettings.firstName}
                          onChange={(e) => setUserSettings({ ...userSettings, firstName: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          value={userSettings.lastName}
                          onChange={(e) => setUserSettings({ ...userSettings, lastName: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          value={userSettings.email}
                          onChange={(e) => setUserSettings({ ...userSettings, email: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                          type="tel"
                          value={userSettings.phone}
                          onChange={(e) => setUserSettings({ ...userSettings, phone: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group md:col-span-2">
                        <label className="form-label">Timezone</label>
                        <select
                          value={userSettings.timezone}
                          onChange={(e) => setUserSettings({ ...userSettings, timezone: e.target.value })}
                          className="form-select"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Organization Tab */}
                {activeTab === 'organization' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Organization Settings</h2>
                      <p className="text-sm text-muted-foreground">Manage your organization details</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label">Organization Name</label>
                        <input
                          type="text"
                          value={orgSettings.name}
                          onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Website</label>
                        <input
                          type="url"
                          value={orgSettings.website}
                          onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Industry</label>
                        <select
                          value={orgSettings.industry}
                          onChange={(e) => setOrgSettings({ ...orgSettings, industry: e.target.value })}
                          className="form-select"
                        >
                          <option value="Technology">Technology</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Finance">Finance</option>
                          <option value="Education">Education</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Company Size</label>
                        <select
                          value={orgSettings.size}
                          onChange={(e) => setOrgSettings({ ...orgSettings, size: e.target.value })}
                          className="form-select"
                        >
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="500+">500+ employees</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Billing & Subscription</h2>
                      <p className="text-sm text-muted-foreground">Manage your subscription and billing</p>
                    </div>

                    {loadingBilling ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="spinner spinner-lg" />
                      </div>
                    ) : (
                      <>
                        {/* Current Plan */}
                        <div className="bg-muted/30 rounded-xl p-5 border border-border">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground">
                                    {PLAN_LIMITS[billingInfo?.currentPlan || 'FREE'].name} Plan
                                  </p>
                                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getPlanBadgeColor(billingInfo?.currentPlan || 'FREE'))}>
                                    {billingInfo?.planStatus || 'ACTIVE'}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  ${PLAN_LIMITS[billingInfo?.currentPlan || 'FREE'].price}/month
                                </p>
                              </div>
                            </div>
                            {billingInfo?.subscriptionId && (
                              <button 
                                onClick={handleManageSubscription}
                                className="btn-outline btn-md flex items-center gap-2"
                              >
                                Manage
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Usage Stats */}
                          {billingInfo?.usage && (
                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Candidates</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full rounded-full", getUsageColor(billingInfo.usage.candidates.percentage))}
                                      style={{ width: `${Math.min(billingInfo.usage.candidates.percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-foreground">
                                    {billingInfo.usage.candidates.used}/{billingInfo.usage.candidates.limit === Infinity ? '∞' : billingInfo.usage.candidates.limit}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Jobs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full rounded-full", getUsageColor(billingInfo.usage.jobs.percentage))}
                                      style={{ width: `${Math.min(billingInfo.usage.jobs.percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-foreground">
                                    {billingInfo.usage.jobs.used}/{billingInfo.usage.jobs.limit === Infinity ? '∞' : billingInfo.usage.jobs.limit}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Users</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full rounded-full", getUsageColor(billingInfo.usage.users.percentage))}
                                      style={{ width: `${Math.min(billingInfo.usage.users.percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-foreground">
                                    {billingInfo.usage.users.used}/{billingInfo.usage.users.limit === Infinity ? '∞' : billingInfo.usage.users.limit}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Upgrade Plans */}
                        {(billingInfo?.currentPlan === 'FREE' || !billingInfo?.subscriptionId) && (
                          <div>
                            <h3 className="font-semibold text-foreground mb-4">Upgrade Your Plan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {(Object.entries(PLAN_LIMITS) as [Plan, PlanLimits][]).filter(([key]) => key !== 'FREE').map(([planKey, plan]) => (
                                <div 
                                  key={planKey}
                                  className="bg-muted/30 rounded-xl p-5 border border-border hover:border-primary/30 transition-all"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-foreground">{plan.name}</h4>
                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getPlanBadgeColor(planKey))}>
                                      {planKey}
                                    </span>
                                  </div>
                                  <div className="mb-4">
                                    <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                                    <span className="text-sm text-muted-foreground">/month</span>
                                  </div>
                                  <ul className="space-y-2 mb-4">
                                    <li className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      {plan.maxCandidates === -1 ? 'Unlimited' : plan.maxCandidates} candidates
                                    </li>
                                    <li className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      {plan.maxJobs === -1 ? 'Unlimited' : plan.maxJobs} jobs
                                    </li>
                                    <li className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} team members
                                    </li>
                                  </ul>
                                  <button 
                                    onClick={() => handleUpgrade(planKey)}
                                    className="btn-primary btn-md w-full"
                                  >
                                    Upgrade
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Billing Not Configured */}
                        {!billingInfo?.isStripeConfigured && (
                          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/20">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-amber-800 dark:text-amber-200">Billing Not Configured</p>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                  Stripe billing has not been configured. Contact support to set up your subscription.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
                      <p className="text-sm text-muted-foreground">Configure how you receive notifications</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="pb-6 border-b border-border">
                        <h3 className="font-semibold text-foreground mb-4">Email Notifications</h3>
                        <div className="space-y-4">
                          {[
                            { key: 'emailNewCandidate', label: 'New candidate applications', description: 'Get notified when a new candidate applies' },
                            { key: 'emailInterviewScheduled', label: 'Interview scheduled', description: 'Get notified when interviews are scheduled' },
                            { key: 'emailWeeklyDigest', label: 'Weekly digest', description: 'Receive a weekly summary of hiring activity' },
                          ].map(item => (
                            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings[item.key as keyof NotificationSettings]}
                                onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                              />
                              <div>
                                <p className="font-medium text-foreground">{item.label}</p>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-foreground mb-4">Push Notifications</h3>
                        <div className="space-y-4">
                          {[
                            { key: 'pushNewCandidate', label: 'New candidate applications', description: 'Push notification for new candidates' },
                            { key: 'pushScoreUpdates', label: 'Score updates', description: 'Push notification when scores are updated' },
                          ].map(item => (
                            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings[item.key as keyof NotificationSettings]}
                                onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                              />
                              <div>
                                <p className="font-medium text-foreground">{item.label}</p>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scoring Weights Tab */}
                {activeTab === 'scoring' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Scoring Weights</h2>
                      <p className="text-sm text-muted-foreground">Customize the weights for each scoring component</p>
                    </div>
                    
                    <div className="bg-muted/50 rounded-xl p-4 border border-border">
                      <p className="text-sm font-mono text-foreground">
                        <span className="text-muted-foreground">Formula: </span>
                        SDI×{scoringWeights.sdi/100} + CSIG×{scoringWeights.csig/100} + IAE×{scoringWeights.iae/100} + CTA×{scoringWeights.cta/100} + ERR×{scoringWeights.err/100}
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      {[
                        { key: 'sdi', name: 'Skill Depth Index (SDI)', description: 'Measures technical depth and skill diversity' },
                        { key: 'csig', name: 'Critical Skill Gate (CSIG)', description: 'Checks if critical required skills are present' },
                        { key: 'iae', name: 'Impact Authenticity (IAE)', description: 'Evaluates quantifiable impact and achievements' },
                        { key: 'cta', name: 'Career Trajectory (CTA)', description: 'Analyzes career progression and growth' },
                        { key: 'err', name: 'Experience Relevance (ERR)', description: 'Measures relevance of past experience' },
                      ].map(component => (
                        <div key={component.key}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-foreground">{component.name}</p>
                              <p className="text-xs text-muted-foreground">{component.description}</p>
                            </div>
                            <span className="text-lg font-bold text-foreground">{scoringWeights[component.key as keyof ScoringWeights]}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={scoringWeights[component.key as keyof ScoringWeights]}
                            onChange={(e) => setScoringWeights({ ...scoringWeights, [component.key]: parseInt(e.target.value) })}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className={cn(
                      "p-4 rounded-xl text-center",
                      totalWeight === 100 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                    )}>
                      <p className="font-semibold">Total Weight: {totalWeight}%</p>
                      <p className="text-sm">{totalWeight === 100 ? 'Weights are balanced!' : 'Weights must sum to 100%'}</p>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
                      <p className="text-sm text-muted-foreground">Manage your account security</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-muted/30 rounded-xl p-5 border border-border">
                        <h3 className="font-semibold text-foreground mb-4">Change Password</h3>
                        <div className="space-y-3">
                          <input
                            type="password"
                            placeholder="Current password"
                            className="form-input"
                          />
                          <input
                            type="password"
                            placeholder="New password"
                            className="form-input"
                          />
                          <input
                            type="password"
                            placeholder="Confirm new password"
                            className="form-input"
                          />
                          <button className="btn-primary btn-md">Update Password</button>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-xl p-5 border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
                            <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                          </div>
                          <button className="btn-outline btn-md">Enable</button>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-xl p-5 border border-border">
                        <h3 className="font-semibold text-foreground mb-2">API Keys</h3>
                        <p className="text-sm text-muted-foreground mb-4">Manage API keys for integrations</p>
                        <button className="btn-outline btn-md">Generate API Key</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Appearance Settings</h2>
                      <p className="text-sm text-muted-foreground">Customize how the app looks</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-muted/30 rounded-xl p-5 border border-border">
                        <h3 className="font-semibold text-foreground mb-4">Theme</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setTheme('light')}
                            className={cn(
                              "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                              theme === 'light' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                            )}
                          >
                            <Sun className="w-6 h-6 text-amber-500" />
                            <span className="text-sm font-medium text-foreground">Light</span>
                          </button>
                          <button
                            onClick={() => setTheme('dark')}
                            className={cn(
                              "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                              theme === 'dark' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                            )}
                          >
                            <Moon className="w-6 h-6 text-blue-500" />
                            <span className="text-sm font-medium text-foreground">Dark</span>
                          </button>
                          <button
                            onClick={() => setTheme('system')}
                            className={cn(
                              "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                              theme === 'system' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                            )}
                          >
                            <Monitor className="w-6 h-6 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">System</span>
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          {theme === 'system' 
                            ? `Using system preference (currently ${resolvedTheme})` 
                            : `Currently using ${theme} theme`}
                        </p>
                      </div>
                      
                      <div className="bg-muted/30 rounded-xl p-5 border border-border">
                        <h3 className="font-semibold text-foreground mb-4">Language</h3>
                        <select className="form-select">
                          <option value="en">English (US)</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                      
                      <div className="bg-muted/30 rounded-xl p-5 border border-border">
                        <h3 className="font-semibold text-foreground mb-4">Date Format</h3>
                        <select className="form-select">
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {saved ? (
                      <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        Settings saved successfully!
                      </span>
                    ) : 'Changes will be applied immediately'}
                  </p>
                  <button 
                    onClick={handleSave}
                    className="btn-primary btn-md"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
