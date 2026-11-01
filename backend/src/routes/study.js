import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { requireAuth, aiRateLimiter } from '../middleware/auth.js';
import { generateAI } from '../ai/client.js';
import { db } from '../services/db.js';
import {
  summarizeRequestSchema,
  summaryOutputSchema,
  quizGenerateRequestSchema,
  quizOutputSchema,
  quizAttemptSchema,
  explainRequestSchema,
  examPlanRequestSchema,
  pastQuestionSubmitSchema
} from '../schemas/study.js';

const router = express.Router();

// Multer memory storage for PDF/TXT uploads (10 MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are supported.'));
    }
  }
});

/**
 * POST /api/upload/extract
 * Extract text from uploaded PDF or TXT
 */
router.post('/upload/extract', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Please upload a PDF or TXT file.' });
    }

    let extractedText = '';

    if (req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
      try {
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text || '';
      } catch (parseErr) {
        return res.status(400).json({
          error: 'Failed to extract text from PDF. The document might be scanned/image-only or password-protected.'
        });
      }
    } else {
      extractedText = req.file.buffer.toString('utf-8');
    }

    const trimmed = extractedText.trim();
    if (!trimmed || trimmed.length < 15) {
      return res.status(400).json({
        error: 'No readable text could be extracted from this document. Please ensure the document contains selectable text, or paste your notes directly.'
      });
    }

    // Cap extracted text length to 40,000 characters
    const safeText = trimmed.slice(0, 40000);

    // Save as a study material record
    const material = await db.createMaterial(req.user.uid, {
      title: req.file.originalname.replace(/\.[^/.]+$/, ''),
      extractedText: safeText,
      type: req.file.mimetype === 'application/pdf' ? 'pdf' : 'txt'
    });

    res.json({
      status: 'success',
      materialId: material.id,
      title: material.title,
      textLength: safeText.length,
      extractedText: safeText
    });
  } catch (err) {
    console.error('[Upload Extract Error]:', err);
    res.status(500).json({ error: err.message || 'Error processing document upload' });
  }
});

/**
 * POST /api/summarize
 * Generate structured summary with key points, definitions, and revision notes
 */
router.post('/summarize', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { text, language, islamicMode, title } = summarizeRequestSchema.parse(req.body);

    const langInstruction = 
      language === 'bn' ? 'Bengali (বাংলা)' :
      language === 'mixed' ? 'Mixed Banglish/Bengali-English as spoken by university students' :
      'English';

    const systemPrompt = 
      `You are an expert university study summarizer.\n` +
      `Your task is to analyze the provided study material and return a structured JSON response matching the following schema:\n` +
      `{\n` +
      `  "title": "Short descriptive topic title",\n` +
      `  "executiveSummary": "A concise, high-impact summary paragraph",\n` +
      `  "keyPoints": ["Core concept 1", "Core concept 2", ...],\n` +
      `  "definitions": [{"term": "Concept", "meaning": "Clear academic definition"}],\n` +
      `  "revisionNotes": ["High-yield exam review point 1", ...],\n` +
      `  "topics": ["Subject Area 1", "Subject Area 2"],\n` +
      `  "islamicReferences": [{"source": "Quran/Hadith reference", "note": "Context & scholarship note"}] (ONLY if Islamic mode is enabled)\n` +
      `}\n` +
      `Language to output: ${langInstruction}.\n` +
      (islamicMode ? `ISLAMIC/ARABIC MODE ACTIVE: Separate academic explanation from scriptural references. Only cite authentic references with verified names. Add a disclaimer to check with scholars. Render Arabic quotes accurately.\n` : '') +
      `Output ONLY valid JSON. No conversational preamble.`;

    const result = await generateAI({
      system: systemPrompt,
      messages: [{ role: 'user', content: `Please summarize this study text:\n\n${text}` }],
      json: true,
      zodSchema: summaryOutputSchema
    });

    // Save summary under user's library
    const saved = await db.saveSummary(req.user.uid, {
      ...result.data,
      sourceTitle: title || result.data.title,
      language,
      islamicMode,
      provider: result.provider
    });

    res.json({
      status: 'success',
      summary: saved,
      provider: result.provider,
      cached: Boolean(result.cached)
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error('[Summarize Error]:', err);
    res.status(500).json({ error: err.message || 'AI summarizer encountered an error' });
  }
});

