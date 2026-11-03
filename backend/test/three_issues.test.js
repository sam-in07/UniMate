process.env.NODE_ENV = 'test';

import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import http from 'http';
import fs from 'fs';
import app from '../src/server.js';
import { db } from '../src/services/db.js';

async function runThreeIssuesSuite() {
  console.log('===============================================================');
  console.log('   UniMate Verification Suite: Three Issues Verification       ');
  console.log('   1) Past Questions: PDF Upload & Scanned Error Handling      ');
  console.log('   2) Profile: Contact Info & Research Links Privacy Model     ');
  console.log('   3) Google Profile Photo & CSP / Helmet Headers             ');
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

  function getTestToken(uid, isAnonymous = false, displayName = 'Student', photo = '') {
    return `test-token:${uid}:${isAnonymous ? 'guest' : 'user'}:${displayName}:${photo}`;
  }

  try {
    // -------------------------------------------------------------
    // ISSUE 3: Google Profile Photo & Security Headers
    // -------------------------------------------------------------
    console.log('\n--- Testing Issue 3: Google Profile Photo & CSP / Helmet ---');

    await test('CSP header allows googleusercontent.com images and popup policy', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const csp = res.headers.get('content-security-policy') || '';
      const coop = res.headers.get('cross-origin-opener-policy') || '';

      if (!csp.includes('googleusercontent.com')) {
        throw new Error(`CSP missing googleusercontent.com: ${csp}`);
      }
      if (coop !== 'same-origin-allow-popups') {
        throw new Error(`COOP header not set to same-origin-allow-popups: got ${coop}`);
      }
    });

    await test('GET /api/me saves and refreshes photoURL and displayName on login', async () => {
      const photoUrl = 'https://lh3.googleusercontent.com/a/ACg8ocISampleAvatar123';
      const token = getTestToken('testPhotoUser', false, 'Photo Student', photoUrl);

      const res = await fetch(`${baseUrl}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (data.user.photoURL !== photoUrl) {
        throw new Error(`Expected photoURL to match, got ${data.user.photoURL}`);
      }
      if (data.user.displayName !== 'Photo Student') {
        throw new Error(`Expected displayName to match, got ${data.user.displayName}`);
      }
    });

    // -------------------------------------------------------------
    // ISSUE 2: Profile Contact Info, Privacy Model & Research Links
    // -------------------------------------------------------------
    console.log('\n--- Testing Issue 2: Profile Contact Info & Research Links Privacy ---');

    const userA_Token = getTestToken('userAlice', false, 'Alice Researcher');
    const userB_Token = getTestToken('userBob', false, 'Bob Student');

    await test('Reject invalid research URL host (backend validation)', async () => {
      const res = await fetch(`${baseUrl}/api/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA_Token}`
        },
        body: JSON.stringify({
          displayName: 'Alice Researcher',
          scholarUrl: 'https://fake-scholar.org/citations?user=123'
        })
      });
      if (res.status !== 400) {
        throw new Error(`Expected 400 rejection for invalid scholar host, got ${res.status}`);
      }
    });

    await test('Reject non-https research URL (backend validation)', async () => {
      const res = await fetch(`${baseUrl}/api/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA_Token}`
        },
        body: JSON.stringify({
          displayName: 'Alice Researcher',
          githubUrl: 'http://github.com/alice'
        })
      });
      if (res.status !== 400) {
        throw new Error(`Expected 400 rejection for non-https github URL, got ${res.status}`);
      }
    });

    await test('Save valid profile with contact info and valid research URLs', async () => {
      const res = await fetch(`${baseUrl}/api/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA_Token}`
        },
        body: JSON.stringify({
          displayName: 'Alice Researcher',
          university: 'University of Dhaka',
          department: 'Computer Science',
          contactEmail: 'alice.private@univ.ac.bd',
          phoneNumber: '+8801712345678',
          shareContactWithConnections: false,
          scholarUrl: 'https://scholar.google.com/citations?user=alice123',
          researchGateUrl: 'https://www.researchgate.net/profile/Alice-Researcher',
          orcidUrl: 'https://orcid.org/0000-0002-1825-0097',
          linkedinUrl: 'https://linkedin.com/in/alice-dev',
          githubUrl: 'https://github.com/alice-research',
          websiteUrl: 'https://alice.me'
        })
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${data.error}`);
      if (data.profile.contactEmail !== 'alice.private@univ.ac.bd') {
        throw new Error(`Expected own profile to show contactEmail, got ${data.profile.contactEmail}`);
      }
    });

    await test('User B fetching User A via /api/users/:uid CANNOT see contact info when not connected', async () => {
      const res = await fetch(`${baseUrl}/api/users/userAlice`, {
        headers: { Authorization: `Bearer ${userB_Token}` }
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (data.profile.contactEmail || data.profile.phoneNumber) {
        throw new Error(`LEAK: Contact email or phone was exposed to non-connected user! Email: ${data.profile.contactEmail}, Phone: ${data.profile.phoneNumber}`);
      }
      // Public research links should be accessible
      if (data.profile.scholarUrl !== 'https://scholar.google.com/citations?user=alice123') {
        throw new Error(`Expected public scholarUrl to be visible, got ${data.profile.scholarUrl}`);
      }
    });

    await test('Partner discover (/api/partners/discover) strictly strips contact info', async () => {
      const res = await fetch(`${baseUrl}/api/partners/discover`, {
        headers: { Authorization: `Bearer ${userB_Token}` }
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const aliceInDiscover = data.candidates?.find(c => c.uid === 'userAlice');
      if (aliceInDiscover) {
        if (aliceInDiscover.contactEmail || aliceInDiscover.phoneNumber) {
          throw new Error('LEAK: contact info exposed in /api/partners/discover');
        }
      }
    });

    await test('Contact info remains hidden from User B even when shareContactWithConnections is TRUE if NOT accepted connection', async () => {
      // User A toggles sharing ON
      await fetch(`${baseUrl}/api/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA_Token}`
        },
        body: JSON.stringify({
          displayName: 'Alice Researcher',
          contactEmail: 'alice.private@univ.ac.bd',
          phoneNumber: '+8801712345678',
          shareContactWithConnections: true
        })
      });

      // User B checks User A
      const res = await fetch(`${baseUrl}/api/users/userAlice`, {
        headers: { Authorization: `Bearer ${userB_Token}` }
      });
      const data = await res.json();
      if (data.profile.contactEmail || data.profile.phoneNumber) {
        throw new Error(`LEAK: Contact info exposed before connection was accepted!`);
      }
    });

    await test('Contact info is visible to User B once connection is accepted', async () => {
      // User B sends connection request to User A
      const connRes = await fetch(`${baseUrl}/api/connections/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userB_Token}`
        },
        body: JSON.stringify({
          toUid: 'userAlice',
          note: 'Hi Alice, let us collaborate on research!'
        })
      });
      const connData = await connRes.json();
      const connectionId = connData.connection.id;

      // User A accepts connection request
      await fetch(`${baseUrl}/api/connections/${connectionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA_Token}`
        },
        body: JSON.stringify({ action: 'accept' })
      });

      // User B checks User A profile
      const res = await fetch(`${baseUrl}/api/users/userAlice`, {
        headers: { Authorization: `Bearer ${userB_Token}` }
      });
      const data = await res.json();
      if (!data.profile.contactEmail || data.profile.contactEmail !== 'alice.private@univ.ac.bd') {
        throw new Error(`Expected accepted connection to see contactEmail, got ${data.profile.contactEmail}`);
      }
      if (!data.profile.phoneNumber || data.profile.phoneNumber !== '+8801712345678') {
        throw new Error(`Expected accepted connection to see phoneNumber, got ${data.profile.phoneNumber}`);
      }
    });

    // -------------------------------------------------------------
    // ISSUE 1: Past Questions: PDF Upload & Scanned Error Handling
    // -------------------------------------------------------------
    console.log('\n--- Testing Issue 1: Past Questions PDF Upload & OCR ---');

    // Minimal valid PDF with selectable text
    const samplePdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
