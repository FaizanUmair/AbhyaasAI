# ABHYAS AI — Project Documentation

> **Abhyas AI** is an AI-powered education platform that transforms any document, image, or text into interactive flashcards, quizzes, mind maps, and a live AI tutor experience. It supports both students and parents with real-time performance tracking, gamification, and smart alerts.

---

## 📂 Documentation Index

| Document | Description |
|---|---|
| [Frontend Modules](./frontend/frontend-modules.md) | All frontend pages and components |
| [Backend Modules](./backend/backend-modules.md) | All backend API routes and services |
| [Setup Guide](./setup-guide.md) | Step-by-step installation and running instructions |

---

## 🏗️ High-Level Architecture

```
AbhyassAI/
├── AI-Flashcard/AI-Flashcard/   ← Next.js 14 Frontend
│   └── src/app/
│       ├── page.tsx             ← Landing Page
│       ├── auth/                ← Auth Module
│       ├── dashboard/           ← Student & Parent Dashboard
│       ├── flashcard/           ← Flashcard Generator
│       ├── quiz/                ← AI Quiz Engine
│       ├── collections/         ← Collections Browser
│       ├── my-learning/         ← Roadmap & Notes Module
│       ├── ai-tutor/            ← Live Avatar AI Tutor
│       ├── visualizer/          ← Mermaid Diagram Viewer
│       ├── api/                 ← Next.js Edge API Routes
│       ├── components/          ← Shared UI Components
│       └── firebase/            ← Firebase Auth & Firestore
│
└── backend/                     ← Python FastAPI Backend
    ├── main.py                  ← All API endpoints (~1300 lines)
    ├── requirements.txt         ← Python dependencies
    └── learning_notes.db        ← SQLite database (auto-created)
```

---

## 🔑 Key Technologies

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend** | Python 3.x, FastAPI, Uvicorn |
| **AI** | Google Gemini API (2.0 Flash / 2.5 Flash) |
| **Auth** | Firebase Authentication (Email, Google, Phone/OTP) |
| **Database** | Firebase Firestore (cloud), SQLite (local) |
| **Avatar/Tutor** | LiveAvatar Web SDK, HeyGen API |
| **OCR** | Tesseract.js (browser-side) |
| **Diagrams** | Mermaid.js |

---

## 📄 Document Navigation

- For **frontend pages and components** → [`docs/frontend/frontend-modules.md`](./frontend/frontend-modules.md)
- For **backend API routes and logic** → [`docs/backend/backend-modules.md`](./backend/backend-modules.md)
- For **setting up the project** → [`docs/setup-guide.md`](./setup-guide.md)