/**
 * POST /api/quiz/generate
 * Generate interactive MCQ / short answer quiz
 */
router.post('/quiz/generate', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { text, materialId, type, count, difficulty, language } = quizGenerateRequestSchema.parse(req.body);

    const langInstruction = 
      language === 'bn' ? 'Bengali (বাংলা)' :
      language === 'mixed' ? 'Banglish/Bengali-English' :
      'English';

    const systemPrompt = 
      `You are an expert academic examiner and quiz designer for university students.\n` +
      `Generate a ${difficulty} difficulty quiz with ${count} questions based strictly on the provided context.\n` +
      `Format requirements:\n` +
      `- Return a single JSON object matching this schema:\n` +
      `{\n` +
      `  "title": "Quiz Title",\n` +
      `  "difficulty": "${difficulty}",\n` +
      `  "language": "${language}",\n` +
      `  "questions": [\n` +
      `    {\n` +
      `      "id": "q1",\n` +
      `      "question": "Question text",\n` +
      `      "type": "${type === 'mixed' ? 'mcq' : type}",\n` +
      `      "options": ["Option A", "Option B", "Option C", "Option D"], // Provide 4 options if type is mcq\n` +
      `      "correctAnswer": "The exact correct option string",\n` +
      `      "explanation": "Clear explanation of why this is correct and why other options are wrong",\n` +
      `      "topic": "Specific Topic Name (e.g. Normalization, Operating Systems, Cell Biology)"\n` +
      `    }\n` +
      `  ]\n` +
      `}\n` +
      `Language: ${langInstruction}.\n` +
      `Ensure each question has a specific 'topic' tag so the student's weak areas can be tracked accurately.`;

    const result = await generateAI({
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate the quiz from this material:\n\n${text}` }],
      json: true,
      zodSchema: quizOutputSchema
    });

    const savedQuiz = await db.saveQuiz(req.user.uid, {
      ...result.data,
      materialId: materialId || null,
      provider: result.provider
    });

    res.json({
      status: 'success',
      quiz: savedQuiz,
      provider: result.provider
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error('[Quiz Generate Error]:', err);
    res.status(500).json({ error: err.message || 'AI quiz generator encountered an error' });
  }
});

/**
 * POST /api/quiz/attempt
 * Save quiz attempt and update topic correct/wrong stats
 */
router.post('/quiz/attempt', requireAuth, async (req, res) => {
  try {
    const data = quizAttemptSchema.parse(req.body);

    const savedAttempt = await db.saveAttempt(req.user.uid, {
      ...data,
      percentage: Math.round((data.score / data.maxScore) * 100)
    });

    res.json({
      status: 'success',
      attempt: savedAttempt
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid attempt data', details: err.errors });
    }
    console.error('[Quiz Attempt Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to record quiz attempt' });
  }
});

/**
 * POST /api/explain
 * AI Tutor chat session
 */
router.post('/explain', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { prompt, contextText, subject, level, language, mode, islamicMode, history } = 
      explainRequestSchema.parse(req.body);

    const langInstruction = 
      language === 'bn' ? 'Bengali (বাংলা)' :
      language === 'mixed' ? 'Banglish / conversational Bengali-English' :
      'English';

    let modeInstruction = '';
    if (mode === 'simpler') {
      modeInstruction = 'Explain using simple metaphors, clear step-by-step logic, and ELI5 (explain like I am 5) analogies.';
    } else if (mode === 'example') {
      modeInstruction = 'Explain with 2-3 vivid, real-world practical examples and student-relatable scenarios.';
    } else {
      modeInstruction = 'Explain in a clear, supportive academic manner appropriate for a student.';
    }

    const systemPrompt = 
      `You are UniMate's intelligent AI Academic Tutor for ${level} students in ${subject || 'all university subjects'}.\n` +
      `Rules:\n` +
      `- Mode: ${modeInstruction}\n` +
      `- Language: Respond in ${langInstruction}.\n` +
      `- Be concise, engaging, and encourage active recall.\n` +
      (islamicMode ? `- ISLAMIC/ARABIC MODE: Clearly separate academic explanation from religious citations. Only cite genuine Quran/Hadith references with chapter/verse or authentic collection names. Never fabricate. Show Arabic text with proper presentation and remind students to consult qualified teachers.\n` : '') +
      (contextText ? `- Use the attached student material as reference context:\n"""\n${contextText.slice(0, 15000)}\n"""\n` : '');

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: prompt }
    ];

    const result = await generateAI({
      system: systemPrompt,
      messages,
      json: false
    });

    res.json({
      status: 'success',
      reply: result.text,
      provider: result.provider,
      model: result.model
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error('[Explain Error]:', err);
    res.status(500).json({ error: err.message || 'AI tutor encountered an error' });
  }
});

