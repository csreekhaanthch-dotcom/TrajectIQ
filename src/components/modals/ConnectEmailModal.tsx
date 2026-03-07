'use client';

import { useState } from 'react';
import { X, Mail, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type EmailProvider = 'GMAIL' | 'OUTLOOK' | 'IMAP';

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
    id: 'IMAP' as EmailProvider, 
    name: 'IMAP', 
    icon: '📬',
    description: 'Connect any email provider',
    popular: false 
  },
];

export function ConnectEmailModal({ isOpen, onClose, onSuccess }: ConnectEmailModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const [step, setStep] = useState<'select' | 'configure' | 'connecting'>('select');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    imapHost: '',
    imapPort: '993',
    smtpHost: '',
    smtpPort: '587',
  });

  if (!isOpen) return null;

  const handleProviderSelect = (provider: EmailProvider) => {
    setSelectedProvider(provider);
    if (provider === 'GMAIL' || provider === 'OUTLOOK') {
      // OAuth flow - in demo mode just simulate
      setStep('connecting');
      setTimeout(() => {
        handleConnect();
      }, 2000);
    } else {
      setStep('configure');
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setStep('connecting');

    try {
      const response = await fetch('/api/email/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          email: formData.email || 'demo@example.com',
          protocol: 'IMAP',
          isConnected: true,
          syncStatus: 'PENDING',
        }),
      });

      if (response.ok) {
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
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to connect email:', error);
      setStep('configure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose} />
      
      <div className="modal w-full max-w-md p-6">
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

        {/* Step: Configure IMAP */}
        {step === 'configure' && selectedProvider === 'IMAP' && (
          <div className="space-y-4">
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

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="btn-outline px-4 py-2.5"
              >
                Back
              </button>
              <button
                onClick={handleConnect}
                disabled={loading || !formData.email || !formData.imapHost}
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
              {selectedProvider === 'GMAIL' || selectedProvider === 'OUTLOOK'
                ? `Connecting to ${providers.find(p => p.id === selectedProvider)?.name}...`
                : 'Verifying credentials...'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Success State (shown briefly before closing) */}
        {loading && step === 'connecting' && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-3 animate-scale-in">
                <Check className="w-6 h-6 text-white" />
              </div>
              <p className="font-medium">Connected Successfully!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
