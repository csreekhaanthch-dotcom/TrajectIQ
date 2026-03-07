'use client';

import { useState } from 'react';
import { Search, Bell, Plus, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  onNewJob?: () => void;
}

export function Header({ onMenuClick, onNewJob }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'New candidate applied', message: 'John Smith applied for Senior Software Engineer', time: '5 min ago', unread: true },
    { id: 2, title: 'Resume parsed successfully', message: 'Resume for Jane Doe has been processed', time: '15 min ago', unread: true },
    { id: 3, title: 'Interview scheduled', message: 'Interview with Mike Johnson is scheduled for tomorrow', time: '1 hour ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick} 
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates, jobs..."
            className="pl-10 pr-4 py-2.5 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">⌘K</kbd>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors",
              unreadCount > 0 && "notification-pulse"
            )}
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-blue-600">{unreadCount} unread</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer",
                        notification.unread && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {notification.unread && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                  <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* New Job Button */}
        <button 
          onClick={onNewJob}
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5 btn-glow"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Job</span>
        </button>
      </div>
    </header>
  );
}