/**
 * POST /api/plan/generate
 * Deterministic schedule for dates/hours + AI topic breakdown & tips
 */
router.post('/plan/generate', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { exams, dailyHours, startDate, language } = examPlanRequestSchema.parse(req.body);

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    // Deterministic scheduling logic
    const scheduledExams = exams.map(exam => {
      const examDate = new Date(exam.date);
      examDate.setHours(0, 0, 0, 0);
      const diffTime = examDate.getTime() - start.getTime();
      const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const priorityWeight = exam.priority === 'high' ? 1.5 : exam.priority === 'medium' ? 1.0 : 0.8;
      return {
        ...exam,
        daysLeft,
        examDateStr: examDate.toISOString().split('T')[0],
        priorityWeight
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    const maxDays = Math.min(60, Math.max(...scheduledExams.map(e => e.daysLeft)));
    const scheduleDays = [];

    for (let day = 0; day < maxDays; day++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Determine which exams are upcoming from this day
      const activeExams = scheduledExams.filter(e => e.daysLeft > day);
      if (activeExams.length === 0) break;

      // Weight inversely proportional to days remaining (closer exams get more daily hours)
      const weights = activeExams.map(e => {
        const remaining = e.daysLeft - day;
        return (1 / Math.max(1, remaining)) * e.priorityWeight;
      });
      const totalWeight = weights.reduce((acc, w) => acc + w, 0);

      const tasks = activeExams.map((e, idx) => {
        const allocatedHours = Number(((weights[idx] / totalWeight) * dailyHours).toFixed(1));
        return {
          course: e.course,
          hours: allocatedHours,
          urgency: e.daysLeft - day <= 3 ? 'urgent' : e.daysLeft - day <= 7 ? 'approaching' : 'normal',
          target: `Focus review for ${e.course}`
        };
      });

      scheduleDays.push({
        dayNumber: day + 1,
        date: dateStr,
        totalHours: dailyHours,
        tasks
      });
    }

    // Call AI to generate topic breakdowns and high-yield revision tips
    const coursesList = exams.map(e => `${e.course} (Exam in ${new Date(e.date).toDateString()})`).join(', ');
    const systemPrompt = 
      `You are an expert university study strategist. Given these upcoming courses: ${coursesList}.\n` +
      `Provide high-yield revision tips, suggested topic breakdown, and active recall suggestions in ${language === 'bn' ? 'Bengali' : 'English'}.\n` +
      `Return JSON in this format: { "tips": ["tip1", "tip2"], "courseStrategies": [{ "course": "course name", "recommendedTopics": ["topic 1", "topic 2"], "strategy": "short strategy" }] }`;

    let aiAdvice = { tips: [], courseStrategies: [] };
    try {
      const aiResult = await generateAI({
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Generate high-yield revision advice for this exam timeline.' }],
        json: true
      });
      aiAdvice = aiResult.data || aiAdvice;
    } catch (aiErr) {
      console.warn('[Plan AI Strategy Notice]: AI strategy fell back to default guidelines:', aiErr.message);
      aiAdvice = {
        tips: [
          'Use Pomodoro intervals: 50 minutes focused study, 10 minutes active break.',
          'Solve past semester questions for the most frequent recurring problems.',
          'Teach key concepts aloud to test deep understanding.'
        ],
        courseStrategies: exams.map(e => ({
          course: e.course,
          recommendedTopics: ['High-weight syllabus chapters', 'Formulae and derivations', 'Recent lecture notes'],
          strategy: 'Spend 60% of time practicing problems and 40% on theoretical review.'
        }))
      };
    }

    const fullPlan = {
      exams: scheduledExams,
      dailyHours,
      startDate: start.toISOString().split('T')[0],
      schedule: scheduleDays,
      advice: aiAdvice,
      createdAt: new Date().toISOString()
    };

    const savedPlan = await db.saveStudyPlan(req.user.uid, fullPlan);

    res.json({
      status: 'success',
      plan: savedPlan
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error('[Exam Plan Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate study plan' });
  }
});

/**
 * GET & DELETE /api/materials
 */
router.get('/materials', requireAuth, async (req, res) => {
  try {
    const list = await db.getMaterials(req.user.uid);
    res.json({ status: 'success', materials: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch study materials' });
  }
});

router.delete('/materials/:id', requireAuth, async (req, res) => {
  try {
    const ok = await db.deleteMaterial(req.params.id, req.user.uid);
    if (!ok) return res.status(404).json({ error: 'Material not found or unauthorized' });
    res.json({ status: 'success', message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

/**
 * GET /api/library
 * Aggregated library items (summaries, quizzes, materials, attempts)
 */
router.get('/library', requireAuth, async (req, res) => {
  try {
    const [materials, summaries, quizzes, attempts, plans] = await Promise.all([
      db.getMaterials(req.user.uid),
      db.getSummaries(req.user.uid),
      db.getQuizzes(req.user.uid),
      db.getAttempts(req.user.uid),
      db.getStudyPlans(req.user.uid)
    ]);

    res.json({
      status: 'success',
      library: {
        materials,
        summaries,
        quizzes,
        attempts,
        plans
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch library items' });
  }
});

/**
 * GET /api/progress
 * Progress metrics: Quiz scores trend, weak topics, and readiness indicator
 */
router.get('/progress', requireAuth, async (req, res) => {
  try {
    const [attempts, summaries, quizzes] = await Promise.all([
      db.getAttempts(req.user.uid),
      db.getSummaries(req.user.uid),
      db.getQuizzes(req.user.uid)
    ]);

    // 1. Topic coverage and aggregation
    const allTopics = new Set();
    summaries.forEach(s => s.topics?.forEach(t => allTopics.add(t)));
    quizzes.forEach(q => q.questions?.forEach(quest => quest.topic && allTopics.add(quest.topic)));

    // 2. Weak topics analysis from attempts
    const topicPerformance = {};
    attempts.forEach(att => {
      if (att.topicStats) {
        Object.entries(att.topicStats).forEach(([topic, stats]) => {
          if (!topicPerformance[topic]) {
            topicPerformance[topic] = { total: 0, correct: 0 };
          }
          topicPerformance[topic].total += stats.total || 0;
          topicPerformance[topic].correct += stats.correct || 0;
        });
      }
    });

    const weakTopics = [];
    const strongTopics = [];

    Object.entries(topicPerformance).forEach(([topic, stats]) => {
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const record = { topic, ...stats, accuracy };
      if (accuracy < 60) {
        weakTopics.push(record);
      } else {
        strongTopics.push(record);
      }
    });

    // 3. Quiz scores over time trend
    const scoreTrend = attempts.map(att => ({
      id: att.id,
      quizId: att.quizId,
      score: att.score,
      maxScore: att.maxScore,
      percentage: att.percentage ?? Math.round((att.score / att.maxScore) * 100),
      date: new Date(att.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })).reverse();

    // 4. Three distinct labelled metrics:
    // (a) Syllabus / Topic coverage percentage
    const uniqueTopicsCount = allTopics.size;
    const estimatedSyllabusBreadth = Math.min(100, uniqueTopicsCount * 12); // ~8 topics is 100% breadth

    // (b) Average Quiz Score
    const avgScore = attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / attempts.length)
      : 0;

    // (c) Estimated Readiness Indicator (Formula explanation clearly provided)
    // Formula: 50% Avg Quiz Score + 30% Syllabus Breadth + 20% Activity Consistency
    const consistencyScore = Math.min(100, (attempts.length + summaries.length) * 15);
    const estimatedReadiness = Math.round(
      (avgScore * 0.5) + (estimatedSyllabusBreadth * 0.3) + (consistencyScore * 0.2)
    );

    res.json({
      status: 'success',
      metrics: {
        topicCoverage: {
          percentage: estimatedSyllabusBreadth,
          uniqueTopicsCount,
          label: 'Syllabus & Topic Coverage'
        },
        quizScoreAverage: {
          averagePercentage: avgScore,
          attemptsCount: attempts.length,
          label: 'Average Quiz Performance'
        },
        estimatedReadiness: {
          score: estimatedReadiness,
          label: 'Estimated Exam Readiness',
          formulaExplanation: 'Calculated as: 50% average quiz scores + 30% topic breadth coverage + 20% study session consistency.'
        }
      },
      scoreTrend,
      weakTopics: weakTopics.sort((a, b) => a.accuracy - b.accuracy),
      strongTopics
    });
  } catch (err) {
    console.error('[Progress Error]:', err);
    res.status(500).json({ error: 'Failed to compute progress metrics' });
  }
});

/**
 * Past Questions Library
 */
router.get('/past-questions', requireAuth, async (req, res) => {
  try {
    const { course, university, year, search } = req.query;
    const questions = await db.getPastQuestions({ course, university, year, search });
    res.json({
      status: 'success',
      notice: 'Community student-contributed content. Not official university papers.',
      questions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch past questions' });
  }
});

router.post('/past-questions', requireAuth, async (req, res) => {
  try {
    const data = pastQuestionSubmitSchema.parse(req.body);

    // AI auto-tags topics from questions text
    let tags = data.topics || [];
    if (!tags || tags.length === 0) {
      try {
        const aiTagResult = await generateAI({
          system: 'Extract 3-5 concise subject topic tags from this exam question paper. Return JSON: { "tags": ["tag1", "tag2"] }',
          messages: [{ role: 'user', content: data.questionsText }],
          json: true
        });
        tags = aiTagResult.data?.tags || ['General Exam'];
      } catch (tagErr) {
        tags = [data.course];
      }
    }

    const created = await db.createPastQuestion(req.user.uid, {
      ...data,
      topics: tags
    });

    res.json({
      status: 'success',
      notice: 'Uploaded successfully to student past questions library.',
      question: created
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    res.status(500).json({ error: err.message || 'Failed to submit past questions' });
  }
});

/**
 * POST /api/reports
 * Report community content or past questions
 */
router.post('/reports', requireAuth, async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Target type, target ID, and reason are required' });
    }
    const report = await db.reportItem(req.user.uid, { targetType, targetId, reason });
    res.json({ status: 'success', message: 'Report submitted. Our moderators will review it promptly.', reportId: report.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
