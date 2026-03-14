'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  Users,
  Briefcase,
  TrendingUp,
  FileText,
  Mail,
  Settings,
  LogOut,
  X,
  ChevronDown,
  HelpCircle,
  CreditCard,
  User,
  Bell,
  BarChart3,
  Target,
  ChevronRight,
  Loader2,
  Shield,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { 
    section: 'Overview',
    items: [
      { icon: BarChart3, label: 'Dashboard', href: '/', badge: null },
    ]
  },
  { 
    section: 'Email Setup',
    items: [
      { icon: Mail, label: 'Email Connect', href: '/email', badge: null },
    ]
  },
  { 
    section: 'Analysis',
    items: [
      { icon: Target, label: 'Evaluate Resumes', href: '/evaluate', badge: 'Main' },
      { icon: Sparkles, label: 'AI Search', href: '/candidate-search', badge: 'New' },
      { icon: Users, label: 'Candidates', href: '/candidates', badge: null },
      { icon: FileText, label: 'Reports', href: '/reports', badge: null },
    ]
  },
  { 
    section: 'Recruitment',
    items: [
      { icon: Briefcase, label: 'Job Requirements', href: '/jobs', badge: null },
    ]
  },
  { 
    section: 'Verification',
    items: [
      { icon: Shield, label: 'PCL Dashboard', href: '/pcl', badge: 'New' },
    ]
  },
];

const bottomMenuItems = [
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help & Support', href: '/help' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close user menu when clicking outside
  useEffect(() => {
    if (showUserMenu) {
      const handleClick = () => setShowUserMenu(false);
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClick);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClick);
      };
    }
  }, [showUserMenu]);

  const isActiveRoute = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push('/login');
  };

  // Get user display info
  const userInitials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';
  const userName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
    : 'User';
  const userEmail = user?.email || 'user@example.com';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "sidebar-container",
        isOpen && "open"
      )}>
        <div className="sidebar">
          {/* Logo Header */}
          <div className="sidebar-header">
            <Link href="/" className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="sidebar-logo-text">
                <span className="sidebar-logo-name">TrajectIQ</span>
                <span className="sidebar-logo-tagline">Hiring Intelligence</span>
              </div>
            </Link>
            <button 
              onClick={onClose} 
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="sidebar-nav">
            {menuItems.map((section) => (
              <div key={section.section} className="sidebar-section">
                <p className="sidebar-section-title">{section.section}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = isActiveRoute(item.href);
                    
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "sidebar-item",
                          isActive && "active"
                        )}
                      >
                        <item.icon className={cn(
                          "sidebar-item-icon",
                          isActive && "text-white/90"
                        )} />
                        <span className="sidebar-item-label">{item.label}</span>
                        {item.badge && (
                          <span className="sidebar-item-badge">{item.badge}</span>
                        )}
                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Support Section */}
            <div className="sidebar-section mt-auto pt-4 border-t border-white/8">
              <p className="sidebar-section-title">Support</p>
              <div className="space-y-0.5">
                {bottomMenuItems.map((item) => {
                  const isActive = isActiveRoute(item.href);
                  
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "sidebar-item",
                        isActive && "active"
                      )}
                    >
                      <item.icon className="sidebar-item-icon" />
                      <span className="sidebar-item-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
          
          {/* User Profile */}
          <div className="sidebar-footer">
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                }}
                className="sidebar-user w-full"
              >
                <div className="sidebar-user-avatar">
                  {userInitials}
                </div>
                <div className="sidebar-user-info">
                  <p className="sidebar-user-name">{userName}</p>
                  <p className="sidebar-user-email">{userEmail}</p>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-white/40 transition-transform duration-150",
                  showUserMenu && "rotate-180"
                )} />
              </button>
              
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-card rounded-lg border border-border shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border bg-muted/20">
                    <p className="text-xs font-semibold text-foreground">{userName}</p>
                    <p className="text-[10px] text-muted-foreground">{userEmail}</p>
                  </div>
                  <div className="py-1">
                    <Link 
                      href="/settings"
                      onClick={() => { setShowUserMenu(false); onClose(); }}
                      className="dropdown-item"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Profile Settings
                    </Link>
                    <Link 
                      href="/settings"
                      onClick={() => { setShowUserMenu(false); onClose(); }}
                      className="dropdown-item"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      Billing
                    </Link>
                    <Link 
                      href="/settings"
                      onClick={() => { setShowUserMenu(false); onClose(); }}
                      className="dropdown-item"
                    >
                      <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                      Notifications
                    </Link>
                  </div>
                  <div className="border-t border-border py-1">
                    <button 
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="dropdown-item destructive w-full text-left"
                    >
                      {loggingOut ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
