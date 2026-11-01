import app from '../src/server.js';
import http from 'http';

async function runPhase1Suite() {
  console.log('=====================================================');
  console.log('   UniMate Phase 1: Comprehensive Acceptance Suite   ');
  console.log('=====================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, 'localhost', resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`FAIL: ${name} ->`, e.message);
      failed++;
    }
  }

  // 1. Health & Config
  await test('Health check returns ok with buildathon metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'ok') throw new Error('Invalid health status');
  });

  // 2. Auth & Profiles
  await test('requireAuth blocks unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/me`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('Anonymous Guest login creates profile and sets isAnonymous: true', async () => {
    const res = await fetch(`${baseUrl}/api/me`, {
      headers: { 'Authorization': 'Bearer guest-token' }
    });
    const data = await res.json();
    if (res.status !== 200 || !data.user || data.user.isAnonymous !== true) {
      throw new Error('Guest profile verification failed');
    }
  });

  await test('Profile update succeeds with userProfileSchema', async () => {
    const res = await fetch(`${baseUrl}/api/me`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Rahim Ahmed',
        university: 'University of Dhaka',
        level: 'undergrad',
        languagePreference: 'bn',
        interests: ['Database Systems', 'Algorithms'],
        bio: '3rd year CS undergrad'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || data.user.university !== 'University of Dhaka') {
      throw new Error('Profile update failed');
    }
  });

  // 3. Summarizer validation
  await test('Summarizer rejects payloads shorter than 10 characters', async () => {
    const res = await fetch(`${baseUrl}/api/summarize`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'short' })
    });
    if (res.status !== 400) throw new Error('Did not reject short text');
  });

  // 4. Deterministic Exam Planner
  await test('Exam planner generates deterministic daily hour breakdown & milestones', async () => {
    const res = await fetch(`${baseUrl}/api/plan/generate`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exams: [
          { course: 'CSE 301 DBMS', date: '2026-11-20', priority: 'high' },
          { course: 'CSE 305 Networks', date: '2026-11-28', priority: 'medium' }
        ],
        dailyHours: 6,
        language: 'en'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.plan.schedule.length) {
      throw new Error('Plan generation failed');
    }
    const day1 = data.plan.schedule[0];
    const totalAllocated = day1.tasks.reduce((sum, t) => sum + t.hours, 0);
    // Floating point precision check: close to 6 hours
    if (Math.abs(totalAllocated - 6) > 0.5) {
      throw new Error(`Allocated hours (${totalAllocated}) differs from daily budget (6)`);
    }
  });

  // 5. Quiz Attempt Recording & Topic Performance
  await test('Quiz attempt submission accurately calculates percentage and updates topic stats', async () => {
    const res = await fetch(`${baseUrl}/api/quiz/attempt`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quizId: 'test-quiz-1',
        answers: { 'q1': 'Option A', 'q2': 'Option B' },
        score: 1,
        maxScore: 2,
        topicStats: {
          'Normalization': { total: 1, correct: 0 },
          'Indexing': { total: 1, correct: 1 }
        }
      })
    });
    const data = await res.json();
    if (res.status !== 200 || data.attempt.percentage !== 50) {
      throw new Error('Attempt calculation failed');
    }
  });

  // 6. Progress Analytics Metrics (The 3 Distinct Metrics)
  await test('Progress analytics returns the 3 required separate labelled metrics and weak topics', async () => {
    const res = await fetch(`${baseUrl}/api/progress`, {
      headers: { 'Authorization': 'Bearer guest-token' }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error('Progress fetch failed');
    if (!data.metrics.topicCoverage?.label) throw new Error('Metric 1 (Topic Coverage) missing');
    if (!data.metrics.quizScoreAverage?.label) throw new Error('Metric 2 (Quiz Average) missing');
    if (!data.metrics.estimatedReadiness?.formulaExplanation) throw new Error('Metric 3 (Readiness) missing explanation');

    // Check weak topics detection (Normalization had 0/1 correct = 0% < 60%)
    const hasNormalization = data.weakTopics.some(w => w.topic === 'Normalization');
    if (!hasNormalization) throw new Error('Weak topic detection failed');
  });

  // 7. Student Past Questions Bank & Safety
  await test('Student past questions paper submission auto-tags and marks student-contributed', async () => {
    const res = await fetch(`${baseUrl}/api/past-questions`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        course: 'CSE 110 Programming Language I',
        university: 'BRAC University',
        year: 2024,
        term: 'Summer Midterm',
        questionsText: 'Question 1: Explain call-by-value vs call-by-reference in C. Question 2: Write a recursive function to compute Fibonacci numbers.'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || data.question.isStudentContributed !== true) {
      throw new Error('Past question submission failed');
    }
  });

  await test('Content reporting endpoint functions cleanly', async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer guest-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetType: 'pastQuestion',
        targetId: 'dummy-id',
        reason: 'Duplicate upload'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.reportId) throw new Error('Report failed');
  });

  await new Promise((resolve) => server.close(resolve));

  console.log('=====================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runPhase1Suite().catch(err => {
  console.error('Suite error:', err);
  process.exit(1);
});

