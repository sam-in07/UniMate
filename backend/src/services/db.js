import { firestore, isFirebaseConfigured } from '../config/firebase.js';
import crypto from 'crypto';

// In-memory fallback ONLY for study tools when Firebase is not configured
const studyMemoryStore = {
  materials: new Map(),
  summaries: new Map(),
  quizzes: new Map(),
  attempts: new Map(),
  studyPlans: new Map(),
  pastQuestions: new Map()
};

function generateId() {
  return crypto.randomUUID();
}

function handleFirestoreIndexError(err, operationName) {
  if (err.message && (err.message.includes('indexes?create_composite=') || err.code === 9)) {
    console.error(`\n================================================================`);
    console.error(`[Firestore Composite Index Required for ${operationName}]:`);
    console.error(err.message);
    console.error(`================================================================\n`);
  }
}

/**
 * Central Database Service
 * Uses Cloud Firestore via Firebase Admin SDK.
 * All Student Network, user profile, chat, and marketplace collections require real Firestore.
 */
export const db = {
  // -------------------------------------------------------------
  // USERS & PROFILES
  // -------------------------------------------------------------
  async getUser(uid) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for user profiles.');
    }
    const snap = await firestore.collection('users').doc(uid).get();
    return snap.exists ? { uid: snap.id, ...snap.data() } : null;
  },

  async setUser(uid, data) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for user profiles.');
    }
    const ref = firestore.collection('users').doc(uid);
    const existing = await ref.get();
    const existingData = existing.exists ? existing.data() : {};
    const record = { ...existingData, ...data, updatedAt: new Date().toISOString() };
    await ref.set(record, { merge: true });
    return { uid, ...record };
  },

  async getDiscoverableProfiles(currentUid, { university, lookingFor, skill } = {}) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for collaborator discovery.');
    }

    try {
      let query = firestore.collection('users').limit(40);
      const snap = await query.get();
      let list = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => (!currentUid || u.uid !== currentUid) && !u.isProfileHidden);

      const cleanParam = (val) => {
        if (val === undefined || val === null) return null;
        const s = String(val).trim();
        return (s === '' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') ? null : s;
      };

      const cUni = cleanParam(university)?.toLowerCase();
      const cLookingFor = cleanParam(lookingFor);
      const cSkill = cleanParam(skill)?.toLowerCase();

      if (cUni) {
        list = list.filter(u => u.university && u.university.toLowerCase().includes(cUni));
      }

      if (cLookingFor) {
        list = list.filter(u => u.lookingFor && u.lookingFor.includes(cLookingFor));
      }

      if (cSkill) {
        list = list.filter(u => 
          u.skills?.some(s => s && s.toLowerCase().includes(cSkill)) ||
          u.interests?.some(i => i && i.toLowerCase().includes(cSkill))
        );
      }

      return list;
    } catch (err) {
      handleFirestoreIndexError(err, 'getDiscoverableProfiles');
      throw err;
    }
  },

  // -------------------------------------------------------------
  // USED-BOOK MARKETPLACE
  // -------------------------------------------------------------
  async createListing(sellerUid, data) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for marketplace listings.');
    }
    const id = generateId();
    const doc = {
      id,
      sellerUid,
      ...data,
      isDemo: Boolean(data.isDemo),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('listings').doc(id).set(doc);
    return doc;
  },

  async getListings({ search, tags, condition, university, minPrice, maxPrice, status = 'active' } = {}) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for marketplace listings.');
    }

    try {
      const snap = await firestore.collection('listings')
        .where('status', '==', status)
        .limit(100)
        .get();

      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const cleanParam = (val) => {
        if (val === undefined || val === null) return null;
        const s = String(val).trim();
        return (s === '' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') ? null : s;
      };

      const cSearch = cleanParam(search)?.toLowerCase();
      const cCondition = cleanParam(condition);
      const cUni = cleanParam(university)?.toLowerCase();
      const cMin = cleanParam(minPrice);
      const cMax = cleanParam(maxPrice);

      // Client-side filtering
      if (cSearch) {
        list = list.filter(item =>
          item.title?.toLowerCase().includes(cSearch) ||
          item.author?.toLowerCase().includes(cSearch) ||
          item.description?.toLowerCase().includes(cSearch) ||
          item.tags?.some(t => t.toLowerCase().includes(cSearch))
        );
      }

      if (tags && tags.length > 0) {
        const rawTags = Array.isArray(tags) ? tags : [tags];
        const tagList = rawTags
          .map(cleanParam)
          .filter(Boolean)
          .map(t => t.toLowerCase());

        if (tagList.length > 0) {
          list = list.filter(item =>
            item.tags?.some(t => tagList.some(reqTag => reqTag === t.toLowerCase()))
          );
        }
      }

      if (cCondition) {
        list = list.filter(item => item.condition?.toLowerCase() === cCondition.toLowerCase());
      }

      if (cUni) {
        list = list.filter(item => item.university?.toLowerCase().includes(cUni));
      }

      if (cMin !== null && !isNaN(Number(cMin))) {
        list = list.filter(item => item.price >= Number(cMin));
      }

      if (cMax !== null && !isNaN(Number(cMax))) {
        list = list.filter(item => item.price <= Number(cMax));
      }

      // Sort by createdAt desc
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    } catch (err) {
      handleFirestoreIndexError(err, 'getListings');
      throw err;
    }
  },

  async getListingById(id) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for marketplace listings.');
    }
    const snap = await firestore.collection('listings').doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async updateListing(id, sellerUid, data) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for marketplace listings.');
    }
    const ref = firestore.collection('listings').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    if (snap.data().sellerUid !== sellerUid) {
      throw new Error('Unauthorized: You can only update your own book listings.');
    }
    const updated = { ...data, updatedAt: new Date().toISOString() };
    await ref.update(updated);
    return { id, ...snap.data(), ...updated };
  },

  async markListingSold(id, sellerUid) {
    return this.updateListing(id, sellerUid, { status: 'sold' });
  },

  async deleteListing(id, sellerUid) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for marketplace listings.');
    }
    const ref = firestore.collection('listings').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return false;
    if (snap.data().sellerUid !== sellerUid) {
      throw new Error('Unauthorized: You can only delete your own book listings.');
    }
    await ref.delete();
    return true;
  },

  // -------------------------------------------------------------
  // COLLABORATOR CONNECTIONS
  // -------------------------------------------------------------
  async createConnection(fromUid, toUid, message = '') {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for collaborator connections.');
    }

    if (fromUid === toUid) {
      throw new Error('You cannot connect with yourself.');
    }

    const isBlocked = await this.isBlockedBetween(fromUid, toUid);
    if (isBlocked) {
      const err = new Error('You cannot connect with this student.');
      err.status = 403;
      throw err;
    }

    // Check existing connection in either direction
    const snap1 = await firestore.collection('connections')
      .where('fromUid', '==', fromUid)
      .where('toUid', '==', toUid)
      .limit(1)
      .get();

    const snap2 = await firestore.collection('connections')
      .where('fromUid', '==', toUid)
      .where('toUid', '==', fromUid)
      .limit(1)
      .get();

    if (!snap1.empty || !snap2.empty) {
      const existing = !snap1.empty ? snap1.docs[0].data() : snap2.docs[0].data();
      if (existing.status === 'accepted') {
        throw new Error('You are already connected with this student.');
      }
      if (existing.status === 'pending') {
        throw new Error('A connection request is already pending between you two.');
      }
      if (existing.status === 'blocked') {
        throw new Error('Cannot connect with this student.');
      }
    }

    const id = generateId();
    const doc = {
      id,
      fromUid,
      toUid,
      status: 'pending',
      message: message || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('connections').doc(id).set(doc);

    // Create notification for recipient
    await this.createNotification(toUid, {
      type: 'connection_request',
      title: 'New Connection Request',
      body: message ? `"${message.slice(0, 80)}"` : 'A fellow student wants to connect with you.',
      link: '/partners?tab=requests'
    });

    return doc;
  },

  async updateConnectionStatus(id, currentUid, newStatus) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for collaborator connections.');
    }
    const ref = firestore.collection('connections').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data();

    // Only recipient can accept/decline
    if (data.toUid !== currentUid && data.fromUid !== currentUid) {
      throw new Error('Unauthorized to modify this connection.');
    }

    const updated = { status: newStatus, updatedAt: new Date().toISOString() };
    await ref.update(updated);

    if (newStatus === 'accepted') {
      // Notify the requester that their request was accepted
      await this.createNotification(data.fromUid, {
        type: 'connection_accepted',
        title: 'Connection Accepted!',
        body: 'Your study connection was accepted. You can now chat in-app!',
        link: '/chat'
      });
    }

    return { id, ...data, ...updated };
  },

  async getUserConnections(uid) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for collaborator connections.');
    }

    try {
      const [sentSnap, receivedSnap] = await Promise.all([
        firestore.collection('connections').where('fromUid', '==', uid).get(),
        firestore.collection('connections').where('toUid', '==', uid).get()
      ]);

      const map = new Map();
      sentSnap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data(), direction: 'sent' }));
      receivedSnap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data(), direction: 'received' }));

      const list = Array.from(map.values());
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    } catch (err) {
      handleFirestoreIndexError(err, 'getUserConnections');
      throw err;
    }
  },

  async areUsersConnected(uid1, uid2) {
    if (!isFirebaseConfigured || !firestore) return false;
    const snap1 = await firestore.collection('connections')
      .where('fromUid', '==', uid1)
      .where('toUid', '==', uid2)
      .where('status', '==', 'accepted')
      .limit(1)
      .get();
    if (!snap1.empty) return true;

    const snap2 = await firestore.collection('connections')
      .where('fromUid', '==', uid2)
      .where('toUid', '==', uid1)
      .where('status', '==', 'accepted')
      .limit(1)
      .get();
    return !snap2.empty;
  },

  // -------------------------------------------------------------
  // CHATS & MESSAGES
  // -------------------------------------------------------------
  async getOrCreateChat({ user1, user2, type = 'collaborator', listingId = null }) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for in-app chat.');
    }

    // Permission check: Chat allowed ONLY between accepted connections OR buyer-seller for a listing!
    if (type === 'marketplace' && listingId) {
      const listing = await this.getListingById(listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }
      const isSeller = listing.sellerUid === user1 || listing.sellerUid === user2;
      if (!isSeller) {
        throw new Error('Marketplace chat must be between the listing seller and an interested buyer.');
      }
    } else {
      const isConnected = await this.areUsersConnected(user1, user2);
      if (!isConnected) {
        throw new Error('Chat is locked until your connection request is accepted.');
      }
    }

    const participants = [user1, user2].sort();
    const chatId = listingId ? `market_${listingId}_${participants.join('_')}` : `chat_${participants.join('_')}`;

    const chatRef = firestore.collection('chats').doc(chatId);
    const snap = await chatRef.get();

    if (snap.exists) {
      return { id: snap.id, ...snap.data() };
    }

    const newChat = {
      id: chatId,
      participants,
      type,
      listingId: listingId || null,
      lastMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await chatRef.set(newChat);
    return newChat;
  },

  async sendMessage(chatId, senderUid, text) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for in-app chat.');
    }

    const chatRef = firestore.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      throw new Error('Chat conversation does not exist.');
    }

    const chatData = chatSnap.data();
    if (!chatData.participants.includes(senderUid)) {
      throw new Error('Unauthorized: You are not a participant in this conversation.');
    }

    const messageId = generateId();
    const messageDoc = {
      id: messageId,
      chatId,
      senderUid,
      text,
      createdAt: new Date().toISOString()
    };

    await chatRef.collection('messages').doc(messageId).set(messageDoc);
    await chatRef.update({
      lastMessage: {
        text: text.slice(0, 100),
        senderUid,
        createdAt: messageDoc.createdAt
      },
      updatedAt: messageDoc.createdAt
    });

    // Notify the other participant
    const otherUid = chatData.participants.find(u => u !== senderUid);
    if (otherUid) {
      await this.createNotification(otherUid, {
        type: 'new_message',
        title: 'New Message',
        body: text.length > 50 ? `${text.slice(0, 50)}...` : text,
        link: `/chat?chatId=${chatId}`
      });
    }

    return messageDoc;
  },

  async getChatMessages(chatId, currentUid) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for in-app chat.');
    }

    const chatRef = firestore.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) throw new Error('Chat not found');
    if (!chatSnap.data().participants.includes(currentUid)) {
      throw new Error('Unauthorized');
    }

    const snap = await chatRef.collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getUserChats(uid) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured. Cloud Firestore is required for in-app chat.');
    }

    try {
      const snap = await firestore.collection('chats')
        .where('participants', 'array-contains', uid)
        .limit(50)
        .get();

      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      return list;
    } catch (err) {
      handleFirestoreIndexError(err, 'getUserChats');
      throw err;
    }
  },

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  async createNotification(toUid, { type, title, body, link }) {
    if (!isFirebaseConfigured || !firestore) return null;
    const id = generateId();
    const doc = {
      id,
      toUid,
      type,
      title,
      body,
      link: link || '/notifications',
      read: false,
      createdAt: new Date().toISOString()
    };
    await firestore.collection('notifications').doc(id).set(doc);
    return doc;
  },

  async getUserNotifications(uid) {
    if (!isFirebaseConfigured || !firestore) return [];
    try {
      const snap = await firestore.collection('notifications')
        .where('toUid', '==', uid)
        .limit(50)
        .get();

      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    } catch (err) {
      handleFirestoreIndexError(err, 'getUserNotifications');
      return [];
    }
  },

  async markNotificationRead(id, uid) {
    if (!isFirebaseConfigured || !firestore) return false;
    const ref = firestore.collection('notifications').doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data().toUid !== uid) return false;
    await ref.update({ read: true });
    return true;
  },

  // -------------------------------------------------------------
  // REPORTS & BLOCKS
  // -------------------------------------------------------------
  async reportItem(reporterUid, { targetType, targetId, reason }) {
    if (!isFirebaseConfigured || !firestore) {
      return { id: generateId(), reporterUid, targetType, targetId, reason, status: 'dev_reported' };
    }
    const id = generateId();
    const doc = {
      id,
      reporterUid,
      targetType,
      targetId,
      reason,
      createdAt: new Date().toISOString()
    };
    await firestore.collection('reports').doc(id).set(doc);
    return doc;
  },

  async blockUser(blockerUid, blockedUid) {
    if (!isFirebaseConfigured || !firestore) {
      throw new Error('Firebase credentials not configured.');
    }
    const id = `block_${blockerUid}_${blockedUid}`;
    const doc = {
      id,
      blockerUid,
      blockedUid,
      createdAt: new Date().toISOString()
    };
    await firestore.collection('blocks').doc(id).set(doc);
    return doc;
  },

  async getBlockedUserIds(blockerUid) {
    if (!isFirebaseConfigured || !firestore) return [];
    const snap = await firestore.collection('blocks')
      .where('blockerUid', '==', blockerUid)
      .get();
    return snap.docs.map(d => d.data().blockedUid);
  },

  async isBlockedBetween(uid1, uid2) {
    if (!isFirebaseConfigured || !firestore) return false;
    try {
      const b1 = await firestore.collection('blocks').doc(`block_${uid1}_${uid2}`).get();
      if (b1.exists) return true;
      const b2 = await firestore.collection('blocks').doc(`block_${uid2}_${uid1}`).get();
      return b2.exists;
    } catch {
      return false;
    }
  },

  // -------------------------------------------------------------
  // STUDY TOOLS (Has memoryStore fallback when Firebase is not configured)
  // -------------------------------------------------------------
  async createMaterial(ownerUid, { title, course, extractedText, type = 'text' }) {
    const id = generateId();
    const doc = {
      id,
      ownerUid,
      title: title || 'Untitled Study Material',
      course: course || 'General',
      extractedText: extractedText.slice(0, 40000),
      type,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('materials').doc(id).set(doc);
      return doc;
    }
    studyMemoryStore.materials.set(id, doc);
    return doc;
  },

  async getMaterials(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('materials')
        .where('ownerUid', '==', ownerUid)
        .get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    }
    return Array.from(studyMemoryStore.materials.values())
      .filter(m => m.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async deleteMaterial(id, ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const docRef = firestore.collection('materials').doc(id);
      const snap = await docRef.get();
      if (!snap.exists || snap.data().ownerUid !== ownerUid) return false;
      await docRef.delete();
      return true;
    }
    const item = studyMemoryStore.materials.get(id);
    if (!item || item.ownerUid !== ownerUid) return false;
    studyMemoryStore.materials.delete(id);
    return true;
  },

  async saveSummary(ownerUid, summaryData) {
    const id = generateId();
    const doc = {
      id,
      ownerUid,
      ...summaryData,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('summaries').doc(id).set(doc);
      return doc;
    }
    studyMemoryStore.summaries.set(id, doc);
    return doc;
  },

  async getSummaries(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('summaries')
        .where('ownerUid', '==', ownerUid)
        .get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    }
    return Array.from(studyMemoryStore.summaries.values())
      .filter(s => s.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async saveQuiz(ownerUid, quizData) {
    const id = generateId();
    const doc = {
      id,
      ownerUid,
      ...quizData,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('quizzes').doc(id).set(doc);
      return doc;
    }
    studyMemoryStore.quizzes.set(id, doc);
    return doc;
  },

  async getQuizzes(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('quizzes')
        .where('ownerUid', '==', ownerUid)
        .get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    }
    return Array.from(studyMemoryStore.quizzes.values())
      .filter(q => q.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async saveAttempt(ownerUid, attemptData) {
    const id = generateId();
    const doc = {
      id,
      ownerUid,
      ...attemptData,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('attempts').doc(id).set(doc);
      return doc;
    }
    studyMemoryStore.attempts.set(id, doc);
    return doc;
  },

  async getAttempts(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('attempts')
        .where('ownerUid', '==', ownerUid)
        .get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    }
    return Array.from(studyMemoryStore.attempts.values())
      .filter(a => a.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async saveStudyPlan(ownerUid, planData) {
    const id = generateId();
    const doc = {
      id,
      ownerUid,
      ...planData,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('studyPlans').doc(id).set(doc);
      return doc;
    }
    studyMemoryStore.studyPlans.set(id, doc);
    return doc;
  },

  async getStudyPlans(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('studyPlans')
        .where('ownerUid', '==', ownerUid)
        .get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list;
    }
    return Array.from(studyMemoryStore.studyPlans.values())
      .filter(p => p.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createPastQuestion(uploaderUid, data) {
    const id = generateId();
    const doc = {
      id,
      uploaderUid,
      ...data,
      course: typeof data.course === 'string' ? data.course.trim() : (data.course || ''),
      university: typeof data.university === 'string' ? data.university.trim() : (data.university || ''),
      term: typeof data.term === 'string' ? data.term.trim() : (data.term || ''),
      isStudentContributed: true,
      reportCount: 0,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('pastQuestions').doc(id).set(doc);
      return doc;
    }
    studyMemoryStore.pastQuestions.set(id, doc);
    return doc;
  },

  async getPastQuestions({ course, university, year, search } = {}) {
    let list = [];
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('pastQuestions')
        .limit(100)
        .get();
      list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      list = Array.from(studyMemoryStore.pastQuestions.values());
    }

    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Normalize and clean incoming filter parameters
    const cleanParam = (val) => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      if (!s || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return null;
      return s;
    };

    const cCourse = cleanParam(course)?.toLowerCase();
    const cUni = cleanParam(university)?.toLowerCase();
    const cSearch = cleanParam(search)?.toLowerCase();
    const cYearStr = cleanParam(year);
    const cYear = cYearStr ? parseInt(cYearStr, 10) : null;

    return list.filter(item => {
      if (!item) return false;

      const itemCourse = typeof item.course === 'string' ? item.course.trim().toLowerCase() : '';
      const itemUni = typeof item.university === 'string' ? item.university.trim().toLowerCase() : '';
      const itemText = typeof item.questionsText === 'string' ? item.questionsText.trim().toLowerCase() : '';
      const itemTopics = Array.isArray(item.topics) ? item.topics.map(t => String(t || '').trim().toLowerCase()) : [];

      if (cCourse && !itemCourse.includes(cCourse)) return false;
      if (cUni && !itemUni.includes(cUni)) return false;
      if (cYear !== null && !isNaN(cYear) && item.year !== cYear) return false;

      if (cSearch) {
        const textMatch = itemText.includes(cSearch);
        const courseMatch = itemCourse.includes(cSearch);
        const uniMatch = itemUni.includes(cSearch);
        const tagMatch = itemTopics.some(t => t.includes(cSearch));
        if (!textMatch && !courseMatch && !uniMatch && !tagMatch) return false;
      }
      return true;
    });
  },

  async migratePastQuestionsWhitespace() {
    if (!isFirebaseConfigured || !firestore) return 0;
    try {
      const snap = await firestore.collection('pastQuestions').get();
      let updatedCount = 0;
      const batch = firestore.batch();

      snap.docs.forEach(doc => {
        const data = doc.data();
        let changed = false;
        const updates = {};

        const fieldsToTrim = ['course', 'university', 'term', 'questionsText', 'fileName'];
        fieldsToTrim.forEach(f => {
          if (typeof data[f] === 'string') {
            const trimmed = data[f].trim();
            if (trimmed !== data[f]) {
              updates[f] = trimmed;
              changed = true;
            }
          }
        });

        if (changed) {
          batch.update(doc.ref, updates);
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`[Migration] Trimmed whitespace on ${updatedCount} pastQuestions document(s) in Firestore.`);
      }
      return updatedCount;
    } catch (err) {
      console.warn('[Migration Warning] Could not migrate pastQuestions whitespace:', err.message);
      return 0;
    }
  }
};
