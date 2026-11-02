import express from 'express';
import { requireAuth, requireNonAnonymous } from '../middleware/auth.js';
import { db } from '../services/db.js';
import {
  aiCheckContentSafety,
  aiAssistListing,
  aiSemanticSearchListings,
  aiRankCollaborators
} from '../ai/client.js';
import {
  listingCreateSchema,
  listingUpdateSchema,
  listingAiAssistSchema,
  semanticSearchSchema,
  connectionRequestSchema,
  connectionStatusSchema,
  chatMessageSchema,
  reportSchema,
  blockSchema
} from '../schemas/network.js';

const router = express.Router();

// -------------------------------------------------------------
// 1. USED-BOOK MARKETPLACE
// -------------------------------------------------------------

/**
 * GET /api/listings
 * Browse & filter listings (Guests can browse read-only)
 */
router.get('/listings', async (req, res) => {
  try {
    const { search, tags, condition, university, minPrice, maxPrice } = req.query;
    const listings = await db.getListings({
      search,
      tags: tags ? tags.split(',') : undefined,
      condition,
      university,
      minPrice,
      maxPrice,
      status: 'active'
    });
    res.json({ status: 'success', listings });
  } catch (err) {
    console.error('[Marketplace GET listings error]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch marketplace listings' });
  }
});

/**
 * POST /api/listings/search
 * AI Semantic Search (converts natural language into tags/keywords)
 */
router.post('/listings/search', async (req, res) => {
  try {
    const { query } = semanticSearchSchema.parse(req.body);
    const parsed = await aiSemanticSearchListings(query);

    const listings = await db.getListings({
      search: parsed.cleanedQuery,
      tags: parsed.tags,
      status: 'active'
    });

    res.json({
      status: 'success',
      query,
      aiInterpretation: parsed,
      listings
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'Semantic search failed' });
  }
});

/**
 * GET /api/listings/:id
 * Single listing detail + seller public mini-profile
 */
router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await db.getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    let seller = null;
    try {
      const sellerProfile = await db.getUser(listing.sellerUid);
      if (sellerProfile) {
        // Privacy: NO email or phone number ever displayed
        seller = {
          uid: sellerProfile.uid,
          displayName: sellerProfile.displayName || 'Campus Student',
          photoURL: sellerProfile.photoURL || null,
          university: sellerProfile.university || listing.university || 'University Student',
          level: sellerProfile.level || 'undergrad',
          isVerifiedStudent: Boolean(sellerProfile.isVerifiedStudent)
        };
      }
    } catch {
      seller = {
        uid: listing.sellerUid,
        displayName: 'Student Seller',
        photoURL: null,
        university: listing.university || 'Campus'
      };
    }

    res.json({
      status: 'success',
      listing,
      seller,
      safetyTip: 'Meet in a well-lit public or campus location. Inspect the book condition before completing payment. UniMate does not process payments.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch listing' });
  }
});

/**
 * POST /api/listings/ai-assist
 * AI Assist: Proposes title, author, edition, tags & suggested BDT price range
 */
router.post('/listings/ai-assist', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const { query } = listingAiAssistSchema.parse(req.body);
    const suggestion = await aiAssistListing({ query });
    res.json({
      status: 'success',
      suggestion
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'AI assist could not process book details' });
  }
});

/**
 * POST /api/listings
 * Create new listing (Requires Google sign-in + AI content safety check)
 */
router.post('/listings', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const data = listingCreateSchema.parse(req.body);

    // AI Abuse / Spam Content Check before publishing
    const safetyCheck = await aiCheckContentSafety(`${data.title} ${data.description}`);
    if (safetyCheck.flagged || safetyCheck.safe === false) {
      return res.status(400).json({
        error: `Content flagged by community safety filter: ${safetyCheck.reason || 'Please ensure listing description follows campus student guidelines.'}`
      });
    }

    const created = await db.createListing(req.user.uid, data);
    res.json({
      status: 'success',
      listing: created
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    console.error('[Create Listing Error]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create listing' });
  }
});

/**
 * PUT /api/listings/:id
 */
router.put('/listings/:id', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const data = listingUpdateSchema.parse(req.body);
    const updated = await db.updateListing(req.params.id, req.user.uid, data);
    if (!updated) return res.status(404).json({ error: 'Listing not found' });
    res.json({ status: 'success', listing: updated });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'Failed to update listing' });
  }
});

/**
 * PUT /api/listings/:id/sold
 */
router.put('/listings/:id/sold', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const updated = await db.markListingSold(req.params.id, req.user.uid);
    if (!updated) return res.status(404).json({ error: 'Listing not found' });
    res.json({ status: 'success', message: 'Listing marked as sold', listing: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to mark listing as sold' });
  }
});

/**
 * DELETE /api/listings/:id
 */
router.delete('/listings/:id', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const ok = await db.deleteListing(req.params.id, req.user.uid);
    if (!ok) return res.status(404).json({ error: 'Listing not found' });
    res.json({ status: 'success', message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete listing' });
  }
});

// -------------------------------------------------------------
// 2. COLLABORATOR FINDER
// -------------------------------------------------------------

/**
 * GET /api/partners/discover
 * Discover peer profiles with AI match ranking & "why this match"
 */