72 712 Td
(CSE 303 Final Exam: Question 1: Explain Dijkstra Algorithm with complexity O(V+ElogV). Question 2: Implement a Trie.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
374
%%EOF`;

    let uploadedFileUrl = '';
    let uploadedFileName = '';

    await test('POST /api/past-questions/extract-file extracts selectable text from PDF', async () => {
      const pdfBuffer = fs.readFileSync('C:/Users/GIGABYTE/.gemini/antigravity/brain/c25e735d-6f1f-4926-a1fa-f308fb1d8f46/.user_uploaded/media_1793539261602_3499636b.pdf');
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample_exam.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
        pdfBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const res = await fetch(`${baseUrl}/api/past-questions/extract-file`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Authorization: `Bearer ${userA_Token}`
        },
        body
      });

      const data = await res.json();
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${data.error}`);
      }
      if (!data.fileUrl || !data.fileUrl.startsWith('/api/past-questions/files/')) {
        throw new Error(`Expected valid fileUrl, got ${data.fileUrl}`);
      }
      if (!data.extractedText || !data.extractedText.includes('UniMate')) {
        throw new Error(`Extracted text missing expected keywords: ${data.extractedText?.slice(0, 100)}`);
      }

      uploadedFileUrl = data.fileUrl;
      uploadedFileName = data.fileName;
    });

    await test('GET /api/past-questions/files/:filename streams PDF with correct Content-Type', async () => {
      const res = await fetch(`${baseUrl}${uploadedFileUrl}`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (contentType !== 'application/pdf') {
        throw new Error(`Expected application/pdf, got ${contentType}`);
      }
    });

    await test('POST /api/past-questions/extract-file on scanned/empty PDF returns exact error message', async () => {
      // PDF with zero text and no images
      const blankPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
192
%%EOF`;

      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="scanned_blank.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
        Buffer.from(blankPdf),
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const res = await fetch(`${baseUrl}/api/past-questions/extract-file`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Authorization: `Bearer ${userA_Token}`
        },
        body
      });

      const data = await res.json();
      if (res.status !== 400) {
        throw new Error(`Expected 400 for scanned/unreadable PDF, got ${res.status}`);
      }
      const expectedMsg = 'This PDF looks scanned and we could not read it. Please paste the text instead.';
      if (data.error !== expectedMsg) {
        throw new Error(`Expected exact error "${expectedMsg}", got "${data.error}"`);
      }
    });

    await test('POST /api/past-questions succeeds with attached file and empty questionsText', async () => {
      const res = await fetch(`${baseUrl}/api/past-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA_Token}`
        },
        body: JSON.stringify({
          course: 'CSE 303 Algorithms',
          university: 'University of Dhaka',
          year: 2024,
          term: 'Fall Final',
          questionsText: '',
          fileUrl: uploadedFileUrl,
          fileName: uploadedFileName,
          fileSize: 450
        })
      });

      const data = await res.json();
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}: ${data.error}`);
      }
      if (!data.question || data.question.course !== 'CSE 303 Algorithms') {
        throw new Error('Question was not created properly');
      }
    });

    await test('GET /api/past-questions returns questions without "null" or "undefined" literals', async () => {
      const res = await fetch(`${baseUrl}/api/past-questions`, {
        headers: { Authorization: `Bearer ${userA_Token}` }
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Expected at least one question in library');
      }

      for (const q of data.questions) {
        if (q.course === 'null' || q.university === 'null' || q.term === 'null') {
          throw new Error('Found literal "null" in question fields');
        }
        if (q.course === 'undefined' || q.university === 'undefined' || q.term === 'undefined') {
          throw new Error('Found literal "undefined" in question fields');
        }
      }
    });

  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================');
  if (failed > 0) process.exit(1);
}

runThreeIssuesSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
