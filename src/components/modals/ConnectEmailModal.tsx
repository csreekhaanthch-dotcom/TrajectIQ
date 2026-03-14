'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type EmailProvider = 'GMAIL' | 'OUTLOOK' | 'CUSTOM_IMAP';

const providers = [
  { 
    id: 'GMAIL' as EmailProvider, 
    name: 'Gmail', 
    icon: '📧',
    description: 'Connect your Google account',
    popular: true 
  },
  { 
    id: 'OUTLOOK' as EmailProvider, 
    name: 'Outlook', 
    icon: '📮',
    description: 'Connect your Microsoft account',
    popular: true 
  },
  { 
    id: 'CUSTOM_IMAP' as EmailProvider, 
    name: 'IMAP', 
    icon: '📬',
    description: 'Connect any email provider',
    popular: false 
  },
];

export function ConnectEmailModal({ isOpen, onClose, onSuccess }: ConnectEmailModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const [step, setStep] = useState<'select' | 'configure' | 'connecting' | 'success' | 'error'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    imapHost: '',
    imapPort: '993',
    smtpHost: '',
    smtpPort: '587',
  });

  // Get session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserId(data.user?.id);
          setOrganizationId(data.user?.organizationId);
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
      }
    };
    
    if (isOpen) {
      fetchSession();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderSelect = (provider: EmailProvider) => {
    setSelectedProvider(provider);
    setError(null);
    
    if (provider === 'GMAIL' || provider === 'OUTLOOK') {
      // For Gmail/Outlook, we need email to simulate OAuth
      setStep('configure');
    } else {
      setStep('configure');
    }
  };

  const testConnection = async (): Promise<boolean> => {
    try {
      // Test connection first
      const testResponse = await fetch('/api/email-accounts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          host: formData.imapHost || 'imap.gmail.com',
          port: parseInt(formData.imapPort) || 993,
          username: formData.email,
          password: formData.password || 'demo-password',
          protocol: 'IMAP',
          useSSL: true,
        }),
      });

      const testResult = await testResponse.json();
      
      if (!testResult.success) {
        setError(testResult.error || 'Connection test failed');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Connection test error:', err);
      setError('Failed to test connection');
      return false;
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setStep('connecting');
    setError(null);

    try {
      // For Gmail/Outlook, test connection (simulates OAuth)
      // For IMAP, test the actual connection
      const testOk = await testConnection();
      
      if (!testOk) {
        setStep('error');
        setLoading(false);
        return;
      }

      // Save the email account
      const response = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'demo-user',
          organizationId: organizationId || 'demo-org',
          provider: selectedProvider,
          email: formData.email,
          protocol: 'IMAP',
          host: formData.imapHost,
          port: parseInt(formData.imapPort) || 993,
          username: formData.email,
          password: formData.password || 'demo-password',
          useSSL: true,
          isConnected: true,
          syncStatus: 'PENDING',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
          // Reset
          setStep('select');
          setSelectedProvider(null);
          setFormData({
            email: '',
            password: '',
            imapHost: '',
            imapPort: '993',
            smtpHost: '',
            smtpPort: '587',
          });
        }, 1500);
      } else {
        setError(result.error || 'Failed to save connection');
        setStep('error');
      }
    } catch (err) {
      console.error('Failed to connect email:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setError(null);
  };

  const isOAuthProvider = selectedProvider === 'GMAIL' || selectedProvider === 'OUTLOOK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose} />
      
      <div className="modal w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Connect Email</h2>
              <p className="text-sm text-muted-foreground">
                {step === 'select' && 'Choose your email provider'}
                {step === 'configure' && 'Enter your credentials'}
                {step === 'connecting' && 'Connecting...'}
                {step === 'success' && 'Connected!'}
                {step === 'error' && 'Connection failed'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Select Provider */}
        {step === 'select' && (
          <div className="space-y-3">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                  "hover:border-primary/50 hover:bg-secondary/50",
                  selectedProvider === provider.id && "border-primary bg-primary/5"
                )}
              >
                <span className="text-2xl">{provider.icon}</span>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {provider.popular && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Popular
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{provider.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: Configure */}
        {step === 'configure' && (
          <div className="space-y-4">
            {isOAuthProvider && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border mb-4">
                <p className="text-sm text-muted-foreground">
                  📧 Enter your {providers.find(p => p.id === selectedProvider)?.name} email to connect. 
                  In production, this would use OAuth authentication.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-base"
                placeholder="your@email.com"
              />
            </div>
            
            {!isOAuthProvider && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password / App Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-base"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">IMAP Host</label>
                    <input
                      type="text"
                      value={formData.imapHost}
                      onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                      className="input-base"
                      placeholder="imap.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">IMAP Port</label>
                    <input
                      type="text"
                      value={formData.imapPort}
                      onChange={(e) => setFormData({ ...formData, imapPort: e.target.value })}
                      className="input-base"
                      placeholder="993"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">SMTP Host</label>
                    <input
                      type="text"
                      value={formData.smtpHost}
                      onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      className="input-base"
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">SMTP Port</label>
                    <input
                      type="text"
                      value={formData.smtpPort}
                      onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                      className="input-base"
                      placeholder="587"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="btn-outline px-4 py-2.5"
              >
                Back
              </button>
              <button
                onClick={handleConnect}
                disabled={loading || !formData.email}
                className="btn-primary px-6 py-2.5"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Connecting */}
        {step === 'connecting' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 spinner mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isOAuthProvider
                ? `Connecting to ${providers.find(p => p.id === selectedProvider)?.name}...`
                : 'Verifying credentials...'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-semibold text-lg">Connected Successfully!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your email account is now connected
            </p>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-semibold text-lg">Connection Failed</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={() => setStep('configure')}
              className="btn-outline px-6 py-2.5 mt-4"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
