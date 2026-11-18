# 🔄 Abhyas AI — Migration Action Plan

> **Purpose:** This document is a **read-only analysis and action plan** for two planned migrations.
> **No code has been changed.** All changes are described here for review and approval before implementation begins.

---

## 📋 Migrations Covered

| # | Migration | Complexity | Risk |
|---|---|---|---|
| **M1** | Remove User Authentication (Firebase Auth + User Management) | 🟠 High | Medium |
| **M2** | Switch AI Provider from Google Gemini to OpenAI | 🟡 Medium | Low |

---

## ⚠️ Pre-Migration Notes

> [!IMPORTANT]
> Since authentication is removed, every API endpoint that currently uses `uid` as a user identifier must be updated to use a **static/anonymous session identifier** (e.g., a fixed string `"default_user"`, or a randomly generated session ID stored in `localStorage`). The AI Tutor module already does this with `uid: 'default_user'` as a preview of this pattern.

> [!CAUTION]
> Firestore will no longer be needed once Firebase Auth is removed (all Firestore reads/writes are tied to `uid`). Flashcards, collections, and quiz data stored in Firestore will become inaccessible. These features must be migrated to **SQLite** or another local database, or dropped.

---

---

# M1 — Remove User Authentication & User Management

## 🗺️ Impact Map

### Files to be **DELETED entirely**

| File | Reason |
|---|---|
| `src/app/auth/page.tsx` | Entire authentication page — no longer needed |
| `src/app/firebase/config.js` | Firebase app init, Auth, Firestore — all removed |
| `src/app/firebase/saveUser.ts` | Saves user to backend on login — no longer needed |
| `src/app/components/ProtectedRoute.tsx` | Auth guard HOC — no longer needed |

---

### Files to be **MODIFIED in Frontend**

#### 1. `src/app/page.tsx` — Landing Page

| Line | Current Code | Required Change |
|---|---|---|
| L73 | `onClick={() => router.push("/auth")}` | Change to `router.push("/dashboard")` — skip auth page entirely |

**Impact:** The "Get Started Now" button will route directly to the dashboard.

---

#### 2. `src/app/components/LayoutWrapper.tsx`

**Current dependencies:**
- `useAuthState` from `react-firebase-hooks/auth`
- `auth` from `firebase/config.js`
- Checks `user?.uid` to decide sidebar visibility and fetch role

**Required changes:**

| What | How |
|---|---|
| Remove imports | Delete `useAuthState`, `auth` imports |
| Remove `const [user, loading] = useAuthState(auth)` | Delete this line |
| Replace `user?.uid` checks | Replace with `true` (always authenticated) |
| Remove role-based sidebar logic | Show sidebar on all non-landing pages unconditionally |
| Replace `fetch(…/api/user/${user.uid}/stats…)` | Either remove (since no gamification) or use `"default_user"` as the UID |
| `const isAuthOrLanding` | Remove `/auth` from the check; keep only `/` as the landing route |

---

#### 3. `src/app/components/Sidebar.tsx`

**Current dependencies:**
- `useAuthState`, `auth` from Firebase
- `signOut` from `firebase/auth`
- Fetches role for conditional menu filtering (student vs parent)

**Required changes:**

| What | How |
|---|---|
| Remove imports | Delete `auth`, `signOut`, `useAuthState` imports |
| Delete `const [user] = useAuthState(auth)` | Remove entirely |
| Delete `handleLogout` function | Remove entire function + logout button |
| Remove role-based menu filtering | Show all menu items unconditionally; remove `parent` role logic |
| Remove `useEffect` that fetches `/api/user/:uid/stats` | Delete this effect |
| Remove logout `<button>` from JSX | Delete the logout button in the bottom section |
| Remove `FaSignOutAlt` import | No longer needed |

---

#### 4. `src/app/collections/page.tsx` — Collections

**Current dependencies:**
- `useAuthState`, `auth`, `db` from Firebase
- `collection`, `getDocs`, `query`, `orderBy` from `firebase/firestore`
- `user.uid` passed to all backend API calls

**Required changes:**

