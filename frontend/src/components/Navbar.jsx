import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Search, User, LogOut, Sparkles, Shield, ChevronDown } from 'lucide-react';

export default function Navbar({ onOpenCommandPalette }) {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, profile, isGuest, isAuthenticated, loginWithGoogle, loginAsGuest, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & Buildathon Badge */}
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
                Study smarter. Stay well.
              </span>
            </div>
          </Link>

          {/* Mandatory Buildathon Sticker with Text Fallback */}
          <div className="h-9 flex items-center border-l border-slate-200 dark:border-slate-800 pl-3 sm:pl-4">
            {!imageError ? (
              <img
                src="/buildathon-sticker.png"
                alt="Built For Ostad Presents YUNet AIgnite Buildathon 2026"
                onError={() => setImageError(true)}
                className="h-8 sm:h-9 object-contain drop-shadow-sm hover:opacity-90 transition-opacity"
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
              <span>Search tools & study notes...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Theme Toggle & User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
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
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-brand-500/30"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-600 dark:text-brand-300 flex items-center justify-center font-bold text-xs">
                    {currentUser?.displayName?.[0] || 'U'}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                    {profile?.displayName || currentUser?.displayName || 'Student'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isGuest ? 'Guest Session' : 'Verified Google'}
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
                      {currentUser?.displayName || 'Student'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {currentUser?.email || (isGuest ? 'Guest (Local History Stored)' : '')}
                    </p>
                    {isGuest && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium">
                        Guest Account
                      </span>
                    )}
                  </div>

                  {isGuest && (
                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        loginWithGoogle();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 rounded-xl transition-colors mb-1"
                    >
                      Upgrade to Google Login
                    </button>
                  )}

                  <Link
                    to="/progress"
                    onClick={() => setUserDropdown(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    <span>My Learning Analytics</span>
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

