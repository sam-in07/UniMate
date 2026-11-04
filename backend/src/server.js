import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import studyRoutes from './routes/study.js';
import networkRoutes from './routes/network.js';
import { db } from './services/db.js';

const app = express();
const PORT = process.env.PORT || 8080;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// 1. Helmet security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com', 'https://*.unsplash.com', 'https://images.unsplash.com'],
      connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseio.com', 'https://*.ollama.com', 'https://*.groq.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// 2. Strict CORS (only FRONTEND_ORIGIN)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or matching FRONTEND_ORIGIN
    if (!origin || origin === FRONTEND_ORIGIN || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Cache-Control: ensure all /api JSON responses are fresh (no 304 or browser caching)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// 4. Rate Limiter: Raised limit for cheap read routes, never rate-limit health checks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Raised to 2000 requests per 15 min per IP for cheap reads & navigation
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Never rate-limit health checks
    const url = req.originalUrl || req.url;
    return url === '/health' || url === '/health/ai' || url.startsWith('/api/health');
  },
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use(generalLimiter);

// 5. Request Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 6. Mount API Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', studyRoutes);
app.use('/api', networkRoutes);

// 7. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// 8. Centralized Error Handler (No stack traces to clients)
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred',
    code: err.code || 'INTERNAL_ERROR'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`===============================================`);
    console.log(` UniMate API Server running on port ${PORT}`);
    console.log(` Allowed Origin: ${FRONTEND_ORIGIN}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Buildathon: Ostad Presents YUNet AIgnite 2026`);
    console.log(`===============================================`);

    // One-time whitespace migration for existing past questions
    try {
      await db.migratePastQuestionsWhitespace();
    } catch (migErr) {
      console.warn('[Startup Migration Warning]:', migErr.message);
    }
  });
}

export default app;