| What | How |
|---|---|
| Remove all Firebase/auth imports | Delete imports for `useAuthState`, `auth`, `db`, Firestore functions |
| Remove `const [user, loading] = useAuthState(auth)` | Delete |
| Remove auth redirect: `if (!loading && !user) router.push("/")` | Delete |
| Replace `user.uid` in fetch calls | Use constant `"default_user"` |
| Remove `if (!user) return` guards | Remove all auth guards |
| Remove `if (loading) return <div>Loading...</div>` | Remove loading gate |
| Replace `user?.uid` in `onReviewCard` body | Use `"default_user"` |

---

#### 5. `src/app/dashboard/page.tsx` — Student Dashboard

**Current dependencies:**
- `useAuthState`, `auth` from Firebase
- `user.uid` in all 5+ backend fetch calls
- Role check: renders `<ParentDashboard />` for `role === "parent"`

**Required changes:**

| What | How |
|---|---|
| Remove Firebase auth imports | Delete `useAuthState`, `auth` |
| Remove `const [user, loading] = useAuthState(auth)` | Delete |
| Remove auth redirect | Delete `if (!loading && !user) router.push("/")` |
| Replace all `user.uid` with `"default_user"` | Update all 5 API fetch calls |
| Remove `user?.displayName` from welcome header | Hardcode `"Scholar"` or use a configurable name |
| Remove `<ParentDashboard user={user} userStats={userStats} />` branch | Remove Parent Dashboard feature entirely (no longer needed without user roles) |
| Remove referral code display | Referral codes are user-specific — remove this section |
| Remove loading skeleton | Delete loading state tied to Firebase auth |

---

#### 6. `src/app/dashboard/ParentDashboard.tsx`

**Decision:** This entire file/component can be **DELETED** since:
- Parent role is tied to Firebase Auth user accounts
- Parent-student linking uses `user.uid`
- Without auth, there are no multiple user contexts

> [!WARNING]
> Deleting ParentDashboard also means removing these backend features: student linking, red-zone detection, and parent email alerts. These are all user-identity-dependent.

---

#### 7. `src/app/flashcard/page.tsx` — Flashcard Generator

**Current dependencies:**
- `useAuthState`, `auth` from Firebase
- `user.uid` in collection CRUD and flashcard save calls
- Auth redirect on mount

**Required changes:**

| What | How |
|---|---|
| Remove Firebase auth imports | Delete `useAuthState`, `auth`, `db` imports |
| Remove `const [user] = useAuthState(auth)` | Delete |
| Remove auth redirect in `useEffect` | Delete |
| Replace `user.uid` with `"default_user"` | In all 6 API calls: collections, save, fetch |
| Remove `if (!user) return` toast guard | Remove auth check in `handleSaveFlashcards` |

---

#### 8. `src/app/quiz/page.tsx` — Quiz Engine

**Current dependencies:**
- `useAuthState`, `auth` from Firebase
- `user.uid` in flashcard fetch and XP update calls

**Required changes:**

| What | How |
|---|---|
| Remove Firebase auth imports | Delete `useAuthState`, `auth` |
| Remove `const [user] = useAuthState(auth)` | Delete |
| Replace `user.uid` with `"default_user"` | In cards fetch and activity update |
| Remove XP submission (optional) | XP/gamification tied to user; can be removed or mocked |

---

#### 9. `src/app/my-learning/page.tsx` — My Learning

**Current dependencies:**
- `useAuthState`, `auth` from Firebase
- `user.uid` in every learning API call (~12 calls)

**Required changes:**

| What | How |
|---|---|
| Remove Firebase auth imports | Delete `useAuthState`, `auth` |
| Remove `const [user, loading] = useAuthState(auth)` | Delete |
| Remove auth redirect | Delete `if (!loading && !user) router.push("/")` |
| Replace all `user.uid` with `"default_user"` | Update all 12 fetch calls |
| Remove loading gate | Delete `if (loading) return <div>Loading My Learning...</div>` |
| Remove `user?.uid` null checks | Update `if (!user)` guards to remove |

---

#### 10. `src/app/ai-tutor/page.tsx` — AI Tutor

