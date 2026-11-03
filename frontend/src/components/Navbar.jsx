import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import UserAvatar from './UserAvatar';
import {
  Sun,
  Moon,
  Search,
  User,
  LogOut,
  Sparkles,
  Bell,
  ChevronDown,
  ShoppingBag,
  Users,
  MessageSquare
} from 'lucide-react';

export default function Navbar({ onOpenCommandPalette }) {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, profile, isGuest, isAuthenticated, loginWithGoogle, loginAsGuest, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      api.getNotifications()
        .then(res => {
          if (res && res.unreadCount !== undefined) {
            setUnreadCount(res.unreadCount);
          }
        })
        .catch(() => {});
      
      const interval = setInterval(() => {
        api.getNotifications()
          .then(res => {
            if (res && res.unreadCount !== undefined) {
              setUnreadCount(res.unreadCount);
            }
          })
          .catch(() => {});
      }, 30000); // poll every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & Buildathon Sticker */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-violet flex items-center justify-center text-white font-bold shadow-soft group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-sans">
                  Uni<span className="text-brand-500">Mate</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  AI
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline -mt-0.5">
                Study smarter. Connect with students.
              </span>
            </div>
          </Link>

          {/* Mandatory Buildathon Sticker */}
          <div className="h-10 flex items-center border-l border-slate-200 dark:border-slate-800 pl-3 sm:pl-4">
            {!imageError ? (
              <img
                src="/buildathon-sticker.png"
                alt="Built For Ostad Presents YUNet AIgnite Buildathon 2026"
                onError={() => setImageError(true)}
                className="h-9 sm:h-10 object-contain drop-shadow-sm hover:opacity-95 transition-opacity"
              />
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden md:inline font-mono text-[11px]">Built For</span>
                <span className="font-bold">Ostad AIgnite '26</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
            aria-label="Quick search and tools"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search books, partners, tools...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Actions, Notifications & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Notifications Bell */}
          {isAuthenticated && (
            <Link
              to="/partners?tab=requests"
              className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Profile / Auth State */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
              >
                <UserAvatar
                  user={{
                    photoURL: currentUser?.photoURL || profile?.photoURL,
                    displayName: profile?.displayName || currentUser?.displayName
                  }}
                  size="sm"
                  className="w-7 h-7 ring-2 ring-brand-500/30"
                />
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                    {profile?.displayName || currentUser?.displayName || (isGuest ? 'Guest Student' : 'Google Student')}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isGuest ? 'Guest (Read-only)' : 'Google Account'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdown && (
                <div
                  onMouseLeave={() => setUserDropdown(false)}
                  className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel shadow-soft-hover p-2 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {profile?.displayName || currentUser?.displayName || (isGuest ? 'Guest Student' : 'Student')}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {currentUser?.email || (isGuest ? 'Guest Mode' : '')}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-medium ${
                      isGuest
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                    }`}>
                      {isGuest ? 'Guest Student' : 'Google Student'}
                    </span>
                  </div>

                  {isGuest ? (
                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        loginWithGoogle();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 rounded-xl transition-colors mb-1"
                    >
                      Sign In with Google
                    </button>
                  ) : (
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdown(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-brand-500" />
                      <span>My Profile & Skills</span>
                    </Link>
                  )}

                  <Link
                    to="/chat"
                    onClick={() => setUserDropdown(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>In-App Messages</span>
                  </Link>

                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={loginAsGuest}
                className="text-xs font-medium px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Try as guest
              </button>
              <button
                onClick={loginWithGoogle}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <span>Continue with Google</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
