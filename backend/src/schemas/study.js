import { z } from 'zod';

// Summarize input schema
export const summarizeRequestSchema = z.object({
  text: z.string().min(10, 'Input text must be at least 10 characters long').max(40000, 'Input text exceeds 40,000 characters limit'),
  language: z.enum(['en', 'bn', 'mixed']).default('en'),
  islamicMode: z.boolean().default(false),
  title: z.string().max(120).optional()
});

// Structured summary output schema
export const summaryOutputSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  keyPoints: z.array(z.string()),
  definitions: z.array(
    z.object({
      term: z.string(),
      meaning: z.string()
    })
  ),
  revisionNotes: z.array(z.string()),
  islamicReferences: z.array(
    z.object({
      source: z.string(),
      note: z.string()
    })
  ).optional(),
  topics: z.array(z.string())
});

// Quiz generation request schema
export const quizGenerateRequestSchema = z.object({
  text: z.string().min(10, 'Context text is required').max(40000),
  materialId: z.string().optional(),
  type: z.enum(['mcq', 'short', 'mixed']).default('mcq'),
  count: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  language: z.enum(['en', 'bn', 'mixed']).default('en')
});

// Single quiz question schema
export const quizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['mcq', 'short']),
  options: z.array(z.string()).optional(), // Required if type is mcq
  correctAnswer: z.string(),
  explanation: z.string(),
  topic: z.string()
});

// Quiz generation output schema
export const quizOutputSchema = z.object({
  title: z.string(),
  difficulty: z.string(),
  language: z.string(),
  questions: z.array(quizQuestionSchema)
});

// Quiz attempt submission schema
export const quizAttemptSchema = z.object({
  quizId: z.string(),
  materialId: z.string().optional(),
  answers: z.record(z.string(), z.string()), // questionId -> submitted answer
  score: z.number().min(0),
  maxScore: z.number().min(1),
  topicStats: z.record(
    z.string(),
    z.object({
      total: z.number(),
      correct: z.number()
    })
  )
});

// AI Tutor explain request schema
export const explainRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  contextText: z.string().max(25000).optional(),
  subject: z.string().max(100).optional(),
  level: z.enum(['high_school', 'undergrad', 'postgrad']).default('undergrad'),
  language: z.enum(['en', 'bn', 'mixed']).default('en'),
  mode: z.enum(['standard', 'simpler', 'example']).default('standard'),
  islamicMode: z.boolean().default(false),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
    })
  ).max(20).default([])
});

// Exam Planner request schema
export const examPlanRequestSchema = z.object({
  exams: z.array(
    z.object({
      course: z.string().min(1, 'Course name is required'),
      date: z.string(), // ISO date string YYYY-MM-DD
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
      topics: z.array(z.string()).optional()
    })
  ).min(1, 'At least one exam must be provided'),
  dailyHours: z.number().min(1).max(18).default(4),
  startDate: z.string().optional(), // defaults to today
  language: z.enum(['en', 'bn', 'mixed']).default('en')
});

// Past question submission schema
export const pastQuestionSubmitSchema = z.object({
  course: z.string().min(2, 'Course name/code required').max(100),
  university: z.string().min(2, 'University name required').max(150),
  year: z.number().int().min(2000).max(2035),
  term: z.string().min(1).max(50),
  questionsText: z.string().min(20, 'Question paper content required').max(30000),
  topics: z.array(z.string()).optional()
});

// User Profile update schema
export const userProfileSchema = z.object({
  displayName: z.string().max(80).optional(),
  photoURL: z.string().url().optional().or(z.literal('')),
  university: z.string().max(150).optional(),
  country: z.string().max(80).default('Bangladesh'),
  level: z.enum(['high school', 'undergrad', 'postgrad']).default('undergrad'),
  program: z.string().max(120).optional(),
  semester: z.string().max(50).optional(),
  languagePreference: z.enum(['bn', 'en', 'mixed']).default('en'),
  interests: z.array(z.string()).max(20).default([]),
  skills: z.array(z.string()).max(20).default([]),
  bio: z.string().max(500).default(''),
  lookingFor: z.array(
    z.enum(['study partner', 'conference team', 'paper co-author', 'project mate'])
  ).default([]),
  availability: z.string().max(100).default('Flexible'),
  isProfileHidden: z.boolean().default(false).optional()
});

