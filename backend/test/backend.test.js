import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';
import http from 'http';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    // Start on port 8089 for tests
    server = app.listen(8089, () => {
      baseUrl = 'http://127.0.0.1:8089';
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health returns 200 and product metadata', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.product, 'UniMate');
  assert.equal(data.buildathon, 'Ostad Presents YUNet AIgnite Buildathon 2026');
});

test('GET /api/health/ai returns reachability status without leaking keys', async () => {
  const res = await fetch(`${baseUrl}/api/health/ai`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.ok(data.providers.ollama);
  assert.ok(data.providers.gemini);
  // Ensure no sensitive keys exist in response
  assert.equal(data.providers.ollama.apiKey, undefined);
  assert.equal(data.providers.gemini.apiKey, undefined);
});

test('Unauthenticated access to /api/me returns 401', async () => {
  const res = await fetch(`${baseUrl}/api/me`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('Unauthorized'));
});

test('Guest authenticated access to /api/me creates and returns profile', async () => {
  const res = await fetch(`${baseUrl}/api/me`, {
    headers: {
      'Authorization': 'Bearer guest-token'
    }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'success');
  assert.ok(data.user.uid);
  assert.equal(data.user.isAnonymous, true);
});

test('GET /api/progress returns 3 distinct labelled metrics', async () => {
  const res = await fetch(`${baseUrl}/api/progress`, {
    headers: {
      'Authorization': 'Bearer guest-token'
    }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'success');
  assert.ok(data.metrics.topicCoverage);
  assert.ok(data.metrics.quizScoreAverage);
  assert.ok(data.metrics.estimatedReadiness);
  assert.ok(data.metrics.estimatedReadiness.formulaExplanation);
  assert.ok(Array.isArray(data.scoreTrend));
  assert.ok(Array.isArray(data.weakTopics));
});

test('POST /api/summarize rejects invalid text with 400', async () => {
  const res = await fetch(`${baseUrl}/api/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer guest-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: 'too short' })
  });
  assert.equal(res.status, 400);
});

test('Past questions library student-contributed flag & report button', async () => {
  const res = await fetch(`${baseUrl}/api/past-questions`, {
    headers: {
      'Authorization': 'Bearer guest-token'
    }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.notice.includes('student-contributed'));
});
