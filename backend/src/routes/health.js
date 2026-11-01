import express from 'express';
import { checkAIHealth } from '../ai/client.js';
import { isFirebaseConfigured } from '../config/firebase.js';

const router = express.Router();

/**
 * General health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'UniMate',
    buildathon: 'Ostad Presents YUNet AIgnite Buildathon 2026',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    firebaseAdmin: isFirebaseConfigured ? 'connected' : 'dev_mode'
  });
});

/**
 * AI Provider reachability health check
 * Does NOT leak keys or secrets
 */
router.get('/health/ai', async (req, res) => {
  try {
    const health = await checkAIHealth();
    res.json({
      status: 'ok',
      ...health
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

export default router;
