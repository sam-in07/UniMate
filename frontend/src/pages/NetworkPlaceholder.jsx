import React from 'react';
import { Users, ShoppingBag, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';

export default function NetworkPlaceholder() {
  const [params] = useSearchParams();
  const search = params.get('search');
  const filter = params.get('filter');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8" />
      </div>

      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Phase 2: Student Network Preview
      </span>

      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 mb-2">
        Used-Book Marketplace & Collaborator Finder
      </h1>

      <p className="text-sm text-slate-500 max-w-lg mx-auto mb-8">
        Coming next in Phase 2! Connect with study partners, buy/sell course books with AI price estimation, and chat securely without sharing personal contact info.
      </p>

      {(search || filter) && (
        <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 max-w-md mx-auto mb-8 text-xs text-brand-700 dark:text-brand-300">
          <Sparkles className="w-4 h-4 inline mr-1 text-brand-500" />
          <span>Prefiltered query from your quiz results: <strong>"{search || filter}"</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left mb-8">
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
          <ShoppingBag className="w-6 h-6 text-brand-500 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Used-Book Marketplace</h3>
          <p className="text-[11px] text-slate-500">AI cover scan, semantic search ("I need DBMS 3rd sem"), seller in-app chat.</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
          <MessageSquare className="w-6 h-6 text-emerald-500 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Collaborator Match</h3>
          <p className="text-[11px] text-slate-500">Find study partners matching weak topics, conference teams, and project mates.</p>
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

