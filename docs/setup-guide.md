# ⚙️ Abhyas AI — Setup Guide

This guide walks you through installing and running the full Abhyas AI stack (Frontend + Backend) from scratch on a Windows machine.

---

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Required Version | Download |
|---|---|---|
| **Node.js** | v18+ | https://nodejs.org |
| **npm / pnpm** | Latest | Included with Node.js |
| **Python** | 3.10+ | https://python.org |
| **pip** | Latest | Included with Python |
| **Git** | Any | https://git-scm.com |

---

## 🔑 Required API Keys & Accounts

You will need to set up accounts and obtain API keys from the following services:

| Service | Purpose | URL |
|---|---|---|
| **Google Gemini API** | AI content generation (flashcards, quizzes, roadmaps) | https://aistudio.google.com |
| **Firebase** | Authentication + Firestore database | https://console.firebase.google.com |
| **LiveAvatar / HeyGen** | AI avatar tutor streaming | https://www.heygen.com |
| **Gmail SMTP** (Optional) | Parent email alerts | Your Gmail account |

---

## 🗂️ Project Structure

```
AbhyassAI/
├── AI-Flashcard/AI-Flashcard/    ← Frontend (Next.js)
├── backend/                       ← Backend (FastAPI)
└── docs/                          ← Documentation
```

---

## 🚀 Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd AbhyassAI
```

---

## 🔧 Step 2 — Set Up the Backend (Python / FastAPI)

### 2.1 Navigate to the backend folder

```bash
cd backend
```

### 2.2 Create and activate a Python virtual environment

```bash
# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate
```

### 2.3 Install Python dependencies

```bash
pip install -r requirements.txt
```

The `requirements.txt` includes:
- `fastapi` — Web framework
- `uvicorn` — ASGI server
- `firebase-admin` — Firestore integration
- `pypdf2` — PDF text extraction
- `python-multipart` — File upload support
- `google-generativeai` — Gemini AI SDK
- `pydantic-settings` — `.env` config management

### 2.4 Create the `.env` file

Create a file named `.env` inside the `backend/` folder:

```env
# backend/.env

GEMINI_API_KEY=your_google_gemini_api_key_here
LIVEAVATAR_API_KEY=your_liveavatar_api_key_here

# Optional: for parent alert emails
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=your_gmail_app_password
```

> [!IMPORTANT]
> Never commit the `.env` file to version control. It is listed in `.gitignore`.

### 2.5 Add Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Project Settings → Service Accounts**
3. Click **Generate new private key** and download the JSON file
4. Rename it to `serviceAccountKey.json`
5. Place it inside the `backend/` folder

```
backend/
├── main.py
├── .env
├── requirements.txt
└── serviceAccountKey.json   ← Place here
```

> [!CAUTION]
> Keep `serviceAccountKey.json` secret. Never commit it to Git.

### 2.6 Start the backend server

```bash
# From the backend/ directory, with venv active
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will start at: **`http://127.0.0.1:8000`**

You can verify it's running by opening: `http://127.0.0.1:8000/docs` (Swagger UI)

---

## 🎨 Step 3 — Set Up the Frontend (Next.js)

### 3.1 Navigate to the frontend folder

```bash
cd AI-Flashcard/AI-Flashcard
```

### 3.2 Install Node.js dependencies

```bash
npm install
# or if using pnpm:
pnpm install
```

### 3.3 Configure Firebase (Frontend)

Open the file:
```
src/app/firebase/config.js
```

Replace the Firebase config object with your own project's credentials from the [Firebase Console](https://console.firebase.google.com):

```javascript
// src/app/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 3.4 (Optional) Set Frontend Environment Variables

Create a `.env.local` file in `AI-Flashcard/AI-Flashcard/`:

```env
# AI-Flashcard/AI-Flashcard/.env.local
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3.5 Start the frontend development server

```bash
npm run dev
```

The frontend will start at: **`http://localhost:3000`**

---

## 🔥 Step 4 — Enable Firebase Services

In the Firebase Console, enable the following:

1. **Authentication** → Enable providers:
   - Email/Password
   - Google
   - Phone

2. **Firestore Database** → Create database in production mode

3. **Firestore Security Rules** (basic setup for development):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🚦 Step 5 — Verify Everything Works

| Check | Expected Result |
|---|---|
| Backend running | `http://127.0.0.1:8000/docs` shows Swagger UI |
| Frontend running | `http://localhost:3000` shows the landing page |
| Firebase Auth | Can sign up / sign in |
| Flashcard generation | Upload text → AI generates flashcards |
| Quiz | Select collection → Start Quiz works |
| AI Tutor | Upload PDF → Connect Tutor → Voice chat |

---

## 🏃 Quick Start (All-in-One)

A helper batch file `start_all.bat` exists in the root to launch both servers:

```bash
# From the AbhyassAI/ root
start_all.bat
```

> [!NOTE]
> Edit `start_all.bat` to point to the correct Python venv and Node paths if needed.

---

## 🐛 Common Issues & Fixes

| Issue | Likely Cause | Fix |
|---|---|---|
| `GEMINI_API_KEY not found` | Missing `.env` file | Create `backend/.env` with the key |
| `serviceAccountKey.json not found` | File missing | Download from Firebase Console and place in `backend/` |
| CORS errors in browser | Backend not running | Start `python main.py` in the `backend/` folder |
| `Failed to fetch` on frontend | Backend on wrong port | Ensure backend runs on port `8000` |
| OCR doesn't work | Browser restriction | Use Chrome/Edge; Firefox may limit Tesseract |
| Phone OTP not working | Firebase Phone Auth not enabled | Enable in Firebase Console → Authentication |

---

## 📌 Ports Reference

| Service | Port | URL |
|---|---|---|
| **Frontend** | 3000 | `http://localhost:3000` |
| **Backend** | 8000 | `http://127.0.0.1:8000` |
| **Backend Swagger** | 8000 | `http://127.0.0.1:8000/docs` |
