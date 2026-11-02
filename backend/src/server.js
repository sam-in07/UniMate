import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import studyRoutes from './routes/study.js';
import networkRoutes from './routes/network.js';

const app = express();
const PORT = process.env.PORT || 8080;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// 1. Helmet security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
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

// 3. Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use(globalLimiter);

// 4. Request Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 5. Mount API Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', studyRoutes);
app.use('/api', networkRoutes);

// 6. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// 7. Centralized Error Handler (No stack traces to clients)
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred',
    code: err.code || 'INTERNAL_ERROR'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` UniMate API Server running on port ${PORT}`);
    console.log(` Allowed Origin: ${FRONTEND_ORIGIN}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Buildathon: Ostad Presents YUNet AIgnite 2026`);
    console.log(`===============================================`);
  });
}

export default app;
