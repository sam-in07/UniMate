import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { X, Lock, CheckCircle2 } from 'lucide-react';

export default function AuthModal() {
  const { showGoogleModal, setShowGoogleModal, lockedActionNotice, loginWithGoogle, loginAsGuest } = useAuth();

  if (!showGoogleModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={() => setShowGoogleModal(false)}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header */}
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mb-5 mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Sign in with Google
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {lockedActionNotice || 'Please sign in with your Google account to unlock full community and collaboration features.'}
            </p>
          </div>

          <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Free, instant setup with campus email or personal account</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Never exposes your private email or phone number</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Saves your study notes, quizzes, and exam schedules permanently</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-semibold text-sm border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow transition-all group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => {
                setShowGoogleModal(false);
                loginAsGuest();
              }}
              className="w-full text-center py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Or stay as anonymous guest (Study tools only)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

