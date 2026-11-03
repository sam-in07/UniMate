import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../services/db.js';
import { userProfileSchema } from '../schemas/study.js';

const router = express.Router();

// Helper to sanitize profile based on connection privacy
export function sanitizePublicProfile(profile, isAcceptedConnection = false) {
  if (!profile) return null;
  const sanitized = {
    uid: profile.uid,
    displayName: profile.displayName || 'Student',
    photoURL: profile.photoURL || null,
    university: profile.university || '',
    program: profile.program || '',
    level: profile.level || 'undergrad',
    semester: profile.semester || '',
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    lookingFor: Array.isArray(profile.lookingFor) ? profile.lookingFor : [],
    bio: profile.bio || '',
    availability: profile.availability || 'Flexible',
    isVerifiedStudent: Boolean(profile.isVerifiedStudent),
    isDemo: Boolean(profile.isDemo),
    isProfileHidden: Boolean(profile.isProfileHidden),

    // Public research links
    scholarUrl: profile.scholarUrl || null,
    researchGateUrl: profile.researchGateUrl || null,
    orcidUrl: profile.orcidUrl || null,
    linkedinUrl: profile.linkedinUrl || null,
    githubUrl: profile.githubUrl || null,
    websiteUrl: profile.websiteUrl || null
  };

  // Privacy rule: contact details are ONLY shared with accepted connections if user enabled the toggle
  if (isAcceptedConnection && profile.shareContactWithConnections) {
    sanitized.contactEmail = profile.contactEmail || null;
    sanitized.phoneNumber = profile.phoneNumber || null;
    sanitized.contactShared = true;
  } else {
    sanitized.contactEmail = null;
    sanitized.phoneNumber = null;
    sanitized.contactShared = false;
  }

  return sanitized;
}

/**
 * GET /api/me
 * Retrieves current user profile or creates it on first login.
 * Refreshes Google photoURL on every login.
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
        isProfileHidden: false,
        contactEmail: '',
        phoneNumber: '',
        shareContactWithConnections: false,
        scholarUrl: '',
        researchGateUrl: '',
        orcidUrl: '',
        linkedinUrl: '',
        githubUrl: '',
        websiteUrl: '',
        isVerifiedStudent: false,
        isAnonymous: Boolean(isAnonymous),
        createdAt: new Date().toISOString()
      });
      console.log(`[Auth] Created new user profile on first login for UID: ${uid}`);
    } else {
      // Refresh photoURL on subsequent logins if changed/provided
      const updates = {};
      if (photoURL && profile.photoURL !== photoURL) {
        updates.photoURL = photoURL;
      }
      if (displayName && (!profile.displayName || profile.displayName === 'Student') && displayName !== profile.displayName) {
        updates.displayName = displayName;
      }
      if (Object.keys(updates).length > 0) {
        profile = await db.setUser(uid, updates);
        console.log(`[Auth] Refreshed profile credentials for UID: ${uid}`);
      }
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
 * GET /api/users/:uid
 * View public student profile (Contact info strictly hidden unless accepted connection + sharing ON)
 */
router.get('/users/:uid', requireAuth, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const profile = await db.getUser(targetUid);
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const isSelf = req.user.uid === targetUid;
    const isConnected = isSelf || (await db.areUsersConnected(req.user.uid, targetUid));

    const sanitized = sanitizePublicProfile(profile, isConnected);
    res.json({
      status: 'success',
      user: sanitized
    });
  } catch (err) {
    console.error('[User GET Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve student profile' });
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

