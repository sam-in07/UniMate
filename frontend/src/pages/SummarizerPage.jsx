import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { speakText, stopSpeaking, isTTSSupported } from '../lib/speech';
import {
  BookOpen,
  UploadCloud,
  FileText,
  Sparkles,
  Volume2,
  VolumeX,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Languages,
  BookMarked
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SummarizerPage() {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en', 'bn', 'mixed'
  const [islamicMode, setIslamicMode] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10 MB limit.');
      return;
    }

    setFile(selected);
    setExtracting(true);

    try {
      const res = await api.uploadDocument(selected);
      setInputText(res.extractedText);
      toast.success(`Successfully extracted ${res.textLength} characters from ${res.title}`);
    } catch (err) {
      toast.error(err.message || 'Failed to extract text from document');
      setFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleSummarize = async () => {
    if (!inputText || inputText.trim().length < 15) {
      toast.error('Please enter or upload at least 15 characters of study notes.');
      return;
    }

    setSummarizing(true);
    try {
      const res = await api.summarize({
        text: inputText,
        language,
        islamicMode,
        title: file ? file.name.replace(/\.[^/.]+$/, '') : undefined
      });
      setSummaryData(res.summary);
      toast.success('High-yield summary generated & saved to library!');
    } catch (err) {
      toast.error(err.message || 'AI summarizer encountered an issue. Please try again.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleReadAloud = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }

    if (!summaryData) return;
    const textToRead = `${summaryData.title}. Executive summary: ${summaryData.executiveSummary}. Key points: ${summaryData.keyPoints.join('. ')}`;
    setSpeaking(true);
    speakText(textToRead, {
      lang: language === 'bn' ? 'bn' : 'en',
      onEnd: () => setSpeaking(false)
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              AI Study Summarizer
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Turn lengthy slides, lecture notes, and textbook chapters into structured exam-ready review sets.
          </p>
        </div>

        {/* Quick link to quiz from notes */}
        {summaryData && (
          <Link
            to={`/quiz?materialId=${summaryData.id}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Quiz from This</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-4">
            
            {/* File Upload Zone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Upload Slides / PDF or Notes
              </label>
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={extracting || summarizing}
                />
                {extracting ? (
                  <div className="flex items-center gap-2 text-xs text-brand-600 font-medium py-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Extracting readable text...</span>
                  </div>
                ) : file ? (
                  <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 py-2">
                    <FileText className="w-5 h-5 text-brand-500" />
                    <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Click to upload document</p>
                    <p className="text-[11px] text-slate-400">PDF or TXT up to 10MB</p>
                  </div>
                )}
              </label>
            </div>

            {/* Paste Text Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Or Paste Lecture Text
                </label>
                <span className="text-[11px] text-slate-400">
                  {inputText.length} chars
                </span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste lecture excerpts, topic notes, slides, or Banglish text here..."
                rows={9}
                className="w-full text-xs p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 leading-relaxed font-sans"
              />
            </div>

            {/* Language & Modes Configuration */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              
              {/* Language Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <Languages className="w-3.5 h-3.5 text-brand-500" />
                  <span>Output Language</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'en', label: 'English' },
                    { id: 'bn', label: 'বাংলা' },
                    { id: 'mixed', label: 'Banglish' }
                  ].map(lang => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id)}
                      className={`py-1.5 text-xs font-medium rounded-xl border transition-all ${
                        language === lang.id
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Islamic / Arabic Studies Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Islamic Studies Mode</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Strict source citations & verification notes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIslamicMode(!islamicMode)}
                  role="switch"
                  aria-checked={islamicMode}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    islamicMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      islamicMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>

            {/* Submit Button */}
            <button
              onClick={handleSummarize}
              disabled={summarizing || extracting || !inputText.trim()}
              className="w-full py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {summarizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Structured Summary...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate High-Yield Summary</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right Column: Structured Summary Output */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 min-h-[500px]">
            
            {summarizing ? (
              /* Skeleton Loader State */
              <div className="space-y-6 animate-pulse py-8">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/6" />
                </div>
                <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              </div>
            ) : summaryData ? (
              /* Generated Structured Summary View */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Summary Title & Voice Read-Aloud */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className={`text-xl font-bold text-slate-900 dark:text-white ${language === 'bn' ? 'font-bengali' : ''}`}>
                      {summaryData.title}
                    </h2>
                    {summaryData.topics && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {summaryData.topics.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isTTSSupported() && (
                    <button
                      onClick={handleReadAloud}
                      className={`p-2 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${
                        speaking
                          ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title={speaking ? 'Stop speech' : 'Read summary aloud'}
                    >
                      {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span className="hidden sm:inline">{speaking ? 'Stop' : 'Read Aloud'}</span>
                    </button>
                  )}
                </div>

                {/* 1. Executive Summary */}
                <div className="p-4 rounded-2xl bg-brand-500/5 dark:bg-brand-950/20 border border-brand-500/15">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">
                    Executive Summary
                  </h3>
                  <p className={`text-sm text-slate-700 dark:text-slate-200 leading-relaxed ${language === 'bn' ? 'font-bengali text-base' : ''}`}>
                    {summaryData.executiveSummary}
                  </p>
                </div>

                {/* 2. Key Points */}
                {summaryData.keyPoints?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      Key Concepts & Core Insights
                    </h3>
                    <ul className="space-y-2">
                      {summaryData.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className={language === 'bn' ? 'font-bengali' : ''}>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. Definitions */}
                {summaryData.definitions?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      Academic Definitions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {summaryData.definitions.map((def, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                            {def.term}
                          </p>
                          <p className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {def.meaning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Revision Notes */}
                {summaryData.revisionNotes?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                      High-Yield Exam Revision Notes
                    </h3>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {summaryData.revisionNotes.map((note, i) => (
                        <li key={i} className={language === 'bn' ? 'font-bengali' : ''}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 5. Islamic / Arabic References (if enabled) */}
                {summaryData.islamicReferences?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Scriptural References & Scholarship
                      </h3>
                    </div>
                    {summaryData.islamicReferences.map((ref, i) => (
                      <div key={i} className="text-xs space-y-1 border-t border-emerald-500/20 pt-2">
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">{ref.source}</p>
                        <p className="text-slate-600 dark:text-slate-300">{ref.note}</p>
                      </div>
                    ))}
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 italic pt-1">
                      Note: UniMate only cites confident references. Please verify with primary texts or qualified scholars.
                    </p>
                  </div>
                )}

              </motion.div>
            ) : (
              /* Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Ready to Summarize
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Upload a PDF document or paste your lecture content on the left to extract structured revision notes and definitions.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}

