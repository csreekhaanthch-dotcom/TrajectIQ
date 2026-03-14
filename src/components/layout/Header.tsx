'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Bell, 
  Plus, 
  Menu,
  Users,
  Briefcase,
  FileText,
  ChevronRight,
  Sparkles,
  Mail,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  onNewJob?: () => void;
}

const notifications = [
  { id: 1, title: 'New candidate applied', message: 'John Smith applied for Senior Engineer', time: '5 min ago', unread: true, type: 'candidate', href: '/candidates?id=1' },
  { id: 2, title: 'Resume parsed', message: 'Resume for Jane Doe has been processed', time: '15 min ago', unread: true, type: 'resume', href: '/candidates?id=2' },
  { id: 3, title: 'Interview scheduled', message: 'Interview with Mike Johnson tomorrow at 2:00 PM', time: '1 hour ago', unread: false, type: 'interview', href: '/candidates?id=3' },
  { id: 4, title: 'Score threshold met', message: 'Sarah Williams scored above 85 for Tech Lead', time: '2 hours ago', unread: false, type: 'score', href: '/candidates?id=4' },
];

const searchResults = [
  { type: 'candidate', title: 'John Smith', subtitle: 'Senior Engineer', href: '/candidates?id=1' },
  { type: 'job', title: 'Senior Software Engineer', subtitle: '24 candidates', href: '/jobs' },
  { type: 'candidate', title: 'Jane Doe', subtitle: 'Full Stack Developer', href: '/candidates?id=2' },
];

export function Header({ onMenuClick, onNewJob }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const unreadCount = notifications.filter(n => n.unread).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'candidate': return Users;
      case 'resume': return FileText;
      case 'interview': return Mail;
      case 'score': return Sparkles;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'candidate': return 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400';
      case 'resume': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400';
      case 'interview': return 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400';
      case 'score': return 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const userInitials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U';
  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button 
            onClick={onMenuClick} 
            className="btn-icon lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="header-search hidden md:block relative">
            <Search className="header-search-icon" />
            <input
              type="text"
              placeholder="Search candidates, jobs..."
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(e.target.value.length > 0);
              }}
              onFocus={() => searchQuery && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            />
            <span className="header-search-shortcut hidden lg:inline">⌘K</span>
            
            {/* Search Results Dropdown */}
            {showSearch && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-card rounded-lg border border-border shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/20">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Results</p>
                </div>
                <div className="py-1">
                  {searchResults.map((result, index) => (
                    <Link
                      key={index}
                      href={result.href}
                      className="dropdown-item"
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center",
                        result.type === 'candidate' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15'
                      )}>
                        {result.type === 'candidate' ? <Users className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{result.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-border bg-muted/15">
                  <p className="text-[10px] text-muted-foreground">
                    Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Enter</kbd> for all results
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="header-right">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="btn-icon"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "btn-icon notification-badge",
                unreadCount > 0 && "active"
              )}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="notification-dot" />
              )}
            </button>
            
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="dropdown right-0 top-full mt-1.5 w-80">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="badge-primary">{unreadCount} new</span>
                      )}
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map(notification => {
                      const Icon = getNotificationIcon(notification.type);
                      return (
                        <Link
                          key={notification.id}
                          href={notification.href}
                          onClick={() => setShowNotifications(false)}
                          className={cn(
                            "flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer",
                            notification.unread && "bg-primary/3"
                          )}
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", getNotificationColor(notification.type))}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-foreground">{notification.title}</p>
                              {notification.unread && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{notification.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{notification.time}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-border bg-muted/10">
                    <Link 
                      href="/settings"
                      onClick={() => setShowNotifications(false)}
                      className="w-full text-center text-xs text-primary font-medium py-1.5 hover:bg-muted/50 rounded transition-colors block"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New Job Button */}
          <button 
            onClick={onNewJob}
            className="btn-primary btn-sm hidden sm:flex"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Job</span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-semibold">
                {userInitials}
              </div>
            </button>
            
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="dropdown right-0 top-full mt-1.5 w-56">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{userName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="dropdown-item"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full dropdown-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      {loggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      <span>{loggingOut ? 'Signing out...' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