**Status:** ✅ Already partially migrated!
- Uses hardcoded `uid: 'default_user'` for `/api/tutor/context` and `/api/tutor/chat`
- **No auth imports** — this module requires no changes.

---

### Backend Files to be **MODIFIED**

**File:** `backend/main.py`

#### B1. Remove Firebase Admin SDK

| Lines | Current Code | Action |
|---|---|---|
| L4–5 | `import firebase_admin` / `from firebase_admin import credentials, firestore` | **DELETE** |
| L113–123 | Firebase initialization block | **DELETE** entire block |
| L120 | `db = firestore.client()` | Replace `db` global with `None` permanently |

**Side effect:** Every endpoint that checks `if db is None: raise HTTPException(500...)` will permanently fail. See section B3.

---

#### B2. Remove User Management Endpoints

The following endpoints are **DELETED entirely**:

| Endpoint | Lines | Reason |
|---|---|---|
| `POST /api/users` | L219–251 | Saves user profile to Firestore — no users |
| `GET /api/check-username` | L253–263 | Username uniqueness check — no users |
| `GET /api/get-email-by-username` | L265–279 | Username login lookup — no users |
| `POST /api/link-student` | L562–592 | Parent-student linking — no users |
| `GET /api/parent/{pid}/students` | L594–622 | Parent portal — no users |
| `GET /api/parent/{pid}/student/{sid}/red-zones` | L723–753 | Red zones — depends on Firestore |
| `GET /api/user/{uid}/stats` | L457–473 | Gamification stats — no users |
| `POST /api/user/{uid}/activity` | L475–500 | XP/streak update — no users |

---

#### B3. Remove All Firestore Data Storage

All Firestore interactions must be replaced. The affected endpoints and their new storage strategy:

| Endpoint | Current Storage | New Storage |
|---|---|---|
| `POST /api/flashcards` | Firestore subcollection | **SQLite** `flashcard_sets` table |
| `GET /api/collections` | Firestore subcollection | **SQLite** `collections` table |
| `POST /api/collections` | Firestore subcollection | **SQLite** `collections` table |
| `GET /api/collections/{id}/flashcards` | Firestore subcollection | **SQLite** `flashcard_sets` table |
| `POST /api/flashcards/review` (SM-2) | Firestore update | **SQLite** update |
| `POST /api/quiz/result` | Firestore `quiz_attempts` | **SQLite** `quiz_attempts` table |
| `GET /api/student/{uid}/highlights` | Firestore + SQLite | **SQLite only** |
| `GET /api/student/{uid}/test-results` | Firestore + SQLite | **SQLite only** |
| `GET /api/student/{uid}/achievements` | Firestore + SQLite | **SQLite only** |
| `POST /api/collections/default` | Firestore | **SQLite** (or remove) |

> [!IMPORTANT]
> This requires creating **new SQLite tables** for collections, flashcard_sets, and quiz_attempts.

---

#### B4. Replace `uid` Parameters with Static Session ID

All remaining endpoints that accept `uid` as a parameter should use a default session identifier. Options:

**Option A (Simplest):** Hardcode `"default_user"` in all SQLite queries — same as AI Tutor module.

**Option B (Session-based):** Accept an optional `session_id` header or parameter that defaults to `"default_user"` if not provided.

**Recommendation:** Use **Option A** for the simplest migration.

---

#### B5. Remove Email Notification System

The following are deleted (parent alerts require user accounts):
- `send_email()` helper function (L644–663)
- `notify_parents_if_weak()` async function (L665–721)
- Email imports: `smtplib`, `email.mime.text`, `email.mime.multipart`
- Settings fields: `email_user`, `email_pass`
- `EMAIL_USER` / `EMAIL_PASS` from `.env`

---

#### B6. Remove Python Package Dependencies

**From `requirements.txt`:**

| Package | Reason for Removal |
|---|---|
| `firebase-admin` | No longer needed (Firestore removed) |

**From `.env`:**
| Variable | Action |
|---|---|
| `EMAIL_USER` | Remove |
| `EMAIL_PASS` | Remove |

The `serviceAccountKey.json` file can also be deleted.

---

#### B7. New SQLite Tables Required

