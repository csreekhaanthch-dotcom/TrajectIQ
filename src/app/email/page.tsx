'use client';

import { useState } from 'react';
import { Mail, Plus, RefreshCw, Trash2, Check, X, AlertCircle, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  isConnected: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  emailsProcessed: number;
}

const mockEmailAccounts: EmailAccount[] = [
  { id: '1', provider: 'GMAIL', email: 'recruiting@company.com', isConnected: true, lastSyncAt: '2024-01-15T10:30:00Z', syncStatus: 'SYNCED', emailsProcessed: 234 },
  { id: '2', provider: 'OUTLOOK', email: 'hr@company.com', isConnected: true, lastSyncAt: '2024-01-15T09:45:00Z', syncStatus: 'SYNCED', emailsProcessed: 156 },
  { id: '3', provider: 'GMAIL', email: 'jobs@company.com', isConnected: false, lastSyncAt: null, syncStatus: 'ERROR', emailsProcessed: 0 },
];

const providerOptions = [
  { id: 'GMAIL', name: 'Gmail', icon: '📧', description: 'Connect your Gmail account' },
  { id: 'OUTLOOK', name: 'Outlook', icon: '📬', description: 'Connect your Outlook account' },
  { id: 'YAHOO', name: 'Yahoo Mail', icon: '📮', description: 'Connect your Yahoo Mail' },
  { id: 'CUSTOM_IMAP', name: 'Custom IMAP', icon: '⚙️', description: 'Connect via IMAP settings' },
];

export default function EmailConnectPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>(mockEmailAccounts);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleConnect = () => {
    if (!selectedProvider || !emailAddress) return;
    
    const newAccount: EmailAccount = {
      id: Date.now().toString(),
      provider: selectedProvider,
      email: emailAddress,
      isConnected: true,
      lastSyncAt: null,
      syncStatus: 'PENDING',
      emailsProcessed: 0,
    };
    
    setAccounts([...accounts, newAccount]);
    setShowConnectModal(false);
    setSelectedProvider(null);
    setEmailAddress('');
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    // Simulate sync
    setTimeout(() => {
      setAccounts(accounts.map(acc => 
        acc.id === accountId 
          ? { ...acc, lastSyncAt: new Date().toISOString(), syncStatus: 'SYNCED' }
          : acc
      ));
      setSyncing(null);
    }, 2000);
  };

  const handleDisconnect = (accountId: string) => {
    setAccounts(accounts.map(acc => 
      acc.id === accountId 
        ? { ...acc, isConnected: false, syncStatus: 'ERROR' }
        : acc
    ));
  };

  const handleDelete = (accountId: string) => {
    setAccounts(accounts.filter(acc => acc.id !== accountId));
  };

  const getProviderName = (provider: string) => {
    return providerOptions.find(p => p.id === provider)?.name || provider;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Email Connect</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Connect your email accounts to automatically import candidate resumes
            </p>
          </div>
          <button 
            onClick={() => setShowConnectModal(true)}
            className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Connect Email
          </button>
        </div>

        {/* Email Accounts List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold">Connected Accounts</h2>
          </div>
          
          {accounts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No email accounts connected</h3>
              <p className="text-sm text-gray-500 mb-4">Connect your first email account to start importing resumes</p>
              <button 
                onClick={() => setShowConnectModal(true)}
                className="gradient-primary text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                Connect Email
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {accounts.map((account) => (
                <div key={account.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
                        account.isConnected 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-red-100 dark:bg-red-900/30"
                      )}>
                        {account.isConnected ? '✅' : '❌'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{account.email}</p>
                          <StatusBadge status={account.syncStatus} type="sync" />
                        </div>
                        <p className="text-sm text-gray-500">{getProviderName(account.provider)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-500">Last synced</p>
                        <p className="text-sm font-medium">{formatDate(account.lastSyncAt)}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-500">Emails processed</p>
                        <p className="text-sm font-medium">{account.emailsProcessed}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleSync(account.id)}
                          disabled={!account.isConnected || syncing === account.id}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            account.isConnected 
                              ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" 
                              : "opacity-50 cursor-not-allowed"
                          )}
                          title="Sync now"
                        >
                          <RefreshCw className={cn("w-4 h-4", syncing === account.id && "animate-spin")} />
                        </button>
                        <button 
                          onClick={() => account.isConnected ? handleDisconnect(account.id) : handleDelete(account.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                          title={account.isConnected ? "Disconnect" : "Delete"}
                        >
                          {account.isConnected ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: 'Resume parsed', candidate: 'John Smith', job: 'Senior Software Engineer', time: '5 min ago' },
              { action: 'Email processed', candidate: 'Jane Doe', job: 'Full Stack Developer', time: '15 min ago' },
              { action: 'New candidate detected', candidate: 'Mike Johnson', job: 'Python Developer', time: '30 min ago' },
              { action: 'Sync completed', candidate: '', job: 'recruiting@company.com', time: '1 hour ago' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  {activity.candidate && (
                    <p className="text-xs text-gray-500">{activity.candidate} - {activity.job}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connect Email Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Connect Email Account</h3>
            
            {!selectedProvider ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Select your email provider:</p>
                <div className="space-y-2">
                  {providerOptions.map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <span className="text-2xl">{provider.icon}</span>
                      <div className="text-left">
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-xs text-gray-500">{provider.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setSelectedProvider(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  ← Back to providers
                </button>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">OAuth Authentication</p>
                    <p className="text-blue-600 dark:text-blue-400">You will be redirected to {getProviderName(selectedProvider)} to authorize access.</p>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => { setShowConnectModal(false); setSelectedProvider(null); setEmailAddress(''); }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              {selectedProvider && (
                <button 
                  onClick={handleConnect}
                  disabled={!emailAddress}
                  className="flex-1 py-2.5 px-4 rounded-xl gradient-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
