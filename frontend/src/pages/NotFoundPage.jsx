import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">404</h1>
      <p className="text-sm text-slate-500 mb-6">Page not found or still under construction.</p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs inline-flex items-center gap-2"
      >
        <span>Back to Home</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

