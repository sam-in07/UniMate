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

// Helper for validating research profile URLs
export function validateResearchUrl(val, expectedHost) {
  if (!val || typeof val !== 'string' || val.trim() === '') return true;
  try {
    const trimmed = val.trim();
    if (!trimmed.startsWith('https://')) return false;
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return false;
    if (expectedHost) {
      const host = url.hostname.toLowerCase();
      if (expectedHost === 'scholar.google.com') {
        return host === 'scholar.google.com' || host.includes('scholar.google.');
      }
      return host === expectedHost || host.endsWith('.' + expectedHost);
    }
    return true;
  } catch {
    return false;
  }
}

// Past question submission schema
export const pastQuestionSubmitSchema = z.object({
  course: z.string().min(2, 'Course name/code required').max(100),
  university: z.string().min(2, 'University name required').max(150),
  year: z.coerce.number().int().min(2000).max(2035),
  term: z.string().min(1, 'Term or semester is required').max(50),
  questionsText: z.string().max(40000).optional().default(''),
  topics: z.array(z.string()).optional(),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileSize: z.number().optional().nullable()
}).refine(data => (data.questionsText && data.questionsText.trim().length >= 10) || data.fileUrl || data.fileName, {
  message: 'Please provide either question text (at least 10 characters) or attach a file.'
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
  isProfileHidden: z.boolean().default(false).optional(),

  // Private Contact Details (Never shown publicly; shared only with accepted connections when toggle is ON)
  contactEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phoneNumber: z.string().max(30).optional().or(z.literal('')),
  shareContactWithConnections: z.boolean().default(false).optional(),

  // Research Links (Public academic profiles; validated for https and specific sites)
  scholarUrl: z.string().optional().or(z.literal('')).refine(v => validateResearchUrl(v, 'scholar.google.com'), {
    message: 'Google Scholar URL must start with https:// and belong to scholar.google.com'
  }),
  researchGateUrl: z.string().optional().or(z.literal('')).refine(v => validateResearchUrl(v, 'researchgate.net'), {
    message: 'ResearchGate URL must start with https:// and belong to researchgate.net'
  }),
  orcidUrl: z.string().optional().or(z.literal('')).refine(v => validateResearchUrl(v, 'orcid.org'), {
    message: 'ORCID URL must start with https:// and belong to orcid.org'
  }),
  linkedinUrl: z.string().optional().or(z.literal('')).refine(v => validateResearchUrl(v, 'linkedin.com'), {
    message: 'LinkedIn URL must start with https:// and belong to linkedin.com'
  }),
  githubUrl: z.string().optional().or(z.literal('')).refine(v => validateResearchUrl(v, 'github.com'), {
    message: 'GitHub URL must start with https:// and belong to github.com'
  }),
  websiteUrl: z.string().optional().or(z.literal('')).refine(v => validateResearchUrl(v, null), {
    message: 'Personal website URL must start with https://'
  })
});

