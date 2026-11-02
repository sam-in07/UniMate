# UniMate – Student Learning & Collaboration Platform

> **Tagline:** Master your syllabus. Connect with peer students.  
> **Event:** Ostad Presents YUNet AIgnite Buildathon 2026  
> **Category:** B2C Solo Web Application (University & College Students)  
> **Pillars:** **Study Pillar** & **Student Network**

---

## 📖 Product Overview

**UniMate** is an interactive, production-grade educational platform built for university and college students in Bangladesh and worldwide. It combines high-yield academic study tools with a trusted, campus-focused student network for buying/selling used textbooks and finding study collaborators.

### Pillar 1: Study Pillar
1. **AI Study Summarizer**: Extracts core concepts, definitions, executive summaries, and high-yield revision notes from lecture notes, slides, and PDFs. Supports English, Bengali (বাংলা), and Banglish.
2. **Interactive Active-Recall Quiz Generator**: Generates MCQ quizzes with instant explanations, syllabus topic tagging, and confetti celebration upon completion.
3. **AI Academic Tutor (Explain)**: Interactive conversational tutor with "Explain Simpler", "Give Real Example", Islamic studies verification mode, and voice read-aloud via Web Speech API.
4. **Deterministic Exam Revision Planner**: Day-by-day revision schedule intelligently weighted by exam proximity and priority, paired with AI high-yield study advice.
5. **Student Past Questions Bank**: Community-shared semester papers searchable by university, course, and term.
6. **Study Analytics & Exam Readiness Dashboard**: Tracks topic breadth coverage, quiz score trends over time, and an estimated readiness indicator with transparent formulas.
7. **Pillar Cross-Integration**: Completing a quiz with weak topics immediately surfaces shortcuts: *"Find books for this topic"* (opens marketplace search) and *"Find a study partner strong in this"* (opens collaborator finder prefiltered).

### Pillar 2: Student Network
1. **Used-Book Marketplace**:
   - Create used textbook listings with title, author, edition, subject tags, condition, price in BDT, and optional university/city.
   - **AI Assist**: Proposes standard academic title, author, edition, subject tags, and suggested secondhand price range from book title or ISBN.
   - **AI Semantic Natural Language Search**: Converts queries like *"I need a DBMS book for 3rd semester"* into relevant listings ranked by topic and relevance.
   - **Listing Detail & In-App Chat**: Message the seller directly inside the app. No email or phone numbers are exposed.
   - Safety notices to meet in public campus locations and verify physical condition before payment.
   - Mark as sold and reporting.
2. **Collaborator Finder**:
   - Rich student profile with university, program, level, semester, skills, research interests, collaboration type (*Study Partner*, *Project Mate*, *Conference Team*, *Paper Co-Author*), and availability.
   - **AI Match Ranking**: Compares candidate profiles and generates human *"Why this match"* explanations based on complementary strengths and shared study topics.
   - **Connection Flow**: Send request $\rightarrow$ Accept/Decline $\rightarrow$ In-app chat unlocks strictly upon acceptance.
   - **Student Safety & Minor Protection**: Student phone numbers and emails are never displayed publicly. All communication takes place via authenticated in-app messaging.
   - **Discovery Privacy**: Toggle to hide profile from Collaborator Finder discovery at any time.
3. **Shared Safety & Moderation Systems**:
   - Notification bell with live unread badge for messages and connection requests.
   - Community reporting on listings, messages, and profiles.
   - User blocking: blocking immediately restricts connection requests and incoming messages.
   - **AI Abuse & Content Safety Filter**: Pre-screen listings and text to flag spam, scams, and abusive language without over-blocking academic content.

---

## 🛠️ Stack Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v7, Framer Motion, Recharts, Lucide Icons |
| **Backend** | Node.js (ESM), Express, Helmet, CORS, Express-Rate-Limit, Zod, Multer, pdf-parse |
| **Authentication** | Firebase Authentication (Google Sign-In + Anonymous Guest) verified via Firebase Admin SDK |
| **Database** | Cloud Firestore via Firebase Admin SDK (with `firestore.rules`) |
| **Primary AI Provider** | Ollama Cloud (`gemma4:31b` via `POST https://ollama.com/api/chat`) |
| **Fallback AI Providers** | Groq (`qwen/qwen3.8-27b`) and Google Gemini (`gemini-3.5-flash`), with automated cooldown failover |
| **Voice & Speech** | Browser Web Speech API for voice input and speech synthesis |

---

## ⚙️ Environment Variables (Names Only)

