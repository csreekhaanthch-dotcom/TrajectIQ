'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  ChevronRight, 
  Search, 
  FileText,
  Video,
  ExternalLink,
  ChevronDown,
  Zap,
  Shield,
  Users,
  CreditCard,
  BarChart3,
  Clock,
  Settings,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I connect my email account?',
    answer: 'Navigate to Email Connect from the sidebar, click "Connect Email", select your email provider (Gmail, Outlook, Yahoo, or custom IMAP/POP3), and follow the authentication steps. For custom IMAP/POP3, you\'ll need your server settings, username, and password.',
  },
  {
    category: 'Getting Started',
    question: 'How does candidate scoring work?',
    answer: 'TrajectIQ uses a deterministic multi-factor scoring model: SDI (Skill Depth Index) × 0.40 + CSIG (Critical Skills Gate) × 0.15 + IAE (Impact Authenticity) × 0.20 + CTA (Career Trajectory) × 0.15 + ERR (Experience Relevance) × 0.10. Each component is scored 0-100, and the weighted sum determines the final grade.',
  },
  {
    category: 'Getting Started',
    question: 'What file formats are supported for resumes?',
    answer: 'We support PDF (.pdf), Microsoft Word (.doc, .docx), and plain text (.txt) files. Our AI parser extracts key information including skills, experience, education, and achievements.',
  },
  {
    category: 'Email Integration',
    question: 'How do I set up custom IMAP/POP3?',
    answer: 'For custom email servers, select "Custom IMAP" or "Custom POP3" when connecting. Enter your incoming mail server address (e.g., mail.yourcompany.com), port number (typically 993 for IMAP SSL, 995 for POP3 SSL), your email username, and password. Contact your IT administrator if you\'re unsure of these settings.',
  },
  {
    category: 'Email Integration',
    question: 'How often does email sync happen?',
    answer: 'Email accounts sync automatically every 15 minutes. You can also trigger manual syncs from the Email Connect page. Enterprise plans offer real-time sync with push notifications.',
  },
  {
    category: 'Scoring & Evaluation',
    question: 'Can I customize scoring weights?',
    answer: 'Yes! Navigate to Settings → Scoring Weights to adjust the weight of each component. The total must equal 100%. Changes apply to new evaluations; existing scores remain unchanged.',
  },
  {
    category: 'Scoring & Evaluation',
    question: 'What do the grades mean?',
    answer: 'A (85-100): Strong Hire - Excellent match across all criteria. B (70-84): Consider - Good candidate with minor gaps. C (55-69): Review - May need further evaluation. F (below 55): Pass - Does not meet minimum requirements.',
  },
  {
    category: 'Billing & Plans',
    question: 'What happens when I exceed my plan limits?',
    answer: 'You\'ll receive a notification when you reach 80% of your limit. Once exceeded, you won\'t be able to add new candidates or jobs until you upgrade or remove existing items. All existing data remains accessible.',
  },
  {
    category: 'Billing & Plans',
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes, you can change plans at any time from Settings → Billing. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your billing cycle.',
  },
  {
    category: 'Security',
    question: 'How is my data protected?',
    answer: 'We use enterprise-grade AES-256-GCM encryption for all sensitive data. Passwords are hashed with bcrypt (12 rounds). All connections use TLS 1.3. We\'re SOC 2 Type II compliant and GDPR ready.',
  },
  {
    category: 'Security',
    question: 'Can I export my data?',
    answer: 'Yes, you can export all your data from Settings → Organization. Choose from CSV, JSON, or PDF formats. Enterprise plans include automated backup exports.',
  },
];

