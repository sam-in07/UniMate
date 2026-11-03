import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  UploadCloud,
  FileText,
  Download,
  Trash2
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
    questionsText: '',
    fileUrl: '',
    fileName: '',
    fileSize: null
  });

  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileProcess = async (file) => {
    if (!file) return;

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError('File size exceeds the 10 MB limit. Please upload a smaller file or paste text directly.');
      return;
    }

    // Validate type: PDF, JPG, PNG, WEBP
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const isAllowedExt = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
    if (!allowedTypes.includes(file.type) && !isAllowedExt) {
      setFileError('Only PDF documents and JPG/PNG images are supported.');
      return;
    }

    setFileError('');
    setUploadingFile(true);
    setAttachedFile(file);

    try {
      const res = await api.extractPastQuestionFile(file);
      setUploadData(prev => ({
        ...prev,
        fileUrl: res.fileUrl || '',
        fileName: res.fileName || file.name,
        fileSize: res.fileSize || file.size,
        questionsText: prev.questionsText || res.extractedText || ''
      }));
      setFormErrors(prev => ({ ...prev, questionsText: null }));
      toast.success(res.usedVision ? 'Scanned paper transcribed using AI vision!' : 'Question paper attached successfully!');
    } catch (err) {
      setFileError(err.message || 'Could not process question paper. Please paste text directly.');
      setAttachedFile(null);
      setUploadData(prev => ({ ...prev, fileUrl: '', fileName: '', fileSize: null }));
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    setFileError('');
    setUploadData(prev => ({
      ...prev,
      fileUrl: '',
      fileName: '',
      fileSize: null
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!uploadData.course.trim()) {
      errors.course = 'Please provide the course code or name (e.g. CSE 205).';
    }
    if (!uploadData.university.trim()) {
      errors.university = 'Please specify the university or college.';
    }
    if (!uploadData.term.trim()) {
      errors.term = 'Please specify the exam term or semester.';
    }

    // Require either at least 10 chars of text OR an attached file
    const hasEnoughText = uploadData.questionsText && uploadData.questionsText.trim().length >= 10;
    const hasFile = Boolean(uploadData.fileUrl || uploadData.fileName);
    if (!hasEnoughText && !hasFile) {
      errors.questionsText = 'Please attach a question paper (PDF/Image) or paste at least 10 characters of questions.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

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
        questionsText: '',
        fileUrl: '',
        fileName: '',
        fileSize: null
      });
      setAttachedFile(null);
      setFileError('');
      setFormErrors({});
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
          onClick={() => {
            setFormErrors({});
            setFileError('');
            setShowUploadModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-soft transition-all cursor-pointer"
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
            onClick={() => {
              setFormErrors({});
              setFileError('');
              setShowUploadModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-sm cursor-pointer"
          >
            Upload Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questions.map((item) => {
            const courseTitle = item.course || 'Untitled Course Paper';
            const uniName = item.university || 'General University';
            const termYear = [item.year, item.term].filter(Boolean).join(' • ') || 'Past Examination';
            const previewText = (item.questionsText && item.questionsText.trim()) 
              ? item.questionsText 
              : (item.fileName ? `Original paper: ${item.fileName}` : 'Exam questions preview not available.');

            const downloadUrl = item.fileUrl 
              ? (item.fileUrl.startsWith('http') ? item.fileUrl : `${import.meta.env.VITE_API_BASE_URL || ''}${item.fileUrl}`)
              : null;

            return (
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
                        {courseTitle}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <School className="w-3.5 h-3.5 shrink-0" />
                        <span>{uniName}</span>
                        <span>•</span>
                        <span>{termYear}</span>
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

                  {/* AI Topics */}
                  {Array.isArray(item.topics) && item.topics.filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 my-3">
                      {item.topics.filter(Boolean).map((t, idx) => (
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
                    {previewText}
                  </div>

                  {/* PDF / Image Download Link */}
                  {downloadUrl && (
                    <div className="mt-3">
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={item.fileName || 'exam-paper'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold transition-colors border border-brand-200/50 dark:border-brand-800/50"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[220px]">
                          {item.fileName ? `Download ${item.fileName}` : 'Download Paper (PDF)'}
                        </span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Student Contributed</span>
                  </span>
                  <span>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upload Question Paper Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Contribute Past Question Paper
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Share exam papers to help fellow students prepare.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              
              {/* Course Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Code & Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE 205 Data Structures & Algorithms"
                  value={uploadData.course}
                  onChange={(e) => {
                    setUploadData({ ...uploadData, course: e.target.value });
                    if (formErrors.course) setFormErrors({ ...formErrors, course: null });
                  }}
                  className={`w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                    formErrors.course ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                  } focus:outline-none`}
                />
                {formErrors.course && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 inline shrink-0" />
                    <span>{formErrors.course}</span>
                  </p>
                )}
              </div>

              {/* University and Term */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    University / College *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. University of Dhaka"
                    value={uploadData.university}
                    onChange={(e) => {
                      setUploadData({ ...uploadData, university: e.target.value });
                      if (formErrors.university) setFormErrors({ ...formErrors, university: null });
                    }}
                    className={`w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                      formErrors.university ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } focus:outline-none`}
                  />
                  {formErrors.university && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 inline shrink-0" />
                      <span>{formErrors.university}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Term / Semester *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 Fall Midterm"
                    value={uploadData.term}
                    onChange={(e) => {
                      setUploadData({ ...uploadData, term: e.target.value });
                      if (formErrors.term) setFormErrors({ ...formErrors, term: null });
                    }}
                    className={`w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                      formErrors.term ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } focus:outline-none`}
                  />
                  {formErrors.term && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 inline shrink-0" />
                      <span>{formErrors.term}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Drag & Drop File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Paper (PDF or Image, max 10 MB)
                </label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                {!uploadData.fileUrl && !uploadingFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <UploadCloud className="w-7 h-7 mx-auto text-slate-400 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Drag & drop your question paper here, or <span className="text-brand-600 dark:text-brand-400 underline">browse</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PDF, JPG or PNG up to 10 MB • Text will be extracted with AI
                    </p>
                  </div>
                ) : uploadingFile ? (
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-brand-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Reading & transcribing paper with AI...
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Extracting text and scanning pages
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {uploadData.fileName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(uploadData.fileSize)} • Attached to question paper
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* File Error Notice */}
                {fileError && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {fileError}
                    </p>
                  </div>
                )}
              </div>

              {/* Questions Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Questions Text {uploadData.fileUrl ? '(Optional when file attached)' : '*'}
                  </label>
                  {uploadData.fileUrl && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ File Attached
                    </span>
                  )}
                </div>
                
                <textarea
                  rows={5}
                  placeholder={
                    uploadData.fileUrl
                      ? "Extracted questions will appear here. You can edit or leave empty."
                      : "Paste exam question statements or problem descriptions here..."
                  }
                  value={uploadData.questionsText}
                  onChange={(e) => {
                    setUploadData({ ...uploadData, questionsText: e.target.value });
                    if (formErrors.questionsText) setFormErrors({ ...formErrors, questionsText: null });
                  }}
                  className={`w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                    formErrors.questionsText ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                  } focus:outline-none font-mono`}
                />

                {formErrors.questionsText && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 inline shrink-0" />
                    <span>{formErrors.questionsText}</span>
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
                <span>AI will automatically analyze and extract topics (e.g. #BinaryTrees, #FourierTransform).</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Publish Paper</span>
                    </>
                  )}
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
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
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
