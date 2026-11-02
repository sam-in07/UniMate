import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Users,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  MessageSquare,
  Search,
  CheckCircle2,
  Layers,
  GraduationCap
} from 'lucide-react';

export default function LandingPage() {
  const { loginWithGoogle, loginAsGuest, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const handleStart = async (guest = false) => {
    if (guest) {
      await loginAsGuest();
    } else {
      await loginWithGoogle();
    }
    navigate('/summarizer');
  };

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)]">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[700px] h-[500px] bg-gradient-to-tr from-brand-500/20 via-accent-violet/20 to-accent-amber/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 text-center">
        
        {/* Official Buildathon Sticker / Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center mb-6"
        >
          {!imageError ? (
            <img
              src="/buildathon-sticker.png"
              alt="Built For Ostad Presents YUNet AIgnite Buildathon 2026"
              onError={() => setImageError(true)}
              className="h-12 sm:h-14 object-contain drop-shadow-md hover:scale-105 transition-transform"
            />
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-300/40 dark:border-brand-700/40 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span>Built For Ostad Presents YUNet AIgnite Buildathon 2026</span>
            </div>
          )}
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 font-sans leading-tight"
        >
          Study smarter.{' '}
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-violet bg-clip-text text-transparent">
            Connect with students.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-normal"
        >
          The production AI educational companion and peer network for university students in Bangladesh and worldwide. Master lecture notes, practice active recall, find textbook deals, and team up with study partners.
        </motion.p>

        {/* Primary Call-to-Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/summarizer')}
                className="px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-soft-hover flex items-center justify-center gap-2 hover:gap-3 transition-all"
              >
                <span>Study Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-semibold text-sm border border-slate-300 dark:border-slate-700 shadow-sm transition-all flex items-center gap-2"
              >
                <span>Student Network</span>
                <Users className="w-4 h-4 text-brand-500" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleStart(false)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-soft-hover flex items-center justify-center gap-2 hover:gap-3 transition-all"
              >
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleStart(true)}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-300 dark:border-slate-700 shadow-sm transition-all"
              >
                Try as guest (Instant access)
              </button>
            </>
          )}
        </motion.div>

        {/* Live-Feeling Interactive Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-r from-brand-500/30 via-indigo-500/20 to-accent-amber/30 shadow-2xl"
        >
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-6 sm:p-8 text-left border border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-slate-400">UniMate: Study & Student Network</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Live Production App
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Pillar 1: Smart Study</p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                  <p className="font-semibold text-slate-900 dark:text-white">DBMS Normalization & Operating Systems</p>
                  <p>AI Summarizer transforms raw PDF slides into structured revision notes, active-recall quizzes, and identifies weak topics automatically.</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pillar 2: Student Network</p>
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-xs space-y-2">
                  <p className="font-semibold text-slate-900 dark:text-white">Marketplace & Collaborator Match</p>
                  <p>Weak on Database Systems? AI links you to secondhand textbooks on campus and pairs you with high-scoring student study partners.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* The Two Pillars Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
            Two Integrated Pillars for University Life
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Engineered to empower university students with intelligent academic tools and peer networking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Pillar 1: Study */}
          <div className="p-8 rounded-3xl glass-panel border border-brand-200 dark:border-brand-800/60 shadow-soft hover:shadow-soft-hover transition-all group flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Study Pillar</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Multi-provider AI Summarizer for notes & PDFs, strict JSON-validated quiz generator with instant explanations, multi-turn AI Tutor with Islamic studies verification mode, deterministic exam revision scheduler, and student past questions library.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>PDF/TXT text extraction up to 10MB</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Interactive MCQs with confetti score celebration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Speech-to-text input & voice read-aloud</span>
                </li>
              </ul>
            </div>
            <Link
              to="/summarizer"
              className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-all shadow-sm"
            >
              <span>Open Study Hub</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Pillar 2: Student Network */}
          <div className="p-8 rounded-3xl glass-panel border border-amber-200 dark:border-amber-800/60 shadow-soft hover:shadow-soft-hover transition-all group flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 text-accent-amber flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Student Network</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Used-book marketplace with AI price range estimation, natural language semantic search, collaborator finder based on quiz weak topics, in-app messaging between buyer/seller and accepted student peers, and community safety moderation.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>AI book cataloging & price suggestions in BDT</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>AI match ranking with "why this match" explanation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>Private in-app chat with zero phone/email exposure</span>
                </li>
              </ul>
            </div>
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-sm"
            >
              <span>Explore Student Network</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-8">
          How UniMate Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-brand-500 text-white font-bold flex items-center justify-center text-xs mb-3">
              1
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Study with AI</h4>
            <p className="text-xs text-slate-500">Extract summaries from slides, take active-recall quizzes, and track readiness.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-brand-500 text-white font-bold flex items-center justify-center text-xs mb-3">
              2
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Exchange Books</h4>
            <p className="text-xs text-slate-500">List and buy campus textbooks using natural language search with AI price ranges.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-brand-500 text-white font-bold flex items-center justify-center text-xs mb-3">
              3
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Connect with Peers</h4>
            <p className="text-xs text-slate-500">Find study partners matching weak topics and chat privately without sharing phone numbers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