router.get('/partners/discover', requireAuth, async (req, res) => {
  try {
    const { university, lookingFor, skill } = req.query;
    const candidates = await db.getDiscoverableProfiles(req.user.uid, {
      university,
      lookingFor,
      skill
    });

    // Fetch user profile and weak topics if available
    let userProfile = null;
    let weakTopics = [];
    try {
      userProfile = await db.getUser(req.user.uid);
      const attempts = await db.getAttempts(req.user.uid);
      const stats = {};
      attempts.forEach(a => {
        if (a.topicStats) {
          Object.entries(a.topicStats).forEach(([t, s]) => {
            if (!stats[t]) stats[t] = { total: 0, correct: 0 };
            stats[t].total += s.total || 0;
            stats[t].correct += s.correct || 0;
          });
        }
      });
      weakTopics = Object.entries(stats)
        .filter(([_, s]) => s.total > 0 && (s.correct / s.total) < 0.6)
        .map(([t]) => t);
    } catch {}

    // AI Ranks candidate profiles with "why this match"
    const ranked = await aiRankCollaborators({
      userProfile,
      weakTopics,
      candidates: candidates.slice(0, 15)
    });

    res.json({
      status: 'success',
      notice: 'UniMate connects verified university students. Never share home addresses or financial details.',
      matches: ranked
    });
  } catch (err) {
    console.error('[Discover Partners Error]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to discover partners' });
  }
});

/**
 * POST /api/connections
 * Send a connection request to a student
 */
router.post('/connections', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const { toUid, message } = connectionRequestSchema.parse(req.body);
    const conn = await db.createConnection(req.user.uid, toUid, message);
    res.json({
      status: 'success',
      message: 'Connection request sent successfully!',
      connection: conn
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(400).json({ error: err.message || 'Failed to send connection request' });
  }
});

/**
 * GET /api/connections
 * List user's connection requests and accepted connections
 */
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const connections = await db.getUserConnections(req.user.uid);
    res.json({ status: 'success', connections });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch connections' });
  }
});

/**
 * PUT /api/connections/:id
 * Accept or decline connection request
 */
router.put('/connections/:id', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const { status } = connectionStatusSchema.parse(req.body);
    const updated = await db.updateConnectionStatus(req.params.id, req.user.uid, status);
    if (!updated) return res.status(404).json({ error: 'Connection request not found' });
    res.json({
      status: 'success',
      message: `Connection request ${status}`,
      connection: updated
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'Failed to update connection' });
  }
});

// -------------------------------------------------------------
// 3. IN-APP CHAT (Between accepted connections OR buyer-seller)
// -------------------------------------------------------------

/**
 * GET /api/chats
 * List active chat conversations
 */
router.get('/chats', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const chats = await db.getUserChats(req.user.uid);
    res.json({ status: 'success', chats });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch chats' });
  }
});

/**
 * POST /api/chats
 * Initialize or get chat conversation (Checks accepted connection or listing buyer-seller)
 */
router.post('/chats', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const { participantUid, type = 'collaborator', listingId = null } = req.body;
    if (!participantUid) {
      return res.status(400).json({ error: 'Participant UID is required' });
    }

    const chat = await db.getOrCreateChat({
      user1: req.user.uid,
      user2: participantUid,
      type,
      listingId
    });

    res.json({ status: 'success', chat });
  } catch (err) {
    res.status(403).json({ error: err.message || 'Unable to open chat conversation' });
  }
});

/**
 * GET /api/chats/:chatId/messages
 */
router.get('/chats/:chatId/messages', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const messages = await db.getChatMessages(req.params.chatId, req.user.uid);
    res.json({ status: 'success', messages });
  } catch (err) {
    res.status(403).json({ error: err.message || 'Failed to load chat messages' });
  }
});

/**
 * POST /api/chats/:chatId/messages
 * Send message in chat with safety check
 */
router.post('/chats/:chatId/messages', requireAuth, requireNonAnonymous, async (req, res) => {
  try {
    const { text } = chatMessageSchema.parse(req.body);

    // Safety check on chat message
    const safety = await aiCheckContentSafety(text);
    if (safety.flagged || safety.safe === false) {
      return res.status(400).json({
        error: `Message flagged: ${safety.reason || 'Please refrain from abusive or inappropriate language.'}`
      });
    }

    const message = await db.sendMessage(req.params.chatId, req.user.uid, text);
    res.json({ status: 'success', message });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

// -------------------------------------------------------------
// 4. NOTIFICATIONS
// -------------------------------------------------------------

/**
 * GET /api/notifications
 * Unread count + list
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await db.getUserNotifications(req.user.uid);
    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ status: 'success', unreadCount, notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/notifications/:id/read
 */
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await db.markNotificationRead(req.params.id, req.user.uid);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// -------------------------------------------------------------
// 5. SAFETY: REPORTS & BLOCKS
// -------------------------------------------------------------

/**
 * POST /api/reports
 */
router.post('/reports', requireAuth, async (req, res) => {
  try {
    const data = reportSchema.parse(req.body);
    const report = await db.reportItem(req.user.uid, data);
    res.json({
      status: 'success',
      message: 'Report submitted. Our moderation team will review this promptly.',
      reportId: report.id
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'Failed to submit report' });
  }
});

/**
 * POST /api/blocks
 */
router.post('/blocks', requireAuth, async (req, res) => {
  try {
    const { blockedUid } = blockSchema.parse(req.body);
    const block = await db.blockUser(req.user.uid, blockedUid);
    res.json({
      status: 'success',
      message: 'User blocked successfully.',
      block
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message || 'Failed to block user' });
  }
});

export default router;