Add these table definitions inside `init_sqlite_db()`:

```sql
-- Collections table (replaces Firestore subcollection)
CREATE TABLE IF NOT EXISTS collections (
    id      TEXT PRIMARY KEY,         -- UUID
    uid     TEXT DEFAULT 'default_user',
    name    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Flashcard sets table (replaces Firestore subcollection)
CREATE TABLE IF NOT EXISTS flashcard_sets (
    id            TEXT PRIMARY KEY,   -- UUID
    collection_id TEXT,
    name          TEXT,
    flashcards    TEXT,               -- JSON blob: [{id, question, answer, ef, interval, next_review_date}]
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(collection_id) REFERENCES collections(id)
);

-- Quiz attempts table (replaces Firestore quiz_attempts)
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    uid       TEXT DEFAULT 'default_user',
    topic     TEXT,
    score     INTEGER,
    total     INTEGER,
    accuracy  REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Frontend Package Changes

**In `AI-Flashcard/AI-Flashcard/package.json`** — packages to **REMOVE**:

| Package | Reason |
|---|---|
| `firebase` | Firebase SDK — Auth and Firestore |
| `react-firebase-hooks` | `useAuthState` and other Firebase React hooks |

Run after removing from `package.json`:
```bash
npm uninstall firebase react-firebase-hooks
```

---

## M1 — Summary of All Changes

| Category | Action | Count |
|---|---|---|
| Frontend files deleted | auth page, firebase config, saveUser, ProtectedRoute | 4 files |
| Frontend files modified | LayoutWrapper, Sidebar, Collections, Dashboard, ParentDashboard, Flashcard, Quiz, My Learning | 8 files |
| Backend endpoints deleted | /api/users, /api/check-username, /api/get-email-by-username, /api/link-student, /api/parent/*, /api/user/:uid/stats, /api/user/:uid/activity | 8 endpoints |
| Backend Firestore calls replaced | Collections, Flashcards, Quiz Results, Highlights, Achievements, Test Results | 10 areas |
| New SQLite tables | collections, flashcard_sets, quiz_attempts | 3 tables |
| npm packages removed | firebase, react-firebase-hooks | 2 packages |
| pip packages removed | firebase-admin | 1 package |
| Files deleted (backend) | serviceAccountKey.json | 1 file |
| `.env` variables removed | EMAIL_USER, EMAIL_PASS | 2 variables |

---

---

# M2 — Switch AI Provider: Gemini → OpenAI

## 🗺️ Impact Map

The Gemini API is used **exclusively in the backend** (`backend/main.py`). The frontend does not call Gemini directly.

---

### OpenAI Equivalent Model Mapping

| Gemini Model Used | OpenAI Equivalent | Notes |
|---|---|---|
| `gemini-2.0-flash` | `gpt-4o-mini` | Fast, cheap, great quality |
| `gemini-2.5-flash` | `gpt-4o` | High capability |
| `gemini-1.5-flash` | `gpt-4o-mini` | Use as fallback |
| `gemini-flash-latest` | `gpt-4o-mini` | Use as fallback |
| `gemini-1.5-pro` | `gpt-4o` | High capability |
| `gemini-pro` | `gpt-3.5-turbo` | Legacy fallback |

**Recommended default model:** `gpt-4o-mini` (best price-to-performance for this workload)

---

### Backend Changes (`backend/main.py`)

#### B1. Replace Python Import

| Current | Replacement |
|---|---|
| `import google.generativeai as genai` (L16) | `from openai import OpenAI` |

---

#### B2. Replace Settings / Configuration

| Current (L73–80) | Replacement |
|---|---|
| `gemini_api_key: SecretStr` in `Settings` class | `openai_api_key: SecretStr` |
| `genai.configure(api_key=…)` (L104–106) | `client = OpenAI(api_key=settings.openai_api_key.get_secret_value())` |

---

#### B3. Replace `.env` Variable

| Remove | Add |
|---|---|
| `GEMINI_API_KEY=...` | `OPENAI_API_KEY=...` |

---

#### B4. Replace AI Call Pattern (All 10 Endpoints)

**Current Gemini pattern (repeated in every endpoint):**
```python
model_names = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest']
for m_name in model_names:
    try:
        model = genai.GenerativeModel(m_name)
        response = model.generate_content(prompt)
        if response and response.text:
            return { "result": response.text.strip() }
    except:
        continue