UniMate reads configuration exclusively from `backend/.env` and `frontend/.env`.

### Backend (`backend/.env`)
- `PORT`: HTTP port for backend server (e.g., `8080`).
- `FRONTEND_ORIGIN`: Allowed CORS origin (e.g., `http://localhost:5173`).
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Path to Firebase service account JSON key file (e.g., `backend/firebase-service-account.json`).
- `FIREBASE_PROJECT_ID`: Firebase project ID (fallback).
- `FIREBASE_CLIENT_EMAIL`: Firebase client email (fallback).
- `FIREBASE_PRIVATE_KEY`: Firebase private key (fallback).
- `AI_PRIMARY`: Primary AI provider (`ollama`).
- `AI_FALLBACKS`: Comma-separated fallback provider list (`groq,gemini`).
- `OLLAMA_BASE_URL`: Ollama endpoint base URL (`https://ollama.com` without `/v1` or trailing slash).
- `OLLAMA_API_KEY`: Ollama Cloud API key.
- `OLLAMA_MODEL`: Model identifier (`gemma4:31b`).
- `GROQ_API_KEY`: Groq API key.
- `GROQ_BASE_URL`: Groq base URL (`https://api.groq.com/openai/v1`).
- `GROQ_MODEL`: Groq model identifier (`qwen/qwen3.8-27b`).
- `GEMINI_API_KEY`: Google Gemini API key.
- `GEMINI_MODEL`: Gemini model identifier (`gemini-3.5-flash`).

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: Base URL for the backend API (e.g., `http://localhost:8080/api`).
- `VITE_FIREBASE_API_KEY`: Firebase Web API key.
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase auth domain.
- `VITE_FIREBASE_PROJECT_ID`: Firebase project ID.
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID.
- `VITE_FIREBASE_APP_ID`: Firebase Web application ID.

> **Note on Environment Reloading**: The backend loads `.env` only during startup. Whenever `.env` variables are updated, restart the backend server manually.

---

## 🔥 Firebase & Firestore Setup

### 1. Service Account Configuration
Place your downloaded Firebase service account JSON file at `backend/firebase-service-account.json` (or configure `FIREBASE_SERVICE_ACCOUNT_PATH` in `backend/.env`). This file is listed in `.gitignore` and must never be committed.

### 2. Firestore Security Rules
1. Navigate to the **Firebase Console** -> **Firestore Database** -> **Rules** tab.
2. Replace all rules with the contents of [`firestore.rules`](file:///d:/webProjects/Antigravity_project'/UniMate/firestore.rules).
3. Click **Publish**.

The security rules enforce:
- Authenticated read/write access.
- User profile isolation (only the owner can modify their profile).
- Strict message privacy (only conversation participants can read/send messages).
- Connection locking (peer messaging is disallowed unless a connection request is accepted).
- Guest restriction (guests can browse listings read-only, but cannot post listings, send connection requests, or send messages).

### 3. Authorized Domains
In Firebase Console -> **Authentication** -> **Settings** -> **Authorized domains**, ensure `localhost` is listed.

---

## 🌱 Demo Seed Data

UniMate includes a reproducible seed script that populates Cloud Firestore with **12 fictional university students** and **15 fictional used-book listings**.

Every seed record carries:
- `isDemo: true` flag in Firestore.
- A visible **Demo** badge in the UI.
- Fictional student names, avatars, and universities (e.g., University of Dhaka, BUET, BRACU, NSU, IUT).

To run the seed script:
```bash
npm run seed --prefix backend
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
The backend starts on `http://localhost:8080`.

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Run Automated Acceptance Test Suite
To verify both pillars, AI failover, Firestore security, in-app chat, and guest restrictions:
```bash
cd backend
node test/step3_suite.js
```

---

## ⚠️ Known Limitations & Safety Guidelines

1. **In-App Messaging Only**: UniMate intentionally does not display personal phone numbers or email addresses anywhere on user profiles or marketplace listings. All communication occurs through authenticated in-app messaging.
2. **No Financial Transactions**: UniMate does not process payments or escrow funds. Students arrange cash-on-delivery or exchange upon in-person inspection in safe, public campus locations (e.g., student cafeterias, libraries).
3. **AI Fallback Resilience**: If the primary Ollama Cloud provider experiences a 429 rate limit or quota cooldown, the system automatically cools down that provider for 3 minutes and fails over to Groq without interrupting the student's workflow.
4. **Guest Mode**: Guest users exploring without signing in can browse the marketplace and study tools in read-only mode. To post listings, send peer connection requests, or chat, signing in with Google is required.
