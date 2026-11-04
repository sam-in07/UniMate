import { auth, isFirebaseConfigured } from '../config/firebase.js';
import { checkUserRateLimit } from '../ai/client.js';

function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  if (!token || token.toLowerCase() === 'undefined' || token.toLowerCase() === 'null') {
    return null;
  }
  return token;
}

/**
 * Middleware: require authenticated user via Firebase ID token
 * Returns clean 401 JSON.
 * In logs: include method, route and reason (missing, malformed, expired), never the token.
 */
export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    const reason = !req.headers.authorization ? 'missing Authorization header' : 'empty or malformed Bearer token';
    console.warn(`[requireAuth] ${req.method} ${req.originalUrl || req.url} - 401 Unauthorized: ${reason}`);
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid authentication token',
      code: 'AUTH_REQUIRED'
    });
  }

  // Test environment helper: allow simulated tokens during automated test runs only
  if (process.env.NODE_ENV === 'test' && token.startsWith('test-token:')) {
    const parts = token.split(':');
    const uid = parts[1];
    const isAnonymous = parts[2] === 'guest';
    const displayName = parts[3] || (isAnonymous ? 'Guest Student' : 'Student');
    const photoURL = parts.slice(4).join(':') || null;
    req.user = {
      uid,
      email: isAnonymous ? null : `${uid}@campus.ac.bd`,
      displayName,
      photoURL,
      isAnonymous,
      isDevFallback: false
    };
    return next();
  }

  // 1. Real Firebase Admin verification
  if (isFirebaseConfigured && auth) {
    try {
      const decoded = await auth.verifyIdToken(token);
      const isAnonymous = 
        decoded.firebase?.sign_in_provider === 'anonymous' ||
        decoded.provider_id === 'anonymous';

      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: decoded.name || (isAnonymous ? 'Guest Student' : 'Student'),
        photoURL: decoded.picture || null,
        isAnonymous: Boolean(isAnonymous),
        isDevFallback: false
      };
      return next();
    } catch (err) {
      const reason = err.code === 'auth/id-token-expired' ? 'expired' : 'malformed/invalid';
      console.warn(`[requireAuth] ${req.method} ${req.originalUrl || req.url} - 401 Unauthorized: token ${reason}`);
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired Firebase ID token',
        code: 'TOKEN_INVALID'
      });
    }
  }

  // 2. If Firebase Admin is NOT configured:
  const isStudyToolRequest = 
    req.baseUrl.includes('study') ||
    req.path.startsWith('/summarize') ||
    req.path.startsWith('/quiz') ||
    req.path.startsWith('/explain') ||
    req.path.startsWith('/plan') ||
    req.path.startsWith('/upload') ||
    req.path.startsWith('/past-questions') ||
    req.path.startsWith('/progress') ||
    req.path.startsWith('/library') ||
    req.path.startsWith('/materials');

  if (!isStudyToolRequest) {
    return res.status(503).json({
      error: 'Firebase Admin credentials not configured on backend. Real authentication is required for user profiles, marketplace, chat, and collaborator connections. Please provide FIREBASE_SERVICE_ACCOUNT_PATH or Firebase credentials in backend/.env.',
      code: 'FIREBASE_NOT_CONFIGURED'
    });
  }

  // Development fallback ONLY for study tools
  try {
    let uid = 'dev_study_guest';
    let isAnonymous = true;

    if (token.startsWith('dev-guest:') || token === 'guest-token') {
      uid = token.startsWith('dev-guest:') ? token.split('dev-guest:')[1] : 'guest_anon_12345';
      isAnonymous = true;
    } else if (token.startsWith('dev-user:')) {
      uid = token.split('dev-user:')[1];
      isAnonymous = false;
    }

    req.user = {
      uid,
      email: isAnonymous ? null : `${uid}@campus.ac.bd`,
      displayName: isAnonymous ? 'Guest Student (Demo Fallback)' : 'Student (Demo Fallback)',
      photoURL: null,
      isAnonymous,
      isDevFallback: true
    };
    return next();
  } catch (parseErr) {
    return res.status(401).json({
      error: 'Unauthorized: Unable to verify authentication credentials',
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Middleware: optional authentication for public GET routes
 * (past questions list/detail, marketplace browse, collaborator discover, health).
 * - A valid token attaches req.user.
 * - Missing or malformed token continues as anonymous (req.user = null) and NEVER returns 401.
 * - In logs: include method, route and reason (missing, malformed, expired), never the token.
 */
export async function optionalAuth(req, res, next) {
  req.user = null;
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    // Missing or empty Bearer token: continue as anonymous without error
    return next();
  }

  // Test environment helper
  if (process.env.NODE_ENV === 'test' && token.startsWith('test-token:')) {
    const parts = token.split(':');
    const uid = parts[1];
    const isAnonymous = parts[2] === 'guest';
    const displayName = parts[3] || (isAnonymous ? 'Guest Student' : 'Student');
    const photoURL = parts.slice(4).join(':') || null;
    req.user = {
      uid,
      email: isAnonymous ? null : `${uid}@campus.ac.bd`,
      displayName,
      photoURL,
      isAnonymous,
      isDevFallback: false
    };
    return next();
  }

  // Real Firebase Admin verification
  if (isFirebaseConfigured && auth) {
    try {
      const decoded = await auth.verifyIdToken(token);
      const isAnonymous = 
        decoded.firebase?.sign_in_provider === 'anonymous' ||
        decoded.provider_id === 'anonymous';

      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: decoded.name || (isAnonymous ? 'Guest Student' : 'Student'),
        photoURL: decoded.picture || null,
        isAnonymous: Boolean(isAnonymous),
        isDevFallback: false
      };
      return next();
    } catch (err) {
      const reason = err.code === 'auth/id-token-expired' ? 'expired' : 'malformed/invalid';
      console.log(`[optionalAuth] ${req.method} ${req.originalUrl || req.url} - Token ${reason}, continuing as anonymous student`);
      req.user = null;
      return next();
    }
  }

  // Development fallback
  if (token.startsWith('dev-guest:') || token === 'guest-token' || token.startsWith('dev-user:')) {
    const isAnonymous = !token.startsWith('dev-user:');
    const uid = token.startsWith('dev-guest:') ? token.split('dev-guest:')[1] : token.startsWith('dev-user:') ? token.split('dev-user:')[1] : 'guest_anon_12345';
    req.user = {
      uid,
      email: isAnonymous ? null : `${uid}@campus.ac.bd`,
      displayName: isAnonymous ? 'Guest Student' : 'Student',
      photoURL: null,
      isAnonymous,
      isDevFallback: true
    };
  }

  return next();
}

/**
 * Middleware: require a non-anonymous (Google signed in) user
 */
export function requireNonAnonymous(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
  }

  if (req.user.isAnonymous || req.user.isDevFallback) {
    return res.status(403).json({
      error: 'Action restricted: Please sign in with Google to perform this action.',
      code: 'GUEST_RESTRICTED'
    });
  }

  next();
}

/**
 * Middleware: Per-user AI rate limiter
 */
export function aiRateLimiter(req, res, next) {
  const uid = req.user?.uid || req.ip;
  const isGuest = Boolean(req.user?.isAnonymous);

  const check = checkUserRateLimit(uid, isGuest);
  if (!check.allowed) {
    return res.status(429).json({
      error: `Rate limit reached (${check.maxRequests} requests/min). Please try again in ${check.retryAfter} seconds.`,
      retryAfter: check.retryAfter
    });
  }

  next();
}