```

**New OpenAI pattern (replacement):**
```python
def call_openai(prompt: str, model: str = "gpt-4o-mini") -> str | None:
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None
```

---

#### B5. All Endpoints That Need the Call Pattern Replaced

| Endpoint | Line Range | Current Pattern |
|---|---|---|
| `POST /api/flashcards/generate` | L362–389 | `genai.GenerativeModel` loop |
| `POST /api/quiz/generate` | L431–455 | `genai.GenerativeModel` loop |
| `POST /api/generate-diagram` | L502–523 | `genai.GenerativeModel` loop |
| `POST /api/generate-infograph` | L528–560 | `genai.GenerativeModel` loop |
| `GET /api/parent/.../red-zones` (AI suggestion) | L745–751 | Single `genai.GenerativeModel` call |
| `POST /api/learning/roadmap` | L803–828 | `genai.GenerativeModel` loop |
| `POST /api/tutor/chat` | L908–947 | `genai.GenerativeModel` loop |
| `POST /api/learning/roadmap/quiz` | L960–980 | `genai.GenerativeModel` loop |
| `POST /api/learning/quick-notes` | L984–993 | Single `genai.GenerativeModel` call |
| `POST /api/learning/daily-mission` | L1056–1074 | `genai.GenerativeModel` loop |
| `POST /api/flashcards/summarize` | L1244–1303 | `genai.GenerativeModel` loop |

**Total:** 11 locations to update

---

#### B6. Response Object Difference

| Property | Gemini | OpenAI |
|---|---|---|
| Get text content | `response.text` | `response.choices[0].message.content` |
| Check if valid | `if response and response.text:` | `if response and response.choices:` |

This change must be applied at all 11 call sites.

---

#### B7. API Key Validation Check Updates

Replace all occurrences of:
```python
if not settings.gemini_api_key:
    raise HTTPException(status_code=500, detail="Gemini API Key not configured")
```

With:
```python
if not settings.openai_api_key:
    raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
