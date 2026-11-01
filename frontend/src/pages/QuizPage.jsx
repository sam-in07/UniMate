import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Users,
  Search,
  Loader2,
  Check
} from 'lucide-react';

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const materialId = searchParams.get('materialId');

  const [contextText, setContextText] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('en');
  const [generating, setGenerating] = useState(false);

  // Active quiz state
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // qId -> answer string
  const [revealed, setRevealed] = useState({}); // qId -> boolean (whether user checked answer)
  const [completed, setCompleted] = useState(false);
  const [attemptRecord, setAttemptRecord] = useState(null);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);

  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!contextText.trim() || contextText.length < 15) {
      toast.error('Please provide at least 15 characters of study notes to generate a quiz.');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.generateQuiz({
        text: contextText,
        materialId: materialId || undefined,
        count: Number(count),
        difficulty,
        language,
        type: 'mcq'
      });
      setQuiz(res.quiz);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setRevealed({});
      setCompleted(false);
      setAttemptRecord(null);
      toast.success('Quiz generated! Test your active recall.');
    } catch (err) {
      toast.error(err.message || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (option) => {
    const currentQuestion = quiz.questions[currentIndex];
    if (revealed[currentQuestion.id]) return; // locked once revealed

    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const handleCheckAnswer = () => {
    const currentQuestion = quiz.questions[currentIndex];
    if (!selectedAnswers[currentQuestion.id]) {
      toast.error('Please select an option first.');
      return;
    }

    setRevealed(prev => ({
      ...prev,
      [currentQuestion.id]: true
    }));
  };

  const handleNext = async () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Final question reached: Calculate score & submit attempt
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setSubmittingAttempt(true);
    try {
      let score = 0;
      const topicStats = {};

      quiz.questions.forEach(q => {
        const isCorrect = selectedAnswers[q.id]?.trim() === q.correctAnswer?.trim();
        if (isCorrect) score++;

        const topic = q.topic || 'General';
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0 };
        }
        topicStats[topic].total++;
        if (isCorrect) topicStats[topic].correct++;
      });

      const res = await api.submitQuizAttempt({
        quizId: quiz.id,
        materialId: quiz.materialId || undefined,
        answers: selectedAnswers,
        score,
        maxScore: quiz.questions.length,
        topicStats
      });

      setAttemptRecord({
        score,
        maxScore: quiz.questions.length,
        percentage: Math.round((score / quiz.questions.length) * 100),
        topicStats
      });

      setCompleted(true);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.warn('Confetti error:', e);
      }
    } catch (err) {
      toast.error('Failed to save quiz attempt: ' + err.message);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const currentQ = quiz?.questions?.[currentIndex];
  const progressPercent = quiz ? Math.round(((currentIndex + 1) / quiz.questions.length) * 100) : 0;

  // Identify weak topics (accuracy < 60%) to trigger our Differentiator integration!
  const weakTopics = attemptRecord?.topicStats
    ? Object.entries(attemptRecord.topicStats)
        .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) < 0.6)
        .map(([topic]) => topic)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Interactive Quiz Generator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Generate strict JSON-validated active recall questions with instant feedback and weak topic tracking.
          </p>
        </div>

        {quiz && !completed && (
          <button
            onClick={() => setQuiz(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Quiz</span>
          </button>
        )}
      </div>

      {!quiz ? (
        /* Quiz Setup Form */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Source Material for Quiz Questions
            </label>
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Paste study notes, textbook paragraphs, lecture transcripts, or Banglish text to generate quiz questions..."
              rows={7}
              className="w-full text-xs p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 leading-relaxed font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Question Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Number of Questions
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value={3}>3 Questions (Quick check)</option>
                <option value={5}>5 Questions (Standard)</option>
                <option value={10}>10 Questions (Comprehensive)</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="easy">Easy (Concept recall)</option>
                <option value="medium">Medium (Application & analysis)</option>
                <option value="hard">Hard (Advanced problem solving)</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="mixed">Banglish</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !contextText.trim()}
            className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Active-Recall Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Start Interactive Quiz</span>
              </>
            )}
          </button>
        </motion.div>
      ) : completed ? (
        /* Quiz Score & Differentiator Recommendations Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-8"
        >
          {/* Score Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Quiz Completed!
            </h2>
            <p className="text-xs text-slate-500">
              {quiz.title} • {quiz.difficulty.toUpperCase()}
            </p>

            <div className="mt-6 flex items-center justify-center gap-6">
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-center min-w-[120px]">
                <p className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">
                  {attemptRecord?.percentage}%
                </p>
                <p className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">
                  Score
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[120px]">
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {attemptRecord?.score} / {attemptRecord?.maxScore}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">
                  Correct Answers
                </p>
              </div>
            </div>
          </div>

          {/* Per-Topic Breakdown */}
          {attemptRecord?.topicStats && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Topic Mastery Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(attemptRecord.topicStats).map(([topic, stats]) => {
                  const percent = Math.round((stats.correct / stats.total) * 100);
                  const isWeak = percent < 60;
                  return (
                    <div
                      key={topic}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        isWeak
                          ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400'
                          : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{topic}</p>
                        <p className="text-[11px] opacity-80">{stats.correct} of {stats.total} correct</p>
                      </div>
                      <span className="text-xs font-extrabold px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-900/60 shadow-xs">
                        {percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Differentiator Integration Cards: Find Books & Study Partners for weak topics */}
          {weakTopics.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Targeted Revision Recommendations (Weak Areas Detected)
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                You scored lower on <span className="font-semibold text-slate-700 dark:text-slate-300">{weakTopics.join(', ')}</span>. Use these shortcuts to prepare better:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Integration Card 1: Books */}
                <Link
                  to={`/network?search=${encodeURIComponent(weakTopics[0])}&tab=books`}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                      Find Books for "{weakTopics[0]}"
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Search campus used-book listings for reference guides.
                    </p>
                  </div>
                </Link>

                {/* Integration Card 2: Partner */}
                <Link
                  to={`/network?filter=${encodeURIComponent(weakTopics[0])}&tab=partners`}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-amber/10 text-accent-amber flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                      Find Study Partner Strong in this
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Connect with students who excel in {weakTopics[0]}.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              to="/progress"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center"
            >
              View Analytics & Score Trends
            </Link>

            <button
              onClick={() => {
                setCurrentIndex(0);
                setSelectedAnswers({});
                setRevealed({});
                setCompleted(false);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              Retake This Quiz
            </button>
          </div>
        </motion.div>
      ) : (
        /* Question by Question Stepper */
        <div className="space-y-6">
          
          {/* Progress Bar & Counter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">
                Topic: {currentQ?.topic}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-600 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Current Question Card */}
          <motion.div
            key={currentQ?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 sm:p-8 rounded-3xl glass-panel shadow-soft border border-slate-200 dark:border-slate-800 space-y-6"
          >
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQ?.question}
            </h2>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ?.options?.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === option;
                const isRevealed = revealed[currentQ.id];
                const isCorrect = option === currentQ.correctAnswer;

                let optionStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-brand-500/60';
                if (isSelected && !isRevealed) {
                  optionStyle = 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 text-brand-900 dark:text-brand-200 ring-2 ring-brand-500/20';
                } else if (isRevealed) {
                  if (isCorrect) {
                    optionStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20';
                  } else {
                    optionStyle = 'opacity-50 border-slate-200 dark:border-slate-800';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(option)}
                    disabled={isRevealed}
                    className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer disabled:cursor-default ${optionStyle}`}
                  >
                    <span>{option}</span>
                    {isRevealed && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {isRevealed && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Explanation Box (when revealed) */}
            {revealed[currentQ?.id] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Explanation:</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {currentQ?.explanation}
                </p>
              </motion.div>
            )}

            {/* Stepper Footer Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                {revealed[currentQ?.id] ? 'Check complete' : 'Select an answer to reveal explanation'}
              </span>

              {!revealed[currentQ?.id] ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!selectedAnswers[currentQ?.id]}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={submittingAttempt}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-all shadow-soft"
                >
                  {submittingAttempt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentIndex < quiz.questions.length - 1 ? (
                    <>
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Complete & View Score</span>
                      <Award className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
}

