'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Plus, 
  RefreshCw, 
  Trash2, 
  X, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Link2, 
  Activity,
  Server,
  Shield,
  Eye,
  EyeOff,
  Check,
  Info,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  protocol: string;
  isConnected: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  errorMessage: string | null;
  createdAt: string;
}

interface EmailConfig {
  provider: string;
  email: string;
  protocol: 'IMAP' | 'POP3';
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL: boolean;
}

const providerOptions = [
  { id: 'GMAIL', name: 'Gmail', icon: '📧', description: 'Use Custom IMAP instead', color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400', oauth: true, comingSoon: true },
  { id: 'OUTLOOK', name: 'Outlook', icon: '📬', description: 'Use Custom IMAP instead', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', oauth: true, comingSoon: true },
  { id: 'YAHOO', name: 'Yahoo Mail', icon: '📮', description: 'Use Custom IMAP instead', color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400', oauth: true, comingSoon: true },
  { id: 'CUSTOM_IMAP', name: 'Custom IMAP', icon: '⚙️', description: 'Manual server configuration (recommended)', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', oauth: false },
  { id: 'CUSTOM_POP3', name: 'Custom POP3', icon: '📥', description: 'Manual server configuration', color: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400', oauth: false },
];

export default function EmailConnectPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  
  const [config, setConfig] = useState<EmailConfig>({
    provider: '',
    email: '',
    protocol: 'IMAP',
    host: '',
    port: 993,
    username: '',
    password: '',
    useSSL: true,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.id || !user?.organizationId) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `/api/email-accounts?userId=${user.id}&organizationId=${user.organizationId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.organizationId]);

  // Fetch accounts when user is available
  useEffect(() => {
    if (user?.id && user?.organizationId) {
      fetchAccounts();
    }
  }, [user?.id, user?.organizationId, fetchAccounts]);

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCustomProvider = selectedProvider && ['CUSTOM_IMAP', 'CUSTOM_POP3'].includes(selectedProvider);
  const isOAuthProvider = selectedProvider && !['CUSTOM_IMAP', 'CUSTOM_POP3'].includes(selectedProvider);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setConnectionStatus('idle');
    setErrorMessage('');
    setConnectionDetails(null);
    
    const protocol = providerId === 'CUSTOM_POP3' ? 'POP3' : 'IMAP';
    const defaultPort = protocol === 'IMAP' ? 993 : 995;
    
    setConfig({
      provider: providerId,
      email: '',
      protocol,
      host: '',
      port: defaultPort,
      username: '',
      password: '',
      useSSL: true,
    });
  };

  const handleConfigChange = (field: keyof EmailConfig, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setErrorMessage('');
    setConnectionDetails(null);
    
    // Validate required fields
    if (!config.email || !config.host || !config.username || !config.password) {
      setConnectionStatus('error');
      setErrorMessage('Please fill in all required fields');
      return;
    }
    
    try {
      const response = await fetch('/api/email-accounts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          protocol: config.protocol,
          useSSL: config.useSSL,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus('success');
        setConnectionDetails(data.details);
      } else {
        setConnectionStatus('error');
        setErrorMessage(data.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage('Failed to test connection. Please check your network.');
    }
  };

  const handleConnect = async () => {
    if (!selectedProvider || !user?.id || !user?.organizationId) return;
    
    setConnecting(true);
    
    try {
      if (isOAuthProvider) {
        // OAuth flow - for demo, just save the email
        const response = await fetch('/api/email-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            organizationId: user.organizationId,
            provider: selectedProvider,
            email: config.email,
            protocol: 'IMAP',
            host: null,
            port: null,
            username: null,
            password: null,
            useSSL: true,
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          await fetchAccounts();
          closeModal();
        } else {
          setErrorMessage(data.error || 'Failed to connect');
          setConnectionStatus('error');
        }
      } else if (connectionStatus === 'success') {
        // Custom IMAP/POP3 connection - save with credentials
        const response = await fetch('/api/email-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            organizationId: user.organizationId,
            provider: selectedProvider,
            email: config.email,
            protocol: config.protocol,
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            useSSL: config.useSSL,
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          await fetchAccounts();
          closeModal();
        } else {
          setErrorMessage(data.details || data.error || 'Failed to save account');
          setConnectionStatus('error');
        }
      }
    } catch (error) {
      setErrorMessage('Failed to connect. Please try again.');
      setConnectionStatus('error');
    } finally {
      setConnecting(false);
    }
  };

  const closeModal = () => {
    setShowConnectModal(false);
    setSelectedProvider(null);
    setConfig({
      provider: '',
      email: '',
      protocol: 'IMAP',
      host: '',
      port: 993,
      username: '',
      password: '',
      useSSL: true,
    });
    setConnectionStatus('idle');
    setErrorMessage('');
    setConnectionDetails(null);
    setShowPassword(false);
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    
    try {
      const response = await fetch('/api/email-accounts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh accounts
        await fetchAccounts();
      } else {
        console.error('Sync failed:', data.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await fetch(`/api/email-accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      await fetchAccounts();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this email account?')) return;
    
    try {
      await fetch(`/api/email-accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      await fetchAccounts();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getProviderName = (provider: string) => {
    return providerOptions.find(p => p.id === provider)?.name || provider;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const getSyncStatusBadge = (status: string) => {
    const statusConfig: Record<string, { class: string; label: string }> = {
      'SYNCED': { class: 'status-active', label: 'Synced' },
      'PENDING': { class: 'status-screening', label: 'Pending' },
      'SYNCING': { class: 'status-new', label: 'Syncing' },
      'ERROR': { class: 'status-rejected', label: 'Error' },
    };
    return statusConfig[status] || { class: 'status-closed', label: status };
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="page-header flex items-start justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h1 className="page-title">Email Connect</h1>
            <p className="page-description">Connect your email accounts to automatically import candidate resumes</p>
          </div>
          <button 
            onClick={() => setShowConnectModal(true)}
            className="btn-primary btn-md"
          >
            <Plus className="w-4 h-4" />
            Connect Email
          </button>
        </div>

        {/* Connection Info */}
        <div className="card bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 animate-fade-in-up stagger-1">
          <div className="card-content">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">Supported Email Protocols</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  <strong>IMAP</strong> (recommended) syncs all folders and keeps emails on server. 
                  <strong> POP3</strong> downloads emails and removes from server. 
                  For Gmail, Outlook, and Yahoo, we use secure OAuth 2.0 authentication.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Accounts List */}
        <div className="card animate-fade-in-up stagger-2">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="card-title">Connected Accounts</h2>
              <p className="card-description">Manage your email connections</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link2 className="w-4 h-4" />
              {accounts.filter(a => a.isConnected).length} active
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="empty-state-title">No email accounts connected</h3>
              <p className="empty-state-description">Connect your first email account to start importing resumes</p>
              <button 
                onClick={() => setShowConnectModal(true)}
                className="btn-primary btn-md"
              >
                <Plus className="w-4 h-4" />
                Connect Email
              </button>
            </div>
          ) : (
            <div className="data-list">
              {accounts.map((account) => {
                const statusConfig = getSyncStatusBadge(account.syncStatus);
                return (
                  <div key={account.id} className="data-list-item">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-lg",
                        account.isConnected 
                          ? "bg-emerald-100 dark:bg-emerald-500/20" 
                          : "bg-red-100 dark:bg-red-500/20"
                      )}>
                        {account.isConnected ? (
                          <Wifi className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <WifiOff className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                      <div className="data-list-item-content">
                        <div className="flex items-center gap-2">
                          <p className="data-list-item-title">{account.email}</p>
                          <span className={cn("status-badge", statusConfig.class)}>{statusConfig.label}</span>
                        </div>
                        <p className="data-list-item-subtitle">
                          {getProviderName(account.provider)} • {account.protocol}
                        </p>
                        {account.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">{account.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="data-list-item-actions">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-muted-foreground">Last synced</p>
                        <p className="text-sm font-medium">{formatDate(account.lastSyncAt)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleSync(account.id)}
                          disabled={!account.isConnected || syncing === account.id}
                          className={cn(
                            "btn-icon",
                            account.isConnected ? "" : "opacity-50 cursor-not-allowed"
                          )}
                          title="Sync now"
                        >
                          <RefreshCw className={cn("w-4 h-4", syncing === account.id && "animate-spin")} />
                        </button>
                        <button 
                          onClick={() => account.isConnected ? handleDisconnect(account.id) : handleDelete(account.id)}
                          className="btn-icon"
                          title={account.isConnected ? "Disconnect" : "Delete"}
                        >
                          {account.isConnected ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sync Activity */}
        <div className="card animate-fade-in-up stagger-3">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="card-title">How It Works</h2>
              <p className="card-description">Email-based hiring workflow</p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="card-content">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Connect Email</h4>
                  <p className="text-sm text-muted-foreground">Link your email account with IMAP or POP3</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Auto Sync</h4>
                  <p className="text-sm text-muted-foreground">Emails with attachments are automatically detected</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Parse & Score</h4>
                  <p className="text-sm text-muted-foreground">Resumes are parsed and candidates are scored</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Email Modal */}
      {showConnectModal && (
        <>
          <div className="modal-overlay" onClick={closeModal} />
          <div className="modal-container max-w-xl">
            <div className="modal-header">
              <h3 className="modal-title">Connect Email Account</h3>
              <p className="modal-description">Link your email to automatically import candidate resumes</p>
            </div>
            
            <div className="modal-body">
              {!selectedProvider ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">Select your email provider:</p>
                  <div className="space-y-2">
                    {providerOptions.map(provider => (
                      <button
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-left group"
                      >
                        <span className="text-2xl">{provider.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{provider.name}</p>
                            {provider.oauth && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">Coming Soon</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{provider.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => { setSelectedProvider(null); setConnectionStatus('idle'); setErrorMessage(''); }}
                    className="text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                  >
                    ← Back to providers
                  </button>
                  
                  {/* OAuth provider (Gmail, Outlook, Yahoo) */}
                  {isOAuthProvider && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <p className="font-medium text-amber-700 dark:text-amber-300">OAuth Not Yet Available</p>
                        </div>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          OAuth integration is coming soon. For now, please use <strong>&quot;Custom IMAP&quot;</strong> with your email provider&apos;s IMAP settings and an app password to sync emails.
                        </p>
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          value={config.email}
                          onChange={(e) => handleConfigChange('email', e.target.value)}
                          placeholder="your@email.com"
                          className="form-input"
                        />
                      </div>
                      
                      <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                        <p className="font-medium mb-1">💡 Common IMAP Settings:</p>
                        <ul className="space-y-1 text-xs">
                          <li><strong>Gmail:</strong> imap.gmail.com, port 993, SSL on, use App Password</li>
                          <li><strong>Outlook:</strong> outlook.office365.com, port 993, SSL on</li>
                          <li><strong>Yahoo:</strong> imap.mail.yahoo.com, port 993, SSL on</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Custom IMAP/POP3 Configuration */}
                  {isCustomProvider && (
                    <div className="space-y-4">
                      {/* Email */}
                      <div className="form-group">
                        <label className="form-label">Email Address *</label>
                        <input
                          type="email"
                          value={config.email}
                          onChange={(e) => handleConfigChange('email', e.target.value)}
                          placeholder="your@email.com"
                          className="form-input"
                        />
                      </div>
                      
                      {/* Protocol Info */}
                      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Server className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {config.protocol} Configuration
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {config.protocol === 'IMAP' 
                              ? 'Syncs all folders, keeps emails on server' 
                              : 'Downloads emails, removes from server'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Host & Port */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="form-group">
                          <label className="form-label">Server Host *</label>
                          <input
                            type="text"
                            value={config.host}
                            onChange={(e) => handleConfigChange('host', e.target.value)}
                            placeholder={config.protocol === 'IMAP' ? 'imap.example.com' : 'pop.example.com'}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Port *</label>
                          <input
                            type="number"
                            value={config.port}
                            onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 0)}
                            placeholder={config.protocol === 'IMAP' ? '993' : '995'}
                            className="form-input"
                          />
                        </div>
                      </div>
                      
                      {/* SSL Toggle */}
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">Use SSL/TLS</p>
                          <p className="text-xs text-muted-foreground">Recommended for secure connections</p>
                        </div>
                        <button
                          onClick={() => handleConfigChange('useSSL', !config.useSSL)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            config.useSSL ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <span className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                            config.useSSL ? "translate-x-7" : "translate-x-1"
                          )} />
                        </button>
                      </div>
                      
                      {/* Username */}
                      <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input
                          type="text"
                          value={config.username}
                          onChange={(e) => handleConfigChange('username', e.target.value)}
                          placeholder="Usually your email address"
                          className="form-input"
                        />
                      </div>
                      
                      {/* Password */}
                      <div className="form-group">
                        <label className="form-label">Password *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={config.password}
                            onChange={(e) => handleConfigChange('password', e.target.value)}
                            placeholder="Enter your password"
                            className="form-input pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="form-hint">For Gmail, use an App Password from your Google Account settings</p>
                      </div>
                      
                      {/* Connection Status */}
                      {connectionStatus !== 'idle' && (
                        <div className={cn(
                          "p-3 rounded-lg border",
                          connectionStatus === 'testing' && "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
                          connectionStatus === 'success' && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
                          connectionStatus === 'error' && "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                        )}>
                          <div className="flex items-center gap-2">
                            {connectionStatus === 'testing' && (
                              <>
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                <span className="text-sm text-blue-700 dark:text-blue-300">Testing connection...</span>
                              </>
                            )}
                            {connectionStatus === 'success' && (
                              <>
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                                  Connection successful!
                                  {connectionDetails && (
                                    <span className="block text-xs mt-1">
                                      {connectionDetails.serverType} • {connectionDetails.folderCount || 0} folders • {connectionDetails.messageCount || 0} messages
                                    </span>
                                  )}
                                </span>
                              </>
                            )}
                            {connectionStatus === 'error' && (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-700 dark:text-red-300">{errorMessage}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Test Connection Button */}
                      <button
                        onClick={testConnection}
                        disabled={connectionStatus === 'testing'}
                        className="btn-outline btn-md w-full"
                      >
                        {connectionStatus === 'testing' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Server className="w-4 h-4" />
                            Test Connection
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={closeModal}
                className="btn-outline btn-md"
              >
                Cancel
              </button>
              {selectedProvider && (
                <button 
                  onClick={handleConnect}
                  disabled={
                    connecting || 
                    (isOAuthProvider === true && !config.email) ||
                    (isCustomProvider === true && connectionStatus !== 'success') ||
                    false
                  }
                  className="btn-primary btn-md"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Connect & Save
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
