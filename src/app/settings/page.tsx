'use client';

import { useState } from 'react';
import { User, Building, Bell, Shield, Palette, Key, Save, Moon, Sun, Globe, CreditCard } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'notifications' | 'scoring' | 'security' | 'appearance'>('profile');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);
  
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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const totalWeight = scoringWeights.sdi + scoringWeights.csig + scoringWeights.iae + scoringWeights.cta + scoringWeights.err;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'scoring', label: 'Scoring Weights', icon: Shield },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your account and application preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Profile Settings</h2>
                    <p className="text-sm text-gray-500">Update your personal information</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {userSettings.firstName[0]}{userSettings.lastName[0]}
                    </div>
                    <div>
                      <button className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors">
                        Change Photo
                      </button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 2MB</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">First Name</label>
                      <input
                        type="text"
                        value={userSettings.firstName}
                        onChange={(e) => setUserSettings({ ...userSettings, firstName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Last Name</label>
                      <input
                        type="text"
                        value={userSettings.lastName}
                        onChange={(e) => setUserSettings({ ...userSettings, lastName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Email</label>
                      <input
                        type="email"
                        value={userSettings.email}
                        onChange={(e) => setUserSettings({ ...userSettings, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={userSettings.phone}
                        onChange={(e) => setUserSettings({ ...userSettings, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">Timezone</label>
                      <select
                        value={userSettings.timezone}
                        onChange={(e) => setUserSettings({ ...userSettings, timezone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                    <h2 className="text-lg font-semibold mb-1">Organization Settings</h2>
                    <p className="text-sm text-gray-500">Manage your organization details</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Organization Name</label>
                      <input
                        type="text"
                        value={orgSettings.name}
                        onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Website</label>
                      <input
                        type="url"
                        value={orgSettings.website}
                        onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Industry</label>
                      <select
                        value={orgSettings.industry}
                        onChange={(e) => setOrgSettings({ ...orgSettings, industry: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="Technology">Technology</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Finance">Finance</option>
                        <option value="Education">Education</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Company Size</label>
                      <select
                        value={orgSettings.size}
                        onChange={(e) => setOrgSettings({ ...orgSettings, size: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="500+">500+ employees</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">Free Plan</p>
                          <p className="text-sm text-gray-500">Upgrade to Pro for unlimited features</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium">
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Notification Preferences</h2>
                    <p className="text-sm text-gray-500">Configure how you receive notifications</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-medium mb-3">Email Notifications</h3>
                      <div className="space-y-3">
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
                              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3">Push Notifications</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'pushNewCandidate', label: 'New candidate applications', description: 'Push notification for new candidates' },
                          { key: 'pushScoreUpdates', label: 'Score updates', description: 'Push notification when scores are updated' },
                        ].map(item => (
                          <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationSettings[item.key as keyof NotificationSettings]}
                              onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
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
                    <h2 className="text-lg font-semibold mb-1">Scoring Weights</h2>
                    <p className="text-sm text-gray-500">Customize the weights for each scoring component</p>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800 mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Formula:</strong> SDI×{scoringWeights.sdi/100} + CSIG×{scoringWeights.csig/100} + IAE×{scoringWeights.iae/100} + CTA×{scoringWeights.cta/100} + ERR×{scoringWeights.err/100}
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
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="font-medium">{component.name}</p>
                            <p className="text-xs text-gray-500">{component.description}</p>
                          </div>
                          <span className="text-lg font-bold">{scoringWeights[component.key as keyof ScoringWeights]}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={scoringWeights[component.key as keyof ScoringWeights]}
                          onChange={(e) => setScoringWeights({ ...scoringWeights, [component.key]: parseInt(e.target.value) })}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className={cn(
                    "p-4 rounded-xl text-center",
                    totalWeight === 100 ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                  )}>
                    <p className="font-medium">Total Weight: {totalWeight}%</p>
                    <p className="text-sm">{totalWeight === 100 ? 'Weights are balanced!' : 'Weights must sum to 100%'}</p>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Security Settings</h2>
                    <p className="text-sm text-gray-500">Manage your account security</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium mb-2">Change Password</h3>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Current password"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <input
                          type="password"
                          placeholder="New password"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <button className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium">
                          Update Password
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-500">Add an extra layer of security</p>
                        </div>
                        <button className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors">
                          Enable
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium mb-2">API Keys</h3>
                      <p className="text-sm text-gray-500 mb-3">Manage API keys for integrations</p>
                      <button className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors">
                        Generate API Key
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Appearance Settings</h2>
                    <p className="text-sm text-gray-500">Customize how the app looks</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium mb-3">Theme</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setIsDarkMode(false)}
                          className={cn(
                            "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                            !isDarkMode ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          )}
                        >
                          <Sun className="w-6 h-6 text-yellow-500" />
                          <span className="font-medium">Light</span>
                        </button>
                        <button
                          onClick={() => setIsDarkMode(true)}
                          className={cn(
                            "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                            isDarkMode ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          )}
                        >
                          <Moon className="w-6 h-6 text-blue-500" />
                          <span className="font-medium">Dark</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium mb-3">Language</h3>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="en">English (US)</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                    
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium mb-3">Date Format</h3>
                      <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500">
                  {saved ? '✓ Settings saved successfully!' : 'Changes will be applied immediately'}
                </p>
                <button 
                  onClick={handleSave}
                  className="gradient-primary text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
