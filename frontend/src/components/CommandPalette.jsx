import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  HelpCircle,
  GraduationCap,
  Calendar,
  FileQuestion,
  Bookmark,
  TrendingUp,
  X,
  Sparkles
} from 'lucide-react';

const commands = [
  { id: 'summarizer', title: 'Summarize Notes / PDF', subtitle: 'Extract key points, definitions & revision notes', icon: BookOpen, path: '/summarizer' },
  { id: 'quiz', title: 'Generate Quiz', subtitle: 'Test active recall with MCQ & instant feedback', icon: HelpCircle, path: '/quiz' },
  { id: 'tutor', title: 'AI Academic Tutor', subtitle: 'Chat, ask questions, explain simpler, get examples', icon: GraduationCap, path: '/tutor' },
  { id: 'planner', title: 'Exam Revision Planner', subtitle: 'Deterministic day-by-day study schedule', icon: Calendar, path: '/planner' },
  { id: 'past-questions', title: 'Past Questions Bank', subtitle: 'Search student-contributed question papers', icon: FileQuestion, path: '/past-questions' },
  { id: 'library', title: 'My Saved Library', subtitle: 'View all saved materials, summaries, and quizzes', icon: Bookmark, path: '/library' },
  { id: 'progress', title: 'Study Progress & Readiness', subtitle: 'Track weak topics, scores, and exam readiness', icon: TrendingUp, path: '/progress' },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search tools or jump to page..."
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching tools or pages found.
              </div>
            ) : (
              filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      ↵
                    </kbd>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
            <span>Navigation Shortcut</span>
            <span>ESC to dismiss</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

