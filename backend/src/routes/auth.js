import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../services/db.js';
import { userProfileSchema } from '../schemas/study.js';

const router = express.Router();

/**
 * GET /api/me
 * Retrieves current user profile or creates it on first login
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { uid, email, displayName, photoURL, isAnonymous } = req.user;

    let profile = await db.getUser(uid);

    if (!profile) {
      // First login: create default student profile
      profile = await db.setUser(uid, {
        uid,
        email: email || '',
        displayName: displayName || (isAnonymous ? 'Guest Student' : 'Student'),
        photoURL: photoURL || '',
        university: '',
        country: 'Bangladesh',
        level: 'undergrad',
        program: '',
        semester: '',
        languagePreference: 'en',
        interests: [],
        skills: [],
        bio: '',
        lookingFor: [],
        availability: 'Flexible',
        isVerifiedStudent: false,
        isAnonymous: Boolean(isAnonymous),
        createdAt: new Date().toISOString()
      });
      console.log(`[Auth] Created new user profile on first login for UID: ${uid}`);
    }

    res.json({
      status: 'success',
      user: profile
    });
  } catch (err) {
    console.error('[Auth Error /me GET]:', err);
    res.status(500).json({ error: 'Failed to retrieve or initialize user profile' });
  }
});

/**
 * PUT /api/me
 * Update student profile
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const validatedData = userProfileSchema.parse(req.body);

    const updated = await db.setUser(uid, validatedData);

    res.json({
      status: 'success',
      user: updated
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }
    console.error('[Auth Error /me PUT]:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
