import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Loader2,
  Bookmark
} from 'lucide-react';

export default function ExamPlannerPage() {
  const [exams, setExams] = useState([
    { course: 'Database Management Systems', date: '2026-11-20', priority: 'high' },
    { course: 'Computer Networks', date: '2026-11-26', priority: 'medium' }
  ]);
  const [dailyHours, setDailyHours] = useState(4);
  const [language, setLanguage] = useState('en');
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const { toast } = useToast();

  const handleAddExam = () => {
    setExams(prev => [
      ...prev,
      { course: '', date: '', priority: 'medium' }
    ]);
  };

  const handleRemoveExam = (idx) => {
    if (exams.length <= 1) {
      toast.error('At least one exam must remain.');
      return;
    }
    setExams(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateExam = (idx, field, value) => {
    setExams(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleGeneratePlan = async () => {
    for (const e of exams) {
      if (!e.course.trim() || !e.date) {
        toast.error('Please enter course name and date for all exams.');
        return;
      }
    }

    setGenerating(true);
    try {
      const res = await api.generatePlan({
        exams,
        dailyHours: Number(dailyHours),
        language
      });
      setGeneratedPlan(res.plan);
      setSelectedDayIndex(0);
      toast.success('Exam revision schedule generated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate revision schedule');
    } finally {
      setGenerating(false);
    }
  };

  const currentDay = generatedPlan?.schedule?.[selectedDayIndex];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-accent-cyan/10 text-cyan-600 dark:text-cyan-400">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Exam Revision Planner
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Deterministic daily study hour allocation based on exam proximity + AI high-yield strategy advice.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Setup */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-5">
            
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Upcoming Exams
              </h2>
              <button
                type="button"
                onClick={handleAddExam}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exam</span>
              </button>
            </div>

            {/* Exams list */}
            <div className="space-y-3">
              {exams.map((exam, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">Exam #{idx + 1}</span>
                    <button
                      onClick={() => handleRemoveExam(idx)}
                      className="text-slate-400 hover:text-rose-500 p-0.5"
                      title="Remove exam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="e.g. CSE 301 Database Systems"
                    value={exam.course}
                    onChange={(e) => handleUpdateExam(idx, 'course', e.target.value)}
                    className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={exam.date}
                      onChange={(e) => handleUpdateExam(idx, 'date', e.target.value)}
                      className="text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
                    />

                    <select
                      value={exam.priority}
                      onChange={(e) => handleUpdateExam(idx, 'priority', e.target.value)}
                      className="text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Hours Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Available Study Hours / Day
                </label>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  {dailyHours} hours/day
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="w-full py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing Optimal Study Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Revision Timeline</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right Column: Timeline & Strategy Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {generatedPlan ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Day Selector Carousel / Pills */}
              <div className="p-4 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Day-by-Day Timeline ({generatedPlan.schedule.length} Days until Exams)
                </p>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {generatedPlan.schedule.map((day, idx) => (
                    <button
                      key={day.dayNumber}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`flex flex-col items-center p-3 rounded-2xl min-w-[75px] border transition-all ${
                        selectedDayIndex === idx
                          ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">Day {day.dayNumber}</span>
                      <span className="text-xs font-extrabold mt-0.5">{day.date.split('-').slice(1).join('/')}</span>
                      <span className="text-[10px] mt-1 opacity-70">{day.totalHours}h</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Day Task Allocation */}
              {currentDay && (
                <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 shadow-soft space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Day {currentDay.dayNumber} Focus Plan ({currentDay.date})
                      </h3>
                      <p className="text-xs text-slate-500">
                        {currentDay.totalHours} hours total allocated
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentDay.tasks.map((task, tIdx) => (
                      <div
                        key={tIdx}
                        className={`p-4 rounded-2xl border flex items-center justify-between ${
                          task.urgency === 'urgent'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                            : task.urgency === 'approaching'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{task.course}</span>
                            {task.urgency === 'urgent' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500 text-white">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{task.target}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-brand-600 dark:text-brand-400">
                            {task.hours} hrs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI High-Yield Strategy Advice */}
              {generatedPlan.advice && (
                <div className="p-6 rounded-3xl glass-panel border border-brand-200 dark:border-brand-800/60 shadow-soft space-y-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      AI High-Yield Exam Strategies
                    </h3>
                  </div>

                  <ul className="space-y-2">
                    {generatedPlan.advice.tips?.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>

                  {generatedPlan.advice.courseStrategies?.map((cs, i) => (
                    <div key={i} className="mt-3 p-3.5 rounded-2xl bg-brand-500/5 dark:bg-brand-950/20 border border-brand-500/15 text-xs space-y-1">
                      <p className="font-bold text-brand-700 dark:text-brand-300">{cs.course}</p>
                      <p className="text-slate-600 dark:text-slate-300">{cs.strategy}</p>
                    </div>
                  ))}
                </div>
              )}

            </motion.div>
          ) : (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-12 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                No Schedule Generated Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Add your exam courses and dates on the left and specify your daily study budget to generate an optimal timeline.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

