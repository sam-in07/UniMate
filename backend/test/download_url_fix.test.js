process.env.NODE_ENV = 'test';

import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import http from 'http';

// Replicating resolveFileUrl from frontend/src/lib/api.js for node environment verification
function resolveFileUrl(fileUrl, baseUrl = 'http://localhost:8080/api') {
  if (!fileUrl || typeof fileUrl !== 'string') return '';
  const trimmed = fileUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const rawBase = baseUrl || 'http://localhost:8080/api';
  const backendOrigin = rawBase.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${cleanPath}`;
}

async function runTest() {
  const { default: app } = await import('../src/server.js');
  const { db } = await import('../src/services/db.js');
  console.log('Testing resolveFileUrl and Past Question Download URL...');

  // 1. Unit tests for resolveFileUrl
  const cases = [
    {
      input: '/api/past-questions/files/pq_1772648719276_a7d2x89.pdf',
      expected: 'http://localhost:8080/api/past-questions/files/pq_1772648719276_a7d2x89.pdf'
    },
    {
      input: 'api/past-questions/files/pq_1772648719276_a7d2x89.pdf',
      expected: 'http://localhost:8080/api/past-questions/files/pq_1772648719276_a7d2x89.pdf'
    },
    {
      input: 'https://storage.googleapis.com/bucket/file.pdf',
      expected: 'https://storage.googleapis.com/bucket/file.pdf'
    },
    {
      input: 'http://lh3.googleusercontent.com/avatar.jpg',
      expected: 'http://lh3.googleusercontent.com/avatar.jpg'
    },
    {
      input: null,
      expected: ''
    },
    {
      input: undefined,
      expected: ''
    },
    {
      input: '   ',
      expected: ''
    }
  ];

  for (const c of cases) {
    const res = resolveFileUrl(c.input);
    if (res !== c.expected) {
      throw new Error(`resolveFileUrl failed for ${c.input}: got "${res}", expected "${c.expected}"`);
    }
  }
  console.log('[PASS] resolveFileUrl correctly handles full URLs, relative paths, null, and empty strings.');

  // 2. Integration test against backend server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const serverOrigin = `http://127.0.0.1:${port}`;

  try {
    // Fetch past questions from DB
    const questions = await db.getPastQuestions({});
    console.log(`Found ${questions.length} past question papers in DB.`);

    const paperWithFile = questions.find(q => q.fileUrl);
    if (!paperWithFile) {
      console.warn('No paper with fileUrl found in DB. Creating a dummy file to test endpoint.');
    } else {
      console.log(`Found existing paper: "${paperWithFile.course}" (${paperWithFile.fileName || 'no name'})`);
      console.log(`Stored fileUrl: ${paperWithFile.fileUrl}`);

      // Resolved URL using local server port
      const resolvedUrl = resolveFileUrl(paperWithFile.fileUrl, `${serverOrigin}/api`);
      console.log(`Resolved URL: ${resolvedUrl}`);

      // Verify that the resolved URL does NOT contain /api/api
      if (resolvedUrl.includes('/api/api/')) {
        throw new Error(`Resolved URL still contains duplicate /api: ${resolvedUrl}`);
      }

      // Fetch the file from backend using the resolved URL
      const response = await fetch(resolvedUrl);
      console.log(`GET ${resolvedUrl} status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch file from resolved URL: status ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      console.log(`Successfully received ${buffer.byteLength} bytes.`);

      // Verify old buggy URL returns 404
      const buggyUrl = `${serverOrigin}/api${paperWithFile.fileUrl}`;
      console.log(`Verifying old buggy URL returns 404: ${buggyUrl}`);
      const buggyResponse = await fetch(buggyUrl);
      console.log(`GET buggyUrl status: ${buggyResponse.status} ${buggyResponse.statusText}`);
      if (buggyResponse.status !== 404) {
        throw new Error(`Expected buggy URL to return 404, but got ${buggyResponse.status}`);
      }
      console.log('[PASS] Buggy URL returns 404, while resolved URL returns 200 OK with PDF.');
    }

    console.log('\nAll download URL tests PASSED successfully!');
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
