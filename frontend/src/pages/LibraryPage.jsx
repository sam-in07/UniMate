import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  Bookmark,
  BookOpen,
  HelpCircle,
  Calendar,
  FileText,
  Trash2,
  ExternalLink,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'summaries' | 'quizzes'
  const [library, setLibrary] = useState({
    materials: [],
    summaries: [],
    quizzes: [],
    attempts: [],
    plans: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await api.getLibrary();
      if (res.library) {
        setLibrary(res.library);
      }
    } catch (err) {
      toast.error('Failed to load saved library items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      await api.deleteMaterial(id);
      toast.success('Study material deleted.');
      fetchLibrary();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-500">
              <Bookmark className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              My Study Library
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Access your extracted notes, high-yield summaries, and active recall quizzes.
          </p>
        </div>

        <Link
          to="/summarizer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Summary</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'materials'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Extracted Notes ({library.materials?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('summaries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'summaries'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Summaries ({library.summaries?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'quizzes'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Quizzes ({library.quizzes?.length || 0})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : activeTab === 'materials' ? (
        library.materials.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">No study documents yet</p>
            <p className="text-xs text-slate-400 mb-4">Upload a PDF or paste lecture notes to save them here.</p>
            <Link to="/summarizer" className="text-xs font-semibold text-brand-600 hover:underline">
              Go to Summarizer →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {library.materials.map(m => (
              <div key={m.id} className="p-5 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-soft">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {m.title}
                    </h3>
                    <button
                      onClick={() => handleDeleteMaterial(m.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-3 font-mono leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl">
                    {m.extractedText}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/quiz?materialId=${m.id}`}
                    className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    <span>Take Quiz</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'summaries' ? (
        library.summaries.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">No saved summaries</p>
            <Link to="/summarizer" className="text-xs font-semibold text-brand-600 hover:underline">
              Create your first summary →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {library.summaries.map(s => (
              <div key={s.id} className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {s.title}
                    </h3>
                    <p className="text-xs text-slate-400">Saved on {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  {s.topics && (
                    <div className="flex flex-wrap gap-1">
                      {s.topics.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 font-semibold">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-brand-50/40 dark:bg-brand-950/20 p-3 rounded-2xl border border-brand-500/10">
                  {s.executiveSummary}
                </p>
              </div>
            ))}
          </div>
        )
      ) : (
        library.quizzes.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">No quizzes generated yet</p>
            <Link to="/quiz" className="text-xs font-semibold text-brand-600 hover:underline">
              Generate a practice quiz →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {library.quizzes.map(q => (
              <div key={q.id} className="p-5 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    {q.questions?.length || 0} Questions • {q.difficulty?.toUpperCase()}
                  </p>
                </div>
                <Link
                  to="/quiz"
                  className="w-full py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold text-center hover:bg-brand-700 transition-colors"
                >
                  Practice Quiz
                </Link>
              </div>
            ))}
          </div>
        )
      )}

    </div>
  );
}

