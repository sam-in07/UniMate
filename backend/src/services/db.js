import { firestore, isFirebaseConfigured } from '../config/firebase.js';
import crypto from 'crypto';

// In-memory local database for development / offline / test mode
const memoryStore = {
  users: new Map(),
  materials: new Map(),
  summaries: new Map(),
  quizzes: new Map(),
  attempts: new Map(),
  studyPlans: new Map(),
  checkins: new Map(),
  pastQuestions: new Map(),
  reports: new Map(),
  blocks: new Map()
};

function generateId() {
  return crypto.randomUUID();
}

/**
 * DB abstraction supporting both Cloud Firestore and local store
 */
export const db = {
  // Users
  async getUser(uid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('users').doc(uid).get();
      return snap.exists ? { uid: snap.id, ...snap.data() } : null;
    }
    return memoryStore.users.get(uid) || null;
  },

  async setUser(uid, data) {
    const record = { ...data, updatedAt: new Date().toISOString() };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('users').doc(uid).set(record, { merge: true });
      return { uid, ...record };
    }
    const existing = memoryStore.users.get(uid) || { createdAt: new Date().toISOString() };
    const merged = { ...existing, ...record, uid };
    memoryStore.users.set(uid, merged);
    return merged;
  },

  // Materials
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
    memoryStore.materials.set(id, doc);
    return doc;
  },

  async getMaterials(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('materials')
        .where('ownerUid', '==', ownerUid)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return Array.from(memoryStore.materials.values())
      .filter(m => m.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getMaterialById(id, ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('materials').doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data();
      if (data.ownerUid !== ownerUid) return null;
      return { id: snap.id, ...data };
    }
    const item = memoryStore.materials.get(id);
    if (!item || item.ownerUid !== ownerUid) return null;
    return item;
  },

  async deleteMaterial(id, ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const docRef = firestore.collection('materials').doc(id);
      const snap = await docRef.get();
      if (!snap.exists || snap.data().ownerUid !== ownerUid) return false;
      await docRef.delete();
      return true;
    }
    const item = memoryStore.materials.get(id);
    if (!item || item.ownerUid !== ownerUid) return false;
    memoryStore.materials.delete(id);
    return true;
  },

  // Summaries
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
    memoryStore.summaries.set(id, doc);
    return doc;
  },

  async getSummaries(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('summaries')
        .where('ownerUid', '==', ownerUid)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return Array.from(memoryStore.summaries.values())
      .filter(s => s.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async deleteSummary(id, ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const docRef = firestore.collection('summaries').doc(id);
      const snap = await docRef.get();
      if (!snap.exists || snap.data().ownerUid !== ownerUid) return false;
      await docRef.delete();
      return true;
    }
    const item = memoryStore.summaries.get(id);
    if (!item || item.ownerUid !== ownerUid) return false;
    memoryStore.summaries.delete(id);
    return true;
  },

  // Quizzes
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
    memoryStore.quizzes.set(id, doc);
    return doc;
  },

  async getQuizzes(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('quizzes')
        .where('ownerUid', '==', ownerUid)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return Array.from(memoryStore.quizzes.values())
      .filter(q => q.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getQuizById(id, ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('quizzes').doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data();
      if (data.ownerUid !== ownerUid) return null;
      return { id: snap.id, ...data };
    }
    const item = memoryStore.quizzes.get(id);
    if (!item || item.ownerUid !== ownerUid) return null;
    return item;
  },

  async deleteQuiz(id, ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const docRef = firestore.collection('quizzes').doc(id);
      const snap = await docRef.get();
      if (!snap.exists || snap.data().ownerUid !== ownerUid) return false;
      await docRef.delete();
      return true;
    }
    const item = memoryStore.quizzes.get(id);
    if (!item || item.ownerUid !== ownerUid) return false;
    memoryStore.quizzes.delete(id);
    return true;
  },

  // Attempts
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
    memoryStore.attempts.set(id, doc);
    return doc;
  },

  async getAttempts(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('attempts')
        .where('ownerUid', '==', ownerUid)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return Array.from(memoryStore.attempts.values())
      .filter(a => a.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Study Plans
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
    memoryStore.studyPlans.set(id, doc);
    return doc;
  },

  async getStudyPlans(ownerUid) {
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('studyPlans')
        .where('ownerUid', '==', ownerUid)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return Array.from(memoryStore.studyPlans.values())
      .filter(p => p.ownerUid === ownerUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Past Questions (Community uploaded)
  async createPastQuestion(uploaderUid, data) {
    const id = generateId();
    const doc = {
      id,
      uploaderUid,
      ...data,
      isStudentContributed: true,
      reportCount: 0,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('pastQuestions').doc(id).set(doc);
      return doc;
    }
    memoryStore.pastQuestions.set(id, doc);
    return doc;
  },

  async getPastQuestions({ course, university, year, search }) {
    let list = [];
    if (isFirebaseConfigured && firestore) {
      const snap = await firestore.collection('pastQuestions')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      list = Array.from(memoryStore.pastQuestions.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list.filter(item => {
      if (course && !item.course.toLowerCase().includes(course.toLowerCase())) return false;
      if (university && !item.university.toLowerCase().includes(university.toLowerCase())) return false;
      if (year && item.year !== parseInt(year, 10)) return false;
      if (search) {
        const query = search.toLowerCase();
        const textMatch = item.questionsText?.toLowerCase().includes(query);
        const courseMatch = item.course?.toLowerCase().includes(query);
        const uniMatch = item.university?.toLowerCase().includes(query);
        const tagMatch = item.topics?.some(t => t.toLowerCase().includes(query));
        if (!textMatch && !courseMatch && !uniMatch && !tagMatch) return false;
      }
      return true;
    });
  },

  async reportItem(reporterUid, { targetType, targetId, reason }) {
    const id = generateId();
    const doc = {
      id,
      reporterUid,
      targetType,
      targetId,
      reason,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured && firestore) {
      await firestore.collection('reports').doc(id).set(doc);
      return doc;
    }
    memoryStore.reports.set(id, doc);
    return doc;
  }
};
