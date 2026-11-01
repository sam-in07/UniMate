import { auth, isFirebaseConfigured } from '../config/firebase.js';
import { checkUserRateLimit } from '../ai/client.js';

/**
 * Middleware: require authenticated user via Firebase ID token
 * Rule 4: User ID MUST come from verified token, never from body or query.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header with Bearer token'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // If Firebase Admin is configured, verify the real Firebase ID token
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
        isAnonymous
      };
      return next();
    } catch (err) {
      console.warn('[Auth Middleware] Firebase token verification failed:', err.message);
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired Firebase ID token'
      });
    }
  }

  // Development / Offline Fallback Mode
  // If Firebase credentials are not yet supplied, we decode mock/dev tokens
  try {
    if (token.startsWith('dev-guest:') || token === 'guest-token') {
      const guestId = token.startsWith('dev-guest:') ? token.split('dev-guest:')[1] : 'guest_anon_12345';
      req.user = {
        uid: guestId,
        email: null,
        displayName: 'Guest Student',
        photoURL: null,
        isAnonymous: true
      };
      return next();
    }

    if (token.startsWith('dev-user:')) {
      const uid = token.split('dev-user:')[1];
      req.user = {
        uid,
        email: `${uid}@example.com`,
        displayName: `Student ${uid.slice(0, 5)}`,
        photoURL: null,
        isAnonymous: false
      };
      return next();
    }

    // Attempt base64 JSON payload decode for simulated frontend tokens
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      const isAnonymous = payload.firebase?.sign_in_provider === 'anonymous' || !payload.email;
      req.user = {
        uid: payload.uid || payload.sub || 'dev_user_default',
        email: payload.email || null,
        displayName: payload.name || (isAnonymous ? 'Guest Student' : 'Student'),
        photoURL: payload.picture || null,
        isAnonymous
      };
      return next();
    }

    // Default development fallback session
    req.user = {
      uid: 'dev_user_' + Buffer.from(token).toString('hex').slice(0, 10),
      email: null,
      displayName: 'Guest Student',
      photoURL: null,
      isAnonymous: true
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

  if (req.user.isAnonymous) {
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
