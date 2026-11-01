import React from 'react';
import { Heart, ShieldAlert, PhoneCall, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WellbeingPlaceholder() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
        <Heart className="w-8 h-8" />
      </div>

      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
        Phase 3: Student Wellbeing Preview
      </span>

      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 mb-2">
        Daily Check-in, Journal & Crisis Safety Net
      </h1>

      <p className="text-sm text-slate-500 max-w-lg mx-auto mb-8">
        Coming next in Phase 3! Private mood tracking, supportive AI listener journal, Pomodoro timer, accessibility panel, and Bangladesh crisis safety net.
      </p>

      {/* Safety Net Resource Preview */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-w-lg mx-auto text-left mb-8 space-y-3">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
          <PhoneCall className="w-4 h-4" />
          <span>Bangladesh Emergency & Crisis Contacts</span>
        </div>
        <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
          <p><strong>National Emergency:</strong> 999 (24/7 Police, Ambulance, Fire)</p>
          <p><strong>Kaan Pete Roi:</strong> 09612-119911 (Daily 3:00 PM – 3:00 AM emotional support)</p>
          <p className="text-[11px] text-slate-400 pt-1">
            "UniMate is not a doctor or counsellor. No clinical diagnosis."
          </p>
        </div>
      </div>

      <Link
        to="/summarizer"
        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:gap-3 transition-all"
      >
        <span>Return to Study Hub</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

