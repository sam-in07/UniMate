import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Award,
  BookOpen,
  AlertTriangle,
  Info,
  Sparkles,
  Users,
  Search,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    api.getProgress()
      .then(res => {
        setData(res);
      })
      .catch(err => {
        toast.error('Failed to load progress metrics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-xs text-slate-500">Calculating your study progress & readiness metrics...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const scoreTrend = data?.scoreTrend || [];
  const weakTopics = data?.weakTopics || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Study Analytics & Readiness
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Track syllabus breadth coverage, quiz performance trends, and transparent exam readiness metrics.
        </p>
      </div>

      {/* Three Distinct Labelled Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Metric 1: Syllabus / Topic Coverage */}
        <div className="p-6 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Metric 1
            </span>
            <BookOpen className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {metrics.topicCoverage?.label || 'Syllabus / Topic Coverage'}
          </p>
          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.topicCoverage?.percentage || 0}%
            </span>
            <span className="text-xs text-slate-400">
              ({metrics.topicCoverage?.uniqueTopicsCount || 0} unique topics)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-brand-500 h-full rounded-full transition-all"
              style={{ width: `${metrics.topicCoverage?.percentage || 0}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Quiz Score Average */}
        <div className="p-6 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Metric 2
            </span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {metrics.quizScoreAverage?.label || 'Average Quiz Performance'}
          </p>
          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.quizScoreAverage?.averagePercentage || 0}%
            </span>
            <span className="text-xs text-slate-400">
              ({metrics.quizScoreAverage?.attemptsCount || 0} attempts)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${metrics.quizScoreAverage?.averagePercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Estimated Readiness Indicator with Explanation */}
        <div className="p-6 rounded-3xl glass-panel shadow-soft border border-brand-200 dark:border-brand-800/60 bg-gradient-to-tr from-brand-500/5 to-indigo-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Metric 3
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {metrics.estimatedReadiness?.label || 'Estimated Readiness Indicator'}
          </p>
          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">
              {metrics.estimatedReadiness?.score || 0}%
            </span>
            <span className="text-xs text-brand-500/80 font-medium">Exam Ready</span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-brand-500 to-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${metrics.estimatedReadiness?.score || 0}%` }}
            />
          </div>

          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-brand-500/10 text-[10px] text-slate-500">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-500" />
            <span>{metrics.estimatedReadiness?.formulaExplanation}</span>
          </div>
        </div>

      </div>

      {/* Quiz Scores Trend Chart */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Quiz Scores Over Time
        </h2>

        {scoreTrend.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No quiz attempts recorded yet. Take a quiz to populate your score timeline!
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} fontSize={11} stroke="#94a3b8" unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Weak Topics & Our Differentiator Cards */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
            Weak Topics & High-Yield Interventions
          </h2>
          <p className="text-xs text-slate-500">
            Topics where quiz accuracy fell below 60%. Connect directly to marketplace books or peer partners.
          </p>
        </div>

        {weakTopics.length === 0 ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Great job! No weak topics detected yet across your attempts. Keep testing your recall.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weakTopics.map(w => (
                <div key={w.topic} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{w.topic}</p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">
                      {w.accuracy}% accuracy ({w.correct}/{w.total} correct)
                    </p>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
              ))}
            </div>

            {/* Differentiator Action Cards */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to={`/marketplace?search=${encodeURIComponent(weakTopics[0]?.topic || '')}`}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 transition-all flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500">
                    Find Books for "{weakTopics[0]?.topic}"
                  </h4>
                  <p className="text-[11px] text-slate-400">Search marketplace for student textbooks</p>
                </div>
              </Link>

              <Link
                to={`/partners?filter=${encodeURIComponent(weakTopics[0]?.topic || '')}`}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-amber-500 transition-all flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500">
                    Find a Study Partner Strong in this
                  </h4>
                  <p className="text-[11px] text-slate-400">Collaborator finder prefiltered</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

