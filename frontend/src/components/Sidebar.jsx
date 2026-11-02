import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  HelpCircle,
  Calendar,
  FileQuestion,
  Bookmark,
  TrendingUp,
  ShoppingBag,
  Users,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

const navItems = [
  {
    group: 'Study Pillar',
    items: [
      { to: '/summarizer', label: 'Summarizer', icon: BookOpen, desc: 'Extract & notes' },
      { to: '/quiz', label: 'Quiz Generator', icon: HelpCircle, desc: 'MCQ & active recall' },
      { to: '/tutor', label: 'AI Tutor', icon: GraduationCap, desc: 'Chat & explain' },
      { to: '/planner', label: 'Exam Planner', icon: Calendar, desc: 'Schedule & milestones' },
      { to: '/past-questions', label: 'Past Questions', icon: FileQuestion, desc: 'Community bank' },
      { to: '/library', label: 'My Library', icon: Bookmark, desc: 'Saved notes & sets' },
      { to: '/progress', label: 'Study Progress', icon: TrendingUp, desc: 'Scores & readiness' },
    ]
  },
  {
    group: 'Student Network',
    items: [
      { to: '/marketplace', label: 'Book Marketplace', icon: ShoppingBag, desc: 'Buy & sell textbooks' },
      { to: '/partners', label: 'Collaborator Finder', icon: Users, desc: 'Find study partners' },
      { to: '/chat', label: 'In-App Messages', icon: MessageSquare, desc: 'Private peer chat' },
      { to: '/profile', label: 'My Profile', icon: User, desc: 'Student info & settings' },
    ]
  }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md transition-all duration-300 z-30 select-none ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
          {!collapsed && (
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mx-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navItems.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {section.group}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer info in desktop sidebar */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300">UniMate</p>
            <p className="text-[10px] text-slate-400">Two Pillars: Study & Network</p>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Tab Bar (for screens < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around">
        <NavLink
          to="/summarizer"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <BookOpen className="w-5 h-5" />
          <span>Notes</span>
        </NavLink>

        <NavLink
          to="/quiz"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <HelpCircle className="w-5 h-5" />
          <span>Quiz</span>
        </NavLink>

        <NavLink
          to="/marketplace"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Books</span>
        </NavLink>

        <NavLink
          to="/partners"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Users className="w-5 h-5" />
          <span>Partners</span>
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <MessageSquare className="w-5 h-5" />
          <span>Chat</span>
        </NavLink>
      </nav>
    </>
  );
}
