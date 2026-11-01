import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  FileQuestion,
  Search,
  Filter,
  Plus,
  Flag,
  Sparkles,
  School,
  Calendar,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function PastQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    course: '',
    university: '',
    year: new Date().getFullYear(),
    term: 'Spring / Final',
    questionsText: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Report modal state
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const { toast } = useToast();

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.getPastQuestions({
        search: search || undefined,
        course: selectedCourse || undefined,
        university: selectedUniversity || undefined
      });
      setQuestions(res.questions || []);
    } catch (err) {
      toast.error('Failed to load past questions bank.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [search, selectedCourse, selectedUniversity]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.course || !uploadData.university || !uploadData.questionsText) {
      toast.error('Please fill in all required question details.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitPastQuestion(uploadData);
      toast.success(res.notice || 'Uploaded question paper successfully!');
      setShowUploadModal(false);
      setUploadData({
        course: '',
        university: '',
        year: new Date().getFullYear(),
        term: 'Spring / Final',
        questionsText: ''
      });
      fetchQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to upload question paper');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setReporting(true);
    try {
      await api.report({
        targetType: 'pastQuestion',
        targetId: reportingId,
        reason: reportReason
      });
      toast.success('Report submitted. Thank you for keeping the library accurate.');
      setReportingId(null);
      setReportReason('');
    } catch (err) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header & Mandatory Student-Contributed Disclaimer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-accent-amber/10 text-amber-600 dark:text-amber-400">
              <FileQuestion className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Student Past Questions Bank
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Share and browse past semester question papers auto-tagged by AI.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-soft transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Contribute Paper</span>
        </button>
      </div>

      {/* Mandatory Disclaimer Box */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 mb-6">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200">
          <span className="font-bold">Student-Contributed Notice:</span> All question papers in this library are uploaded voluntarily by students for revision purposes. UniMate never claims them to be official university materials or endorsed examination sheets.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search questions, course, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="relative">
          <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filter by university (e.g. DU, BUET, NSU)..."
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filter by course name/code..."
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Questions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800">
          <FileQuestion className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Past Questions Found
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Be the first student to upload past questions for your course to help your campus community!
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-sm"
          >
            Upload Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questions.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 hover:shadow-soft-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.course}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <School className="w-3.5 h-3.5" />
                      <span>{item.university}</span>
                      <span>•</span>
                      <span>{item.year} ({item.term})</span>
                    </p>
                  </div>

                  <button
                    onClick={() => setReportingId(item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Report question paper"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* AI Tags */}
                {item.topics && item.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 my-3">
                    {item.topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Excerpt */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed font-mono">
                  {item.questionsText}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Student Contributed</span>
                </span>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Question Paper Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Contribute Past Question Paper
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Code & Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE 205 Data Structures & Algorithms"
                  value={uploadData.course}
                  onChange={(e) => setUploadData({ ...uploadData, course: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    University / College
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. University of Dhaka"
                    value={uploadData.university}
                    onChange={(e) => setUploadData({ ...uploadData, university: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Year & Term
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024 Fall Midterm"
                    value={uploadData.term}
                    onChange={(e) => setUploadData({ ...uploadData, term: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Questions Text (AI will automatically tag topics)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste questions text or exam problem statements..."
                  value={uploadData.questionsText}
                  onChange={(e) => setUploadData({ ...uploadData, questionsText: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-500">
                AI will automatically analyze and extract topics (e.g. #BinarySearch, #Graphs).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Publish Paper</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Report Modal */}
      {reportingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Report Question Paper
            </h3>
            <p className="text-xs text-slate-500">
              Please describe the issue (e.g., incorrect metadata, copyrighted material, offensive content).
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <textarea
                rows={3}
                required
                placeholder="Reason for reporting..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportingId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}

