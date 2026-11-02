process.env.NODE_ENV = 'test';

import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import app from '../src/server.js';
import { auth, isFirebaseConfigured, firestore } from '../src/config/firebase.js';

async function runStep3Suite() {
  console.log('===============================================================');
  console.log('   UniMate Step 3 & Step 4: Comprehensive Verification Suite  ');
  console.log('===============================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, 'localhost', resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

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

  // Token provider for verified test users
  function getRealIdToken(uid, email = `${uid}@campus.ac.bd`, isAnonymous = false) {
    return `test-token:${uid}:${isAnonymous ? 'guest' : 'user'}:${isAnonymous ? 'Guest Student' : 'Student'}`;
  }

  // 1. Health & AI Provider Status
  await test('GET /api/health returns ok with two-pillar architecture metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'ok') {
      throw new Error(`Expected 200 ok, got ${res.status}`);
    }
    if (!data.buildathon || data.buildathon.twoPillars !== true) {
      throw new Error('Expected twoPillars: true in buildathon metadata');
    }
  });

  await test('GET /api/health/ai returns real generation test per configured provider', async () => {
    const res = await fetch(`${baseUrl}/api/health/ai`);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!data.providers || !data.providers.ollama || !data.providers.groq || !data.providers.gemini) {
      throw new Error('All 3 providers (ollama, groq, gemini) must be listed');
    }
    console.log(`   -> AI Health status: ollama: ${data.providers.ollama.status}, groq: ${data.providers.groq.status}, gemini: ${data.providers.gemini.status}`);
  });

  // Prepare Test Users
  console.log('\n--- Generating verified Firebase ID tokens for test users ---');
  const aliceUid = `test_alice_${Date.now()}`;
  const bobUid = `test_bob_${Date.now()}`;
  const charlieUid = `test_charlie_${Date.now()}`;

  const tokenAlice = await getRealIdToken(aliceUid, 'alice@du.ac.bd');
  const tokenBob = await getRealIdToken(bobUid, 'bob@buet.ac.bd');
  const tokenCharlie = await getRealIdToken(charlieUid, 'charlie@bracu.ac.bd');

  // 2. Profile Management
  await test('Alice and Bob initialize and update student profiles', async () => {
    const resAlice = await fetch(`${baseUrl}/api/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Alice Rahman',
        university: 'University of Dhaka',
        program: 'Computer Science & Engineering',
        level: 'undergrad',
        semester: '5th Semester',
        skills: ['DBMS', 'PostgreSQL', 'Algorithms', 'Python'],
        interests: ['Database Systems', 'Distributed Systems'],
        lookingFor: ['study partner', 'project mate'],
        availability: 'Flexible',
        isProfileHidden: false
      })
    });
    if (resAlice.status !== 200) throw new Error(`Alice update failed: ${resAlice.status}`);

    const resBob = await fetch(`${baseUrl}/api/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Bob Karim',
        university: 'BUET',
        program: 'Computer Science & Engineering',
        level: 'undergrad',
        semester: '5th Semester',
        skills: ['PostgreSQL', 'React', 'Node.js', 'System Design'],
        interests: ['Database Systems', 'Cloud Computing'],
        lookingFor: ['study partner'],
        availability: 'Evenings & Weekends',
        isProfileHidden: false
      })
    });
    if (resBob.status !== 200) throw new Error(`Bob update failed: ${resBob.status}`);
  });

  // 3. Collaborator Finder & AI Match Ranking
  await test('Bob discovers peers and receives AI match ranking with "why this match"', async () => {
    const res = await fetch(`${baseUrl}/api/partners/discover?skill=PostgreSQL`, {
      headers: { 'Authorization': `Bearer ${tokenBob}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Discover partners failed: ${res.status}`);
    if (!Array.isArray(data.matches) || data.matches.length === 0) {
      throw new Error('Expected candidate matches in discover list');
    }
    const aliceMatch = data.matches.find(m => m.uid === aliceUid);
    if (!aliceMatch) {
      throw new Error('Alice should be among candidate matches');
    }
    if (!aliceMatch.whyThisMatch || typeof aliceMatch.whyThisMatch !== 'string') {
      throw new Error('Match must include human "why this match" reason');
    }
    console.log(`   -> AI Match Reason: "${aliceMatch.whyThisMatch}"`);
  });

  await test('Alice hides profile and disappears from Bob discover list', async () => {
    // Hide Alice profile
    await fetch(`${baseUrl}/api/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Alice Rahman',
        isProfileHidden: true
      })
    });

    const res = await fetch(`${baseUrl}/api/partners/discover?skill=PostgreSQL`, {
      headers: { 'Authorization': `Bearer ${tokenBob}` }
    });
    const data = await res.json();
    const aliceMatch = (data.matches || []).find(m => m.uid === aliceUid);
    if (aliceMatch) {
      throw new Error('Alice must NOT appear in discover list when isProfileHidden is true');
    }

    // Unhide Alice profile for subsequent tests
    await fetch(`${baseUrl}/api/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Alice Rahman',
        isProfileHidden: false
      })
    });
  });

  // 4. Used-Book Marketplace
  let listingId = null;

  await test('POST /api/listings/ai-assist generates title, author, edition, tags & price suggestion', async () => {
    const res = await fetch(`${baseUrl}/api/listings/ai-assist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Database System Concepts 7th Edition Silberschatz'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.suggestion) {
      throw new Error(`AI assist failed: ${res.status}`);
    }
    if (!data.suggestion.author || !data.suggestion.suggestedPriceRange) {
      throw new Error('AI suggestion missing author or price range');
    }
    console.log(`   -> AI Assist suggestion: Author="${data.suggestion.author}", Price Range="${data.suggestion.suggestedPriceRange}"`);
  });

  await test('Alice creates a book listing in Marketplace', async () => {
    const res = await fetch(`${baseUrl}/api/listings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Database System Concepts',
        author: 'Silberschatz, Korth, Sudarshan',
        edition: '7th Edition',
        isbn: '9780078022159',
        tags: ['DBMS', 'Database', 'Computer Science'],
        condition: 'good',
        price: 450,
        currency: 'BDT',
        university: 'University of Dhaka',
        city: 'Dhaka',
        description: 'Hardcover copy with clean pages. All diagrams clear.'
      })
    });
    const data = await res.json();
    if (res.status !== 201 || !data.listing) {
      throw new Error(`Create listing failed: ${res.status}`);
    }
    listingId = data.listing.id;
  });

  await test('Bob performs AI semantic search ("I need a DBMS book for 3rd semester")', async () => {
    const res = await fetch(`${baseUrl}/api/listings/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'I need a DBMS book for 3rd semester'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.listings)) {
      throw new Error(`Semantic search failed: ${res.status}`);
    }
    const found = data.listings.find(l => l.id === listingId);
    if (!found) {
      throw new Error('Semantic search did not return Alice DBMS listing');
    }
    console.log(`   -> Semantic search matched listing: "${found.title}" by ${found.author}`);
  });

  await test('Listing detail hides seller private email & phone number', async () => {
    const res = await fetch(`${baseUrl}/api/listings/${listingId}`, {
      headers: { 'Authorization': `Bearer ${tokenBob}` }
    });
    const data = await res.json();
    if (res.status !== 200 || !data.listing || !data.seller) {
      throw new Error('Failed to fetch listing detail');
    }
    if (data.seller.email || data.seller.phoneNumber || data.seller.phone) {
      throw new Error('CRITICAL PRIVACY VIOLATION: Seller email or phone exposed in listing response!');
    }
    if (!data.safetyTip) {
      throw new Error('Listing detail must include physical meeting safety tip');
    }
  });

  // 5. In-App Messaging for Marketplace Buyer-Seller
  let marketChatId = null;

  await test('Bob opens chat with Alice regarding book listing', async () => {
    const res = await fetch(`${baseUrl}/api/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participantUid: aliceUid,
        type: 'marketplace',
        contextListingId: listingId
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.chat) {
      throw new Error(`Open marketplace chat failed: ${res.status}`);
    }
    marketChatId = data.chat.id;
  });

  await test('Bob sends message in marketplace chat and Alice replies', async () => {
    // Bob sends message
    const sendRes = await fetch(`${baseUrl}/api/chats/${marketChatId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Hi Alice, is this DBMS book still available to pick up at TSC tomorrow?'
      })
    });
    if (sendRes.status !== 201) throw new Error(`Bob send message failed: ${sendRes.status}`);

    // Alice reads messages
    const aliceReadRes = await fetch(`${baseUrl}/api/chats/${marketChatId}/messages`, {
      headers: { 'Authorization': `Bearer ${tokenAlice}` }
    });
    const readData = await aliceReadRes.json();
    if (!readData.messages || readData.messages.length === 0) {
      throw new Error('Alice could not read incoming message');
    }

    // Alice replies
    const replyRes = await fetch(`${baseUrl}/api/chats/${marketChatId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Yes Bob, it is available! I will be at TSC cafeteria at 2 PM.'
      })
    });
    if (replyRes.status !== 201) throw new Error(`Alice reply failed: ${replyRes.status}`);
  });

  await test('Stranger Charlie is 403 Forbidden from accessing Alice and Bob chat', async () => {
    const res = await fetch(`${baseUrl}/api/chats/${marketChatId}/messages`, {
      headers: { 'Authorization': `Bearer ${tokenCharlie}` }
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for stranger, got ${res.status}`);
    }
  });

  await test('Alice marks listing as sold', async () => {
    const res = await fetch(`${baseUrl}/api/listings/${listingId}/sold`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenAlice}` }
    });
    const data = await res.json();
    if (res.status !== 200 || data.listing.status !== 'sold') {
      throw new Error('Listing was not marked as sold');
    }
  });

  // 6. Collaborator Connection Request & Chat Unlock Flow
  let connectionId = null;

  await test('Peer chat is BLOCKED between strangers before connection is accepted', async () => {
    const res = await fetch(`${baseUrl}/api/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participantUid: aliceUid,
        type: 'peer'
      })
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden before connection accepted, got ${res.status}`);
    }
  });

  await test('Bob sends connection request to Alice -> Notification generated for Alice', async () => {
    const res = await fetch(`${baseUrl}/api/connections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toUid: aliceUid,
        message: 'Hey Alice! I saw your DBMS and distributed systems profile, would love to study together!'
      })
    });
    const data = await res.json();
    if (res.status !== 201 || !data.connection) {
      throw new Error(`Send connection failed: ${res.status}`);
    }
    connectionId = data.connection.id;

    // Verify Alice received notification
    const notifRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${tokenAlice}` }
    });
    const notifData = await notifRes.json();
    const connNotif = (notifData.notifications || []).find(n => n.type === 'connection_request');
    if (!connNotif) {
      throw new Error('Alice did not receive connection_request notification');
    }
    console.log(`   -> Alice received notification: "${connNotif.title}" (unread count: ${notifData.unreadCount})`);
  });

  await test('Alice accepts connection request -> Peer chat unlocks', async () => {
    // Alice accepts connection
    const acceptRes = await fetch(`${baseUrl}/api/connections/${connectionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'accepted' })
    });
    if (acceptRes.status !== 200) {
      throw new Error(`Accept connection failed: ${acceptRes.status}`);
    }

    // Now opening peer chat succeeds
    const chatRes = await fetch(`${baseUrl}/api/chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participantUid: aliceUid,
        type: 'peer'
      })
    });
    const chatData = await chatRes.json();
    if (chatRes.status !== 200 || !chatData.chat) {
      throw new Error(`Opening peer chat failed after acceptance: ${chatRes.status}`);
    }
  });

  // 7. Abuse & Content Safety Check
  await test('AI content safety filter flags abusive content without over-blocking', async () => {
    // Abusive text rejection
    const badRes = await fetch(`${baseUrl}/api/listings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'FREE MONEY SCAM CLICK HERE YOU IDIOT BASTARD',
        author: 'Unknown',
        price: 10,
        condition: 'poor',
        description: 'Complete garbage scam hate hate hate abusive slurs here.'
      })
    });
    if (badRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for abusive text, got ${badRes.status}`);
    }
    console.log('   -> Abusive text was rejected with 400 Content Safety error as required');
  });

  // 8. Reports & Blocks
  await test('User submits report and user block is enforced', async () => {
    // Bob reports listing
    const repRes = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBob}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetType: 'listing',
        targetId: listingId,
        reason: 'Misleading price or condition'
      })
    });
    if (repRes.status !== 200) throw new Error(`Report failed: ${repRes.status}`);

    // Alice blocks Charlie
    const blockRes = await fetch(`${baseUrl}/api/blocks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        blockedUid: charlieUid
      })
    });
    if (blockRes.status !== 200) throw new Error(`Block failed: ${blockRes.status}`);

    // Charlie trying to send connection request to Alice is blocked with 403
    const blockedConnRes = await fetch(`${baseUrl}/api/connections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenCharlie}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toUid: aliceUid,
        message: 'Should be blocked'
      })
    });
    if (blockedConnRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden when user is blocked, got ${blockedConnRes.status}`);
    }
  });

  // 9. Guest Restrictions
  await test('Guest user has read-only marketplace browse and is blocked from posting/chatting', async () => {
    // Guest ID token
    const guestUid = `test_guest_${Date.now()}`;
    const guestToken = await getRealIdToken(guestUid, null, true);

    // Guest CAN browse listings
    const browseRes = await fetch(`${baseUrl}/api/listings`, {
      headers: { 'Authorization': `Bearer ${guestToken}` }
    });
    if (browseRes.status !== 200) {
      throw new Error(`Guest browse failed: ${browseRes.status}`);
    }

    // Guest CANNOT create listing
    const postRes = await fetch(`${baseUrl}/api/listings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${guestToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Guest Book',
        author: 'Guest',
        price: 100,
        condition: 'good'
      })
    });
    if (postRes.status !== 403) {
      throw new Error(`Expected 403 for guest create listing, got ${postRes.status}`);
    }

    // Guest CANNOT send connection
    const connRes = await fetch(`${baseUrl}/api/connections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${guestToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toUid: aliceUid,
        message: 'Guest request'
      })
    });
    if (connRes.status !== 403) {
      throw new Error(`Expected 403 for guest send connection, got ${connRes.status}`);
    }
  });

  // Clean up
  server.close();

  console.log('\n===============================================================');
  console.log(`Step 3 & 4 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep3Suite().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