```

**Count:** 9 occurrences across the file.

---

### Frontend Changes for M2

**File:** `AI-Flashcard/AI-Flashcard/src/app/flashcard/page.tsx`

| Line | Current | Action |
|---|---|---|
| L30 | `const MODEL_NAME = "qwen/qwen3-next-80b-a3b-instruct:free"` | Delete — this variable is unused (backend handles generation) |
| L31 | `const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY` | Delete — no direct frontend AI calls |

**File:** `AI-Flashcard/AI-Flashcard/package.json`

| Package | Action |
|---|---|
| `@google/genai` | **REMOVE** — not used directly (backend-only) |
| `@google/generative-ai` | **REMOVE** — not used directly (backend-only) |
| `openai` (already in package.json!) | **KEEP** — already installed, version `^6.32.0` |

> [!NOTE]
> `openai` is already listed as a dependency in `package.json` (line 24). No new npm install needed.

**File:** `.env.local` (or `AI-Flashcard/AI-Flashcard/.env.local`)

| Remove | Add |
|---|---|
| `NEXT_PUBLIC_GEMINI_API_KEY=...` | Not needed (OpenAI key only lives in backend `.env`) |

---

### Backend Package Changes

**In `backend/requirements.txt`:**

| Remove | Add |
|---|---|
| `google-generativeai` | `openai` |

Run:
```bash
pip uninstall google-generativeai
pip install openai
```

---

## M2 — Summary of All Changes

| Category | Action | Count |
|---|---|---|
| Backend import | Replace `google.generativeai` with `openai` | 1 line |
| Backend config | Rename `gemini_api_key` → `openai_api_key`, update client init | 2 lines |
| Backend AI call sites | Replace Gemini call pattern with `call_openai()` | 11 locations |
| Backend validation checks | Replace Gemini key check message | 9 occurrences |
| `.env` backend | Rename `GEMINI_API_KEY` → `OPENAI_API_KEY` | 1 variable |
| `requirements.txt` | Remove `google-generativeai`, add `openai` | 2 changes |
| Frontend `package.json` | Remove `@google/genai`, `@google/generative-ai` | 2 packages |
| Frontend dead code | Remove unused `MODEL_NAME`, `API_KEY` constants | 2 lines |

---

---

# 📋 Ordered Migration Action Items

Execute in this exact order to avoid breaking dependencies:

## Phase 1 — Backend: Remove Firebase & Switch AI (M1+M2 Backend)

| # | Action Item | File | M1/M2 |
|---|---|---|---|
| 1 | Add `openai` to `requirements.txt`; remove `google-generativeai`, `firebase-admin` | `backend/requirements.txt` | Both |
| 2 | Run `pip install openai` and `pip uninstall google-generativeai firebase-admin` | Terminal | Both |
| 3 | Add `OPENAI_API_KEY` to `backend/.env`; remove `GEMINI_API_KEY`, `EMAIL_USER`, `EMAIL_PASS` | `backend/.env` | Both |
| 4 | Replace `import google.generativeai as genai` with `from openai import OpenAI` | `backend/main.py` L16 | M2 |
| 5 | Rename `gemini_api_key` → `openai_api_key` in `Settings` class | `backend/main.py` L75 | M2 |
| 6 | Replace `genai.configure(...)` with `client = OpenAI(...)` | `backend/main.py` L104–106 | M2 |
| 7 | Create helper function `call_openai(prompt, model)` | `backend/main.py` (new function) | M2 |
| 8 | Replace Gemini call pattern at all 11 endpoints | `backend/main.py` (11 locations) | M2 |
| 9 | Delete Firebase Admin import block | `backend/main.py` L4–5 | M1 |
| 10 | Delete Firebase initialization block | `backend/main.py` L113–123 | M1 |
| 11 | Delete email helper functions (`send_email`, `notify_parents_if_weak`) | `backend/main.py` L644–721 | M1 |
| 12 | Delete User Management endpoints (8 endpoints) | `backend/main.py` | M1 |
| 13 | Add 3 new SQLite tables to `init_sqlite_db()` | `backend/main.py` L26–60 | M1 |
| 14 | Replace Firestore calls with SQLite in all 10 affected endpoints | `backend/main.py` | M1 |
| 15 | Replace all `uid` parameters with `"default_user"` constant | `backend/main.py` (all endpoints) | M1 |
| 16 | Delete `serviceAccountKey.json` | `backend/` | M1 |

---

## Phase 2 — Frontend: Remove Auth & Clean Up (M1+M2 Frontend)

| # | Action Item | File | M1/M2 |
|---|---|---|---|
| 17 | Remove `firebase` and `react-firebase-hooks` from `package.json` | `package.json` | M1 |
| 18 | Remove `@google/genai` and `@google/generative-ai` from `package.json` | `package.json` | M2 |
| 19 | Run `npm uninstall firebase react-firebase-hooks @google/genai @google/generative-ai` | Terminal | Both |
| 20 | Delete `src/app/auth/page.tsx` | Frontend | M1 |
| 21 | Delete `src/app/firebase/config.js` | Frontend | M1 |
| 22 | Delete `src/app/firebase/saveUser.ts` | Frontend | M1 |
| 23 | Delete `src/app/components/ProtectedRoute.tsx` | Frontend | M1 |
| 24 | Modify `src/app/page.tsx` — redirect to `/dashboard` instead of `/auth` | Frontend | M1 |
| 25 | Modify `src/app/components/LayoutWrapper.tsx` — remove all auth logic | Frontend | M1 |
| 26 | Modify `src/app/components/Sidebar.tsx` — remove auth, logout, role filtering | Frontend | M1 |
| 27 | Modify `src/app/collections/page.tsx` — remove auth, use `"default_user"` | Frontend | M1 |
| 28 | Modify `src/app/dashboard/page.tsx` — remove auth, remove ParentDashboard branch | Frontend | M1 |
| 29 | Delete or archive `src/app/dashboard/ParentDashboard.tsx` | Frontend | M1 |
| 30 | Modify `src/app/flashcard/page.tsx` — remove auth, use `"default_user"` | Frontend | M1+M2 |
| 31 | Modify `src/app/quiz/page.tsx` — remove auth, use `"default_user"` | Frontend | M1 |
| 32 | Modify `src/app/my-learning/page.tsx` — remove auth, use `"default_user"` | Frontend | M1 |
| 33 | Remove unused `MODEL_NAME`, `API_KEY` constants from flashcard page | `flashcard/page.tsx` L30–31 | M2 |

---

## Phase 3 — Verification

| # | Verification Step |
|---|---|
| V1 | Backend starts without errors: `python main.py` |
| V2 | Swagger UI loads at `http://127.0.0.1:8000/docs` with no Firebase/Gemini errors |
| V3 | Frontend builds without errors: `npm run build` |
| V4 | Landing page opens and "Get Started" goes directly to Dashboard |
| V5 | Flashcards can be generated from text input (OpenAI response works) |
| V6 | Collections can be created and listed (SQLite backed) |
| V7 | Flashcards can be saved to a collection |
| V8 | Quiz can be generated and completed |
| V9 | My Learning page loads roadmap generation |
| V10 | AI Tutor connects and responds |
| V11 | No Firebase/auth-related errors in browser console |
| V12 | No Gemini references remain in `main.py` |

