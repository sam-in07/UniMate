# UniMate

> **Tagline:** Study smarter. Connect with students. Stay well.  
> **Event:** Ostad Presents YUNet AIgnite Buildathon 2026  
> **Category:** B2C Solo Web Application (University & College Students in Bangladesh & Worldwide)

---

## 📖 Product Overview

**UniMate** is an interactive, production-grade AI educational web application designed specifically for university and college students. It bridges the gap between passive lecture content and active learning mastery.

### Phase 1: Foundation & Study Pillar
1. **AI Study Summarizer**: Extracts core concepts, definitions, executive summaries, and high-yield exam revision notes from PDF lecture slides, TXT files, or pasted notes in English, Bengali (বাংলা), or Banglish.
2. **Interactive Active-Recall Quiz Generator**: Generates strict JSON-validated MCQs with instant explanations, progress tracking, and celebratory confetti upon completion.
3. **AI Academic Tutor (Explain)**: Context-aware interactive tutor with "Explain Simpler", "Give Real Example", Islamic studies verification mode, and voice read-aloud via Web Speech API.
4. **Deterministic Exam Revision Planner**: Intelligently allocates daily study hours based on exam proximity and priority, supplemented with AI high-yield study advice.
5. **Student Past Questions Bank**: Community-shared semester papers with automatic AI topic tagging, search filters, and moderation reporting.
6. **Study Analytics & Exam Readiness Dashboard**: Tracks 3 distinct labelled metrics:
   - **Topic Coverage (%)**
   - **Quiz Score Trend (%)**
   - **Estimated Readiness Indicator (%)** (with transparent formula: 50% quiz avg + 30% topic breadth + 20% consistency)
7. **Differentiation Integration**: Automatically detects weak topics from quizzes and recommends targeted intervention paths.

---

## 🛠️ Stack Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v7, Framer Motion, Recharts, Lucide Icons |
| **Backend** | Node.js (ESM), Express, Helmet, CORS, Express-Rate-Limit, Zod, Multer, pdf-parse |
| **Auth** | Firebase Authentication (Google Sign-In + Anonymous Guest) verified via Firebase Admin SDK |
| **Database** | Cloud Firestore via Admin SDK (with `firestore.rules` and zero-crash dev emulation) |
| **Primary AI** | Ollama Cloud (`gemma4:31b` or env configurable) |
| **Fallback AI** | Google Gemini API (`gemini-1.5-flash` or env configurable) |
| **Voice & Speech** | Browser Web Speech API for STT voice recognition & TTS read-aloud |

---
<!-- 
## ⚙️ Environment Variables Setup

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173

# Firebase Admin SDK (Either single-line JSON or credentials)
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# AI Configuration
AI_PRIMARY=ollama # or gemini
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_API_KEY=your_ollama_cloud_key
OLLAMA_MODEL=gemma4:31b

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

ELEVENLABS_API_KEY=
ENABLE_ELEVENLABS=false
```

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

*(Note: When Firebase credentials are not yet supplied, UniMate operates in local developer fallback mode so you can test all features immediately without crashes).*

--- -->

## 🚀 Running Locally

### 1. Start the Backend Server
```bash
cd backend
npm install
node src/server.js
```
The server will start on `http://localhost:8080`.

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Run Backend Integration & Acceptance Tests
```bash
node --env-file=backend/.env.example backend/test/phase1_suite.js
```

---

## 🔒 Security & Privacy Non-Negotiables
- **No Secrets in Frontend**: Only public Firebase client parameters are in `VITE_` variables.
- **Backend ID Token Verification**: User ID is verified via Bearer tokens on the backend; never accepted from body or query.
- **Strict CORS & Helmet**: Only the approved frontend origin is permitted.
- **Private Data Isolation**: All Firestore operations enforce ownership matching `req.user.uid`.
- **Guest Limitations**: Anonymous guests are rate-limited and restricted from public actions.
- **Crisis Helpline Safety Net**: National Emergency (999) and Kaan Pete Roi (09612-119911) configured in `backend/src/config/helplines.js`.

---

## 📋 Ostad AIgnite Buildathon Phase Roadmap
- [x] **Phase 1: Foundation + Study Pillar** (Complete & Tested)
- [ ] **Phase 2: Student Network** (Used-Book Marketplace + Collaborator Finder + In-app Chat)
- [ ] **Phase 3: Wellbeing & Access** (Mood Check-in, Supportive Journal, Accessibility Panel)
- [ ] **Phase 4: Polish, Seed Data, Deploy**

