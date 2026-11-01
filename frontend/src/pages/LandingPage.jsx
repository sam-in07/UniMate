import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Users,
  Heart,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Award
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center">
        
        {/* Official Buildathon Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-300/40 dark:border-brand-700/40 mb-6 shadow-sm"
        >
          {!imageError ? (
            <img
              src="/buildathon-sticker.png"
              alt="Buildathon Sticker"
              onError={() => setImageError(true)}
              className="h-5 object-contain inline"
            />
          ) : (
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          )}
          <span>Entered in Ostad Presents YUNet AIgnite Buildathon 2026</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 font-sans leading-tight"
        >
          Study smarter. Connect with students.{' '}
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-violet bg-clip-text text-transparent">
            Stay well.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-normal"
        >
          The production-grade AI companion built specifically for university & college students in Bangladesh and worldwide. Transform lecture notes into high-yield summaries, practice active-recall quizzes, and master your exams.
        </motion.p>

        {/* Primary Call-to-Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/summarizer')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-soft-hover flex items-center justify-center gap-2 hover:gap-3 transition-all"
            >
              <span>Go to Study Hub</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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
                <span className="ml-3 text-xs font-mono text-slate-400">UniMate Study Assistant Demo</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Live Interactive Mode
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Raw Input (Lecture or PDF)</p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono">
                  "Relational Database Normalization: 1NF requires atomic values. 2NF removes partial dependency. 3NF removes transitive dependency on non-prime attributes..."
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <span>Supports Bangla, English & Banglish inputs</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Structured Output Generated</p>
                <div className="p-4 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/60 text-xs space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-white">DBMS Normalization Summary & Quiz</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    <li>Key concept definitions with active recall notes</li>
                    <li>Auto-generated MCQ quiz with instant explanations</li>
                    <li>Weak topics mapped to your personal progress dashboard</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* The 3 Pillars Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
            Built on Three Pillars for University Life
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Engineered to empower university students with intelligent tools, student peer networks, and wellbeing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pillar 1: Study */}
          <div className="p-6 rounded-3xl glass-panel border border-brand-200 dark:border-brand-800/60 shadow-soft hover:shadow-soft-hover transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">1. Study Pillar</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Complete
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              AI Summarizer for notes & PDFs, strict JSON validated quiz generator with instant explanations, session AI Tutor with Islamic studies mode, and deterministic exam planner.
            </p>
            <Link
              to="/summarizer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:gap-2 transition-all"
            >
              <span>Explore Study Tools</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 2: Student Network */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-soft-hover transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-accent-amber/10 text-accent-amber flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">2. Student Network</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Phase 2
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Used-book marketplace with AI cover estimation, semantic search, peer collaborator finder based on quiz weak topics, and verified student connections.
            </p>
            <Link
              to="/network"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:gap-2 transition-all"
            >
              <span>Preview Network</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 3: Wellbeing */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-soft-hover transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">3. Wellbeing & Access</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Phase 3
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Daily mood & stress check-ins, supportive journal listener, crisis safety net with verified Bangladesh helplines (999, Kaan Pete Roi), and full accessibility panel.
            </p>
            <Link
              to="/wellbeing"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:gap-2 transition-all"
            >
              <span>Preview Wellbeing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* Short "How it works" */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-8">
          How UniMate Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-brand-500 text-white font-bold flex items-center justify-center text-xs mb-3">
              1
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Upload or Paste Notes</h4>
            <p className="text-xs text-slate-500">Provide slides, textbook excerpts, or paste lectures in Bangla, English, or Banglish.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-brand-500 text-white font-bold flex items-center justify-center text-xs mb-3">
              2
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Generate High-Yield Sets</h4>
            <p className="text-xs text-slate-500">Receive structured revision notes and an interactive MCQ quiz with instant explanations.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-brand-500 text-white font-bold flex items-center justify-center text-xs mb-3">
              3
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Track Readiness & Partners</h4>
            <p className="text-xs text-slate-500">Identify weak topics automatically and plan revision milestones before finals.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

