import app from '../src/server.js';
import http from 'http';

async function runTests() {
  console.log('--- Starting Backend Integration Tests ---');
  const server = http.createServer(app);
  
  await new Promise((resolve) => {
    server.listen(0, 'localhost', () => {
      resolve();
    });
  });

  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on port: ${port}`);

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`✖ [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  // 1. Health check
  await check('GET /api/health returns 200 and product info', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (data.product !== 'UniMate') throw new Error(`Unexpected product: ${data.product}`);
    if (!data.buildathon.includes('AIgnite')) throw new Error('Missing buildathon name');
  });

  // 2. AI Health check
  await check('GET /api/health/ai returns reachability info', async () => {
    const res = await fetch(`${baseUrl}/api/health/ai`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.providers || !data.providers.ollama || !data.providers.gemini) {
      throw new Error('Missing provider health metadata');
    }
    if (data.providers.ollama.apiKey || data.providers.gemini.apiKey) {
      throw new Error('CRITICAL: API keys leaked in health response');
    }
  });

  // 3. Unauthenticated protection
  await check('Unauthenticated /api/me returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/me`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 4. Authenticated profile creation
  await check('Guest authenticated /api/me creates and retrieves profile', async () => {
    const res = await fetch(`${baseUrl}/api/me`, {
      headers: { 'Authorization': 'Bearer guest-token' }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.user || !data.user.uid) throw new Error('User record missing UID');
    if (data.user.isAnonymous !== true) throw new Error('Expected isAnonymous true for guest');
  });

  // 5. Study Progress metrics
  await check('GET /api/progress returns 3 distinct labelled metrics', async () => {
    const res = await fetch(`${baseUrl}/api/progress`, {
      headers: { 'Authorization': 'Bearer guest-token' }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.metrics.topicCoverage || !data.metrics.quizScoreAverage || !data.metrics.estimatedReadiness) {
      throw new Error('Missing one of the 3 required metrics');
    }
    if (!data.metrics.estimatedReadiness.formulaExplanation) {
      throw new Error('Readiness indicator missing formula explanation');
    }
  });

  // 6. Zod validation failure handling
  await check('POST /api/summarize rejects invalid text length with 400', async () => {
    const res = await fetch(`${baseUrl}/api/summarize`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'too short' })
    });
    if (res.status !== 400) throw new Error(`Expected 400 for short text, got ${res.status}`);
  });

  // 7. Deterministic Exam Scheduler
  await check('POST /api/plan/generate builds deterministic schedule and tips', async () => {
    const res = await fetch(`${baseUrl}/api/plan/generate`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exams: [
          { course: 'CSE 301 Database Systems', date: '2026-11-20', priority: 'high' },
          { course: 'CSE 305 Computer Networks', date: '2026-11-25', priority: 'medium' }
        ],
        dailyHours: 5,
        language: 'en'
      })
    });
    if (res.status !== 200) {
      const err = await res.json();
      throw new Error(`Plan generation failed: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    if (!data.plan || !Array.isArray(data.plan.schedule) || data.plan.schedule.length === 0) {
      throw new Error('Plan did not produce daily schedule');
    }
    if (!data.plan.advice || !Array.isArray(data.plan.advice.tips)) {
      throw new Error('Plan missing high-yield study advice');
    }
  });

  // 8. Past Questions Library
  await check('Past questions endpoint enforces student-contributed disclaimer', async () => {
    const res = await fetch(`${baseUrl}/api/past-questions`, {
      headers: { 'Authorization': 'Bearer guest-token' }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.notice.includes('student-contributed')) {
      throw new Error('Missing student-contributed disclaimer');
    }
  });

  // 9. Report endpoint
  await check('POST /api/reports accepts report submission', async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetType: 'pastQuestion',
        targetId: 'pq-test-1',
        reason: 'Typo in question 3'
      })
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (data.status !== 'success') throw new Error('Report submission failed');
  });

  await new Promise((resolve) => server.close(resolve));

  console.log(`\n================================`);
  console.log(`Backend Tests Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