---

## 📦 Dependency Summary After Migration

### Backend `requirements.txt` (After)
```
fastapi
uvicorn
pypdf2
python-multipart
openai
pydantic-settings
```

### Frontend `package.json` dependencies (After — key changes)
```json
{
  "dependencies": {
    "@heygen/liveavatar-web-sdk": "...",
    "@heygen/streaming-avatar": "...",
    "mermaid": "...",
    "next": "14.1.3",
    "next-themes": "...",
    "openai": "^6.32.0",
    "react": "^18",
    "react-dom": "^18",
    "react-hot-toast": "...",
    "react-icons": "...",
    "react-markdown": "...",
    "tesseract.js": "...",
    "typewriter-effect": "..."
  }
}
```

**Removed from dependencies:**
- ~~`firebase`~~
- ~~`react-firebase-hooks`~~
- ~~`@google/genai`~~
- ~~`@google/generative-ai`~~

### Backend `.env` (After)
```env
OPENAI_API_KEY=your_openai_api_key_here
LIVEAVATAR_API_KEY=your_liveavatar_api_key_here
```

---

## 🔴 Features Lost After M1 (Auth Removal)

| Feature | Status After Migration |
|---|---|
| User Login / Sign Up | ❌ Removed |
| Google / Phone OAuth | ❌ Removed |
| Multi-user data isolation | ❌ Removed (single session only) |
| Parent Dashboard | ❌ Removed |
| Parent-Student Linking | ❌ Removed |
| Red Zone Alerts | ❌ Removed |
| Parent Email Notifications | ❌ Removed |
| XP / Levels / Streaks | ❌ Removed (Firestore-based) |
| Referral Codes | ❌ Removed |
| Role-based access (Student vs Parent) | ❌ Removed |

## ✅ Features Preserved After Both Migrations

| Feature | Status |
|---|---|
| AI Flashcard Generation | ✅ Works (now via OpenAI) |
| PDF / Image Upload + OCR | ✅ Works |
| Diagram / Infograph Generation | ✅ Works (now via OpenAI) |
| Flashcard Summary | ✅ Works (now via OpenAI) |
| Collections & Flashcard Storage | ✅ Works (now SQLite) |
| Spaced Repetition (SM-2) | ✅ Works (SQLite) |
| Quiz Engine | ✅ Works (now via OpenAI) |
| My Learning — Roadmap | ✅ Works (now via OpenAI) |
| My Learning — Notes | ✅ Works (SQLite + OpenAI) |
| My Learning — Daily Missions | ✅ Works (SQLite + OpenAI) |
| AI Tutor (voice + avatar) | ✅ Works (now via OpenAI) |
| Visualizer / Mermaid Diagrams | ✅ Works |
| Dark / Light Mode | ✅ Works |
| Dashboard (without gamification) | ✅ Works (simplified) |
