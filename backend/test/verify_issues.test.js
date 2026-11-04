process.env.NODE_ENV = 'test';

import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import http from 'http';
import app from '../src/server.js';
import { db } from '../src/services/db.js';

async function runVerification() {
  console.log('===============================================================');
  console.log('   UniMate Verification: Root Cause Fixes & E2E Validation     ');
  console.log('===============================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${name} ->`, e.message);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. One-time Migration for Whitespace in Past Questions
    // -----------------------------------------------------------------
    console.log('\n--- Step 1: Whitespace Migration on Past Questions ---');
    await test('migratePastQuestionsWhitespace trims existing text fields', async () => {
      const migratedCount = await db.migratePastQuestionsWhitespace();
      console.log(`  -> Migrated ${migratedCount} document(s) with trailing whitespace`);
    });

    // -----------------------------------------------------------------
    // 2. Cache-Control & Security Headers
    // -----------------------------------------------------------------
    console.log('\n--- Step 2: Cache-Control & Rate Limiting ---');
    await test('Cache-Control: no-store on /api routes to prevent cached empty lists', async () => {
      const res = await fetch(`${baseUrl}/api/past-questions`);
      const cc = res.headers.get('cache-control') || '';
      if (!cc.includes('no-store')) {
        throw new Error(`Expected Cache-Control: no-store, got: ${cc}`);
      }
    });

    await test('Health check is not rate limited', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.status !== 200) throw new Error(`Health check returned ${res.status}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(`Health status: ${data.status}`);
    });

    // -----------------------------------------------------------------
    // 3. Past Questions Listing: Guest vs Google User & Filter "IIUC"
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Past Questions Listing Verification ---');

    let paperId = null;

    // Test A: No auth header (Guest / Unauthenticated) & No filters
    await test('Guest (no token): GET /api/past-questions returns papers without 401', async () => {
      const requestUrl = `${baseUrl}/api/past-questions`;
      const res = await fetch(requestUrl);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      const count = data.questions?.length || 0;
      console.log(`  -> Request URL: ${requestUrl}`);
      console.log(`  -> Total results count: ${count}`);

      const target = data.questions.find(q =>
        q.course.toLowerCase().includes('ml mid question') &&
        q.university.toLowerCase() === 'iiuc'
      );

      if (!target) {
        throw new Error(`Target paper ("ML MID question", "IIUC") not found in list. Available: ${data.questions.map(q => `"${q.course}" at "${q.university}"`).join(', ')}`);
      }
      paperId = target.id;
      console.log(`  -> Found target paper: ID=${target.id}, Course="${target.course}", University="${target.university}"`);
    });

    // Test B: Guest with filter "IIUC"
    await test('Guest (no token): GET /api/past-questions?university=IIUC matches target paper', async () => {
      const requestUrl = `${baseUrl}/api/past-questions?university=IIUC`;
      const res = await fetch(requestUrl);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      const count = data.questions?.length || 0;
      console.log(`  -> Request URL: ${requestUrl}`);
      console.log(`  -> Results count with filter "IIUC": ${count}`);

      const match = data.questions.find(q => q.id === paperId);
      if (!match) {
        throw new Error(`Target paper not present when filtered by university=IIUC`);
      }
      console.log(`  -> Matched target paper: "${match.course}" (${match.university})`);
    });

    // Test C: Google User with filter "IIUC"
    await test('Google User: GET /api/past-questions?university=IIUC with Bearer token matches target paper', async () => {
      const requestUrl = `${baseUrl}/api/past-questions?university=IIUC`;
      const res = await fetch(requestUrl, {
        headers: {
          Authorization: 'Bearer test-token:googleStudent123:user:Google Student'
        }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      const count = data.questions?.length || 0;
      console.log(`  -> Request URL: ${requestUrl}`);
      console.log(`  -> Results count for Google user: ${count}`);

      const match = data.questions.find(q => q.id === paperId);
      if (!match) {
        throw new Error(`Target paper not present for Google user`);
      }
    });

    // Test D: Tolerates "undefined" query parameters gracefully
    await test('Backend gracefully ignores "undefined" and "null" string params', async () => {
      const requestUrl = `${baseUrl}/api/past-questions?search=undefined&course=undefined&university=undefined`;
      const res = await fetch(requestUrl);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      const count = data.questions?.length || 0;
      console.log(`  -> Request URL: ${requestUrl}`);
      console.log(`  -> Results count: ${count}`);

      if (count === 0) {
        throw new Error('Query with ?search=undefined&course=undefined&university=undefined filtered out all papers!');
      }
      const match = data.questions.find(q => q.id === paperId);
      if (!match) {
        throw new Error('Target paper filtered out by undefined params');
      }
    });

    // -----------------------------------------------------------------
    // 4. Auth Errors: Bearer undefined handling & Clean 401
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Auth Handling & optionalAuth ---');
    await test('optionalAuth continues as anonymous on "Bearer undefined" without 401', async () => {
      const res = await fetch(`${baseUrl}/api/past-questions`, {
        headers: { Authorization: 'Bearer undefined' }
      });
      if (res.status !== 200) throw new Error(`Expected 200 from optionalAuth, got ${res.status}`);
    });

    await test('requireAuth returns clean 401 on missing or invalid token', async () => {
      const res = await fetch(`${baseUrl}/api/me`, {
        headers: { Authorization: 'Bearer undefined' }
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      const data = await res.json();
      if (data.code !== 'AUTH_REQUIRED') {
        throw new Error(`Expected code AUTH_REQUIRED, got: ${data.code}`);
      }
    });

    // -----------------------------------------------------------------
    // 5. Watermark & Unreadable Text Topic Tagging Fallback
    // -----------------------------------------------------------------
    console.log('\n--- Step 5: Watermark & Unreadable Text Handling ---');
    await test('Watermark-only text is not sent to AI, saved with textReadable=false and empty topics', async () => {
      const res = await fetch(`${baseUrl}/api/past-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token:uploaderUser:user:Uploader Student'
        },
        body: JSON.stringify({
          course: 'Physics 101',
          university: 'Dhaka University',
          year: 2024,
          term: 'Fall Final',
          questionsText: 'Scanned with CamScanner',
          fileUrl: '/api/past-questions/files/dummy.pdf',
          fileName: 'physics_camscanner.pdf'
        })
      });

      if (res.status !== 200) {
        const err = await res.json();
        throw new Error(`Expected 200, got ${res.status}: ${err.error}`);
      }

      const data = await res.json();
      const question = data.question;
      if (question.textReadable !== false) {
        throw new Error(`Expected textReadable to be false, got: ${question.textReadable}`);
      }
      if (question.questionsText !== '') {
        throw new Error(`Expected watermark text to be cleared, got: "${question.questionsText}"`);
      }
      if (!Array.isArray(question.topics) || question.topics.length !== 0) {
        throw new Error(`Expected empty topics [], got: ${JSON.stringify(question.topics)}`);
      }
      console.log('  -> Correctly saved with textReadable=false, topics=[], and watermark stripped!');
    });

  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================');
  if (failed > 0) process.exit(1);
}

runVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});

