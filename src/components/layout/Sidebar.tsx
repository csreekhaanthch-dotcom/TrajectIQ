'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  FileText, 
  Mail, 
  Settings,
  LogOut,
  X,
  Sparkles,
  ChevronDown,
  User,
  CreditCard,
  HelpCircle,
  BarChart3,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', href: '/' },
    { icon: Mail, label: 'Email Connect', href: '/email' },
    { icon: Briefcase, label: 'Job Requirements', href: '/jobs' },
    { icon: Users, label: 'Candidates', href: '/candidates' },
    { icon: Target, label: 'Evaluation', href: '/evaluate' },
    { icon: FileText, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setShowUserMenu(false);
        setShowProModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="mobile-menu-overlay lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Pro Modal */}
      {showProModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowProModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">Upgrade to Pro</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unlock advanced features and take your hiring to the next level:
            </p>
            <ul className="space-y-2 mb-6">
              {['Unlimited candidates', 'Advanced analytics', 'Custom scoring weights', 'Priority support', 'API access'].map(feature => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowProModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Maybe Later
              </button>
              <button className="flex-1 py-2.5 px-4 rounded-xl gradient-primary text-white font-medium">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gradient">TrajectIQ</span>
              <p className="text-[10px] text-gray-400 -mt-0.5">Hiring Intelligence</p>
            </div>
          </Link>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" 
                    : "group-hover:bg-gray-100 dark:group-hover:bg-gray-700"
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Pro Feature Banner */}
        <div className="absolute bottom-24 left-4 right-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-white/80 mb-3">Unlock advanced analytics and unlimited candidates</p>
            <button 
              onClick={() => setShowProModal(true)}
              className="w-full py-2 px-3 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm"
            >
              Learn More
            </button>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium shadow-md">
                DU
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm truncate">Demo User</p>
                <p className="text-xs text-gray-500 truncate">demo@trajectiq.com</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showUserMenu && "rotate-180")} />
            </button>
            
            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden">
                <Link 
                  href="/settings"
                  onClick={() => { setShowUserMenu(false); onClose(); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </Link>
                <Link 
                  href="/settings"
                  onClick={() => { setShowUserMenu(false); onClose(); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <CreditCard className="w-4 h-4" />
                  Billing
                </Link>
                <button 
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left"
                  onClick={() => setShowProModal(true)}
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Pro
                </button>
                <Link 
                  href="/settings"
                  onClick={() => { setShowUserMenu(false); onClose(); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <HelpCircle className="w-4 h-4" />
                  Help & Support
                </Link>
                <div className="border-t border-gray-200 dark:border-gray-800">
                  <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