const helpCategories = [
  { 
    icon: Zap, 
    title: 'Getting Started', 
    description: 'Quick start guides and tutorials',
    href: '#getting-started',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
  },
  { 
    icon: Mail, 
    title: 'Email Integration', 
    description: 'Connect and configure email accounts',
    href: '#email-integration',
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
  },
  { 
    icon: BarChart3, 
    title: 'Scoring System', 
    description: 'Understanding candidate evaluation',
    href: '#scoring',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
  },
  { 
    icon: Users, 
    title: 'Team Management', 
    description: 'Roles, permissions, and collaboration',
    href: '#team',
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
  },
  { 
    icon: CreditCard, 
    title: 'Billing & Plans', 
    description: 'Subscriptions and payments',
    href: '#billing',
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400'
  },
  { 
    icon: Shield, 
    title: 'Security', 
    description: 'Data protection and compliance',
    href: '#security',
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400'
  },
];

const quickLinks = [
  { icon: Book, title: 'Documentation', href: '#', external: true },
  { icon: Video, title: 'Video Tutorials', href: '#', external: true },
  { icon: FileText, title: 'API Reference', href: '#', external: true },
  { icon: MessageCircle, title: 'Community Forum', href: '#', external: true },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFAQs = faqItems.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(faqItems.map(faq => faq.category))];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="page-header animate-fade-in">
          <h1 className="page-title">Help & Support</h1>
          <p className="page-description">Find answers, get help, and learn how to use TrajectIQ</p>
        </div>

        {/* Search */}
        <div className="card animate-fade-in-up stagger-1">
          <div className="card-content">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for help articles, FAQs, tutorials..."
                className="form-input pl-12 py-3 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Help Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up stagger-2">
          {helpCategories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="card card-hover p-5 flex items-start gap-4"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", category.color)}>
                <category.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{category.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Links & Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up stagger-3">
          {/* Quick Links */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Links</h2>
              <p className="card-description">Helpful resources</p>
            </div>
            <div className="divide-y divide-border">
              {quickLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{link.title}</span>
                  </div>
                  {link.external ? (
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Contact Support</h2>
              <p className="card-description">We&apos;re here to help</p>
            </div>
            <div className="card-content space-y-4">
              <div className="bg-primary-100 dark:bg-primary/10 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">Email Support</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Get help from our team within 24 hours
                </p>
                <a 
                  href="mailto:support@trajectiq.com"
                  className="btn-primary btn-sm inline-flex"
                >
                  support@trajectiq.com
                </a>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Business Hours</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Monday - Friday: 9:00 AM - 6:00 PM EST<br />
                  Enterprise: 24/7 support available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="card animate-fade-in-up stagger-4">
          <div className="card-header">
            <h2 className="card-title">Frequently Asked Questions</h2>
            <p className="card-description">Quick answers to common questions</p>
          </div>
          
          {/* Category Filter */}
          <div className="px-5 py-3 border-b border-border flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                selectedCategory === null 
                  ? "bg-primary text-white" 
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  selectedCategory === category 
                    ? "bg-primary text-white" 
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="divide-y divide-border">
            {filteredFAQs.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No questions found matching your search.</p>
              </div>
            ) : (
              filteredFAQs.map((faq, index) => (
                <div key={index}>
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === `${index}` ? null : `${index}`)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded mt-0.5">
                        {faq.category}
                      </span>
                      <span className="font-medium text-foreground">{faq.question}</span>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground flex-shrink-0 ml-4 transition-transform",
                      expandedFAQ === `${index}` && "rotate-180"
                    )} />
                  </button>
                  {expandedFAQ === `${index}` && (
                    <div className="px-5 pb-4 pt-0 ml-[4.5rem]">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Still Need Help */}
        <div className="card bg-gradient-to-r from-primary-600 to-primary-700 border-0 text-white animate-fade-in-up stagger-5">
          <div className="card-content text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Still need help?</h2>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              Our support team is ready to assist you with any questions or issues.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a 
                href="mailto:support@trajectiq.com"
                className="btn bg-white text-primary hover:bg-white/90 btn-md"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
              <Link 
                href="/settings"
                className="btn bg-white/20 text-white hover:bg-white/30 btn-md border border-white/30"
              >
                <Settings className="w-4 h-4" />
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
