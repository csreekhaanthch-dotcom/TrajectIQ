'use client';

import { useState } from 'react';
import { X, Check, Sparkles, Zap, Building2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const plans = [
  {
    name: 'Starter',
    price: 29,
    icon: Zap,
    features: [
      'Up to 100 candidates/month',
      '5 job requirements',
      'Basic scoring engine',
      'Email support',
      'Export to CSV',
    ],
    popular: false,
  },
  {
    name: 'Professional',
    price: 79,
    icon: Building2,
    features: [
      'Up to 500 candidates/month',
      '20 job requirements',
      'Advanced scoring engine',
      'Priority email support',
      'Export to PDF/CSV',
      'Team collaboration (3 users)',
      'Custom scoring weights',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 199,
    icon: Crown,
    features: [
      'Unlimited candidates',
      'Unlimited job requirements',
      'AI-powered insights',
      'Dedicated support',
      'API access',
      'Unlimited team members',
      'Custom integrations',
      'SLA guarantee',
    ],
    popular: false,
  },
];

export function UpgradeProModal({ isOpen, onClose }: UpgradeProModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = (planName: string) => {
    setLoading(true);
    // Simulate upgrade process
    setTimeout(() => {
      setLoading(false);
      alert(`Thank you for choosing ${planName}! This is a demo - no actual payment will be processed.`);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose} />
      
      <div className="modal w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Upgrade to Pro</h2>
              <p className="text-sm text-muted-foreground">Choose the plan that fits your needs</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              billingPeriod === 'monthly' 
                ? "bg-primary text-white" 
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              billingPeriod === 'yearly' 
                ? "bg-primary text-white" 
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Yearly <span className="text-xs text-emerald-500">Save 20%</span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billingPeriod === 'yearly' 
              ? Math.round(plan.price * 0.8) 
              : plan.price;

            return (
              <div 
                key={plan.name}
                className={cn(
                  "relative rounded-2xl border p-6 transition-all",
                  plan.popular 
                    ? "border-primary shadow-lg shadow-primary/10" 
                    : "border-border hover:border-primary/50"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium gradient-primary text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    plan.popular ? "bg-primary/10" : "bg-secondary"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      plan.popular ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={loading}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-medium transition-all",
                    plan.popular 
                      ? "btn-primary" 
                      : "btn-outline"
                  )}
                >
                  {loading ? 'Processing...' : 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </div>
  );
}
