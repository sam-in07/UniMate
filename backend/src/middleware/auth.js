import { auth, isFirebaseConfigured } from '../config/firebase.js';
import { checkUserRateLimit } from '../ai/client.js';

/**
 * Middleware: require authenticated user via Firebase ID token
 * Rule 4: User ID MUST come from verified token, never from body or query.
 * Step 1: Remove silent local fallback for users, marketplace, chat, connections.
 * Dev fallback is allowed ONLY for Study tools when Firebase credentials are not configured.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header with Bearer token'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

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
      console.warn('[Auth Middleware] Firebase token verification failed:', err.message);
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired Firebase ID token'
      });
    }
  }

  // 2. If Firebase Admin is NOT configured:
  // Is this request for study tools?
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
    // Block anything involving users, marketplace, chat, connections
    return res.status(503).json({
      error: 'Firebase Admin credentials not configured on backend. Real authentication is required for user profiles, marketplace, chat, and collaborator connections. Please provide FIREBASE_SERVICE_ACCOUNT_PATH or Firebase credentials in backend/.env.',
      code: 'FIREBASE_NOT_CONFIGURED'
    });
  }

  // Clearly labelled development fallback ONLY for study tools
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
      error: 'Unauthorized: Unable to verify authentication credentials'
    });
  }
}

/**
 * Middleware: require a non-anonymous (Google signed in) user
 */
export function requireNonAnonymous(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
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
