# 🎨 Abhyas AI — Frontend Module Documentation

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Firebase

The frontend lives in `AI-Flashcard/AI-Flashcard/src/app/` and is organized by route modules.

---

## 📂 Module Overview

| Module | Route | File | Description |
|---|---|---|---|
| [Landing Page](#1-landing-page) | `/` | `page.tsx` | Hero page with feature highlights |
| [Authentication](#2-authentication-module) | `/auth` | `auth/page.tsx` | Sign up / Sign in (Email, Google, Phone) |
| [Dashboard](#3-dashboard-module) | `/dashboard` | `dashboard/page.tsx` | Student & Parent dashboard |
| [Flashcard Generator](#4-flashcard-generator-module) | `/flashcard` | `flashcard/page.tsx` | AI-powered flashcard creation |
| [Quiz Engine](#5-quiz-engine-module) | `/quiz` | `quiz/page.tsx` | AI-generated multiple-choice quizzes |
| [Collections](#6-collections-module) | `/collections` | `collections/page.tsx` | Browse and manage flashcard collections |
| [My Learning](#7-my-learning-module) | `/my-learning` | `my-learning/page.tsx` | Roadmap, notes, daily missions |
| [AI Tutor](#8-ai-tutor-module) | `/ai-tutor` | `ai-tutor/page.tsx` | Live avatar AI tutor with voice |
| [Visualizer](#9-visualizer-module) | `/visualizer` | `visualizer/page.tsx` | Mermaid diagram viewer |
| [API Routes](#10-next.js-api-routes) | `/api/*` | `api/*/route.ts` | Server-side OCR and data fetch |

---

## Shared Components

| Component | File | Purpose |
|---|---|---|
| `Flashcard` | `components/Flashcard.tsx` | Flip-card component |
| `LayoutWrapper` | `components/LayoutWrapper.tsx` | Sidebar + page layout wrapper |
| `MermaidRenderer` | `components/MermaidRenderer.tsx` | Renders Mermaid.js diagrams |
| `ModernUI` | `components/ModernUI.tsx` | `ModernButton`, `ModernInput` design system |
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Auth guard HOC |
| `Sidebar` | `components/Sidebar.tsx` | Navigation sidebar |
| `ThemeProvider` | `components/ThemeProvider.tsx` | Dark/light mode context |
| `ThemeToggle` | `components/ThemeToggle.tsx` | Toggle button for theme |
| `UploadDropzone` | `components/UploadDropzone.tsx` | Drag-and-drop file upload UI |

---

## Firebase Utilities

| File | Purpose |
|---|---|
| `firebase/config.js` | Firebase app init, exports `auth` and `db` |
| `firebase/saveUser.ts` | Saves user profile to Firestore via backend API |

---

## 1. Landing Page

**File:** `src/app/page.tsx`  
**Route:** `/`

The marketing landing page shown to unauthenticated visitors.

### Features
- Animated typewriter headline cycling through: `"ABHYAS AI ⚡"`, `"Smart Cards 🧠"`, `"Instant Learning ✨"`
- Parallax mouse-move background blobs
- Feature grid cards (AI Magic, Smart Recall, Multi-Device, OCR Power)
- **Get Started Now** button → routes to `/auth`
- Dark/Light mode via `ThemeToggle`

### Key State

| State | Type | Description |
|---|---|---|
| `mousePos` | `{x, y}` | Tracks cursor position for parallax effect |

### Dependencies
- `typewriter-effect` — animated text
- `react-icons` — icon library

---

## 2. Authentication Module

**File:** `src/app/auth/page.tsx`  
**Route:** `/auth`

Handles all user authentication flows: Email/Password, Google OAuth, and Phone/OTP.

### Modes

| Mode | Trigger | Description |
|---|---|---|
| Login | Default | Email or username + password |
| Sign Up | Toggle button | Email, username, age + password |
| Phone OTP | "Phone" button | Indian mobile number OTP flow |
| Google | "Google" button | Firebase OAuth popup |

### Role Selection
During sign-up, the user picks a role:
- **Student** — accesses flashcards, quizzes, roadmap
- **Parent** — accesses the Parent Dashboard to monitor linked students

### Key State

| State | Type | Description |
|---|---|---|
| `isLoginMode` | `boolean` | Toggles between login and signup form |
| `isPhoneMode` | `boolean` | Switches to OTP flow |
| `role` | `"student" \| "parent"` | Selected user role |
| `formError` | `string \| null` | Displays validation/auth errors |

### Key Functions

| Function | Description |
|---|---|
| `handleFormSubmit` | Validates and submits email/password auth |
| `handleGoogleLogin` | Signs in via Google popup |
| `handleSendOtp` | Sends OTP via Firebase `signInWithPhoneNumber` |
| `handleVerifyOtp` | Verifies OTP code |

### Post-Auth Flow
On successful authentication, `saveUserToFirestore()` is called to persist user data, then the user is redirected to `/dashboard`.

### Validation Rules
- Email must be `@gmail.com` format
- Password minimum 6 characters
- Phone must be 10-digit Indian number (auto-prefixes `+91`)
- Username uniqueness checked via backend: `GET /api/check-username`

---

## 3. Dashboard Module

**File:** `src/app/dashboard/page.tsx`  
**Route:** `/dashboard`

The main hub after login. Renders differently based on user role.

### Role Branching

```
Dashboard
├── role === "parent"  → <ParentDashboard />
└── role === "student" → Full Student Dashboard
```

### Student Dashboard Sections

#### 3.1 Header
- Welcome message with user's display name
- **Referral Code** (clickable to copy to clipboard) — used to link students to parents

#### 3.2 Scholar Progression
- XP level indicator with progress bar (`xp % 100`)

#### 3.3 Quick Stats
| Stat | Source |
|---|---|
| Total Collections | Backend `GET /api/collections` |
| Total XP | Backend `GET /api/user/:uid/stats` |
| Study Streak | Backend `GET /api/user/:uid/stats` |

#### 3.4 Student Highlights
- Overall performance score (average of missions + quizzes)
- Daily missions completed count and average score
- Quiz performance: average accuracy, total attempts
- Recent activity list
- Topic breakdown table

#### 3.5 Achievements
12 achievement badges with unlock criteria:

| Achievement | Unlock Condition |
|---|---|
| First Step | 1 mission completed |
| Mission Adept | 5 missions completed |
| Mission Master | 25 missions completed |
| Quiz Taker | 1 quiz submitted |
| Quiz Veteran | 10 quizzes completed |
| On Fire | 3-day study streak |
| Week Warrior | 7-day study streak |
| XP Earner | 100 XP earned |
| Scholar | 500 XP earned |
| Perfectionist | Quiz score ≥ 90% |
| Pathfinder | 1 roadmap created |
| High Achiever | Avg mission score ≥ 80% (3+ missions) |

#### 3.6 Test Results
Tabbed view: **Quizzes** | **Missions** with accuracy bars per entry.

#### 3.7 Recent Collections
Grid of up to 3 recent flashcard collections.

### Parent Dashboard

**File:** `src/app/dashboard/ParentDashboard.tsx`

| Feature | Description |
|---|---|
| Link Student | Enter student referral code to connect |
| Student List | View all linked students |
| Red Zones | Topics where student averaged < 40% |
| AI Suggestions | AI-generated study tips per weak topic |

---

## 4. Flashcard Generator Module

**File:** `src/app/flashcard/page.tsx`  
**Route:** `/flashcard`

The core content creation tool. Accepts text, PDF, or image input and generates interactive flashcards.

### Input Methods

| Method | Handler | Backend Endpoint |
|---|---|---|
| Plain text | Typed into textarea | `POST /api/flashcards/generate` |
| PDF upload | `handleFileUpload` | `POST /api/file` (extract text first) |
| Image upload | `handleFileUpload` with Tesseract.js | Browser-side OCR, no backend call |

### Action Buttons

| Button | Function | Description |
|---|---|---|
| ⚡ Flashcards | `generateFlashcardsFromGemini` | Generate Q&A flashcard pairs from text |
| Infograph | `handleGenerateInfograph` | Generate a node-link infographic diagram |
| Diagram | `handleGenerateDiagram` | Generate Mermaid flowchart and navigate to `/visualizer` |
| Summary | `handleGenerateSummary` | AI summary of key concepts, difficulty, study tips |
| Save | `handleSaveFlashcards` | Save cards to selected Firestore collection |

### Flashcard Interaction

| Feature | Description |
|---|---|
| Navigation | Previous / Next buttons with page counter |
| Flip card | Click card to reveal answer |
| Text-to-speech | Speaker icon reads aloud question or answer |
| Spaced Repetition | Cards in Study mode support SM-2 review ratings |
| Confetti | Celebrates reaching last card |

### Collection Management

| Action | Description |
|---|---|
| Select collection | Dropdown populated from `GET /api/collections` |
| Create new collection | Inline input + `POST /api/collections` |
| Start Quiz | Button routes to `/quiz?collectionId=<id>` |
| Study Collection | Loads existing cards from collection for review |

### Key State

| State | Type | Description |
|---|---|---|
| `flashcards` | `{question, answer}[]` | Current set of generated/loaded cards |
| `inputText` | `string` | Source text for generation |
| `file` | `File \| null` | Uploaded file (PDF or image) |
| `currentPage` | `number` | Active flashcard index |
| `summary` | `any \| null` | AI-generated summary JSON |
| `infoData` | `any \| null` | Infograph node-link JSON |
| `isStudying` | `boolean` | In study mode (loaded from collection) |

---

## 5. Quiz Engine Module

**File:** `src/app/quiz/page.tsx`  
**Route:** `/quiz?collectionId=<id>`

Generates and renders an AI multiple-choice quiz from flashcard content.

### Flow

```
1. Fetch flashcards for the collection → GET /api/collections/:id/flashcards
2. Convert cards to context text
3. Generate 5 questions → POST /api/quiz/generate
4. User answers one question at a time
5. On finish → submit XP → POST /api/user/:uid/activity
6. Show result screen with score and XP earned
```

### Question Interaction
- 4 options per question
- Instant feedback (green = correct, red = wrong)
- Explanation shown after selecting an answer
- Progress bar shows current position

### Scoring
- 20 XP per correct answer
- Results shown on completion screen with confetti

### Key State

| State | Type | Description |
|---|---|---|
| `questions` | `any[]` | AI-generated MCQ array |
| `currentIndex` | `number` | Active question position |
| `score` | `number` | Running correct count |
| `showResult` | `boolean` | Toggles result screen |
| `xpEarned` | `number` | Total XP to award |

---

## 6. Collections Module

**File:** `src/app/collections/page.tsx`  
**Route:** `/collections`

Browse all flashcard collections created by the user.

### Features
- Grid view of all collections
- Click a collection to load flashcards
- Navigate to quiz for any collection

---

## 7. My Learning Module

**File:** `src/app/my-learning/page.tsx`  
**Route:** `/my-learning`

Comprehensive structured learning hub.

### Sub-Sections

#### 7.1 Today's Mission (Daily Task Tracker)
- Displays 3–5 daily tasks
- If a roadmap is active: tasks = current week's milestones
- If no roadmap: AI generates 3 generic study tasks
- Each task has a **Complete & Test** button that triggers a 5-question quiz
- Progress bar tracks completion percentage
- **Cognitive Mastery Score** = 60% completion rate + 40% average task score

#### 7.2 AI Roadmap Generator
- Input a learning goal (e.g., "Master Quantum Mechanics in 4 weeks")
- Generates a week-by-week roadmap via `POST /api/learning/roadmap`
- Each week has: `focus`, `milestones[]`, `resources[]` (video/article links)

#### 7.3 Path Progression (Roadmap Tracker)
- Visual node-based progress bar across all weeks
- Click any week node to jump to that week's tasks
- Week-by-week navigation (Prev Week / Next Week)
- Collapsible full roadmap detail with resources (YouTube / Microsoft Learn links)

#### 7.4 Quick Notes Generator
- Input subject + skill level (Beginner / Intermediate / Advanced)
- Generates structured markdown notes via `POST /api/learning/quick-notes`
- Notes can be **saved to Archive** via `POST /api/learning/notes`
- Archived notes can be viewed or deleted

#### 7.5 Roadmap Quiz (Per Week)
- Each roadmap week has a "Take Quiz" button
- Generates a 5-question MCQ from that week's focus and milestones
- Shows score on completion

#### 7.6 Library Search
- Search bar with direct links to YouTube or Microsoft Learn

---

## 8. AI Tutor Module

**File:** `src/app/ai-tutor/page.tsx`  
**Route:** `/ai-tutor`

A live AI tutor powered by an animated avatar (LiveAvatar/HeyGen) with real-time voice chat.

### Setup Flow

```
Step 1: Upload PDF study material
       → POST /api/file (extract text)
       → POST /api/tutor/context (save context)

Step 2: Connect Tutor
       → POST /api/heygen-token (get avatar session token)
       → Launch LiveAvatar SDK or Sandbox iframe

Step 3: Voice Interaction
       → Browser SpeechRecognition API captures voice
       → POST /api/tutor/chat (get AI response)
       → Avatar speaks the reply via LiveAvatarSession.repeat()
```

### Avatar Modes

| Mode | Trigger | Description |
|---|---|---|
| **SDK Mode** | Token returned with `token` field | Full LiveAvatarSession with real video stream |
| **Sandbox/iframe Mode** | Token returned with `url` field | Embeds LiveAvatar sandbox iframe |
| **Fallback Mode** | SDK fails | Falls back to iframe automatically |

### Voice Controls
- **Microphone button** — Toggle listening (uses Web Speech API)
- Transcript displayed in real-time
- Tutor message subtitle shown below avatar

### Key State

| State | Type | Description |
|---|---|---|
| `isSessionActive` | `boolean` | Avatar session running |
| `isListening` | `boolean` | Microphone capturing |
| `isSpeaking` | `boolean` | Avatar speaking |
| `contextSet` | `boolean` | Study material loaded |
| `transcript` | `string` | Last recognized speech |
| `tutorMessage` | `string` | Last AI reply |

---

## 9. Visualizer Module

**File:** `src/app/visualizer/page.tsx`  
**Route:** `/visualizer`

Renders a Mermaid.js diagram passed via `localStorage` from the Flashcard Generator.

### Flow
1. Flashcard page stores diagram code: `localStorage.setItem("pending_diagram", code)`
2. Visualizer reads it on load
3. Diagram rendered by `<MermaidRenderer />` component

### Supported Diagram Types
- Flowcharts (default)
- Sequence diagrams
- State diagrams
- Entity-relationship diagrams

---

## 10. Next.js API Routes

Located at `src/app/api/`

### `GET /api/get/route.ts`
Utility route for fetching data server-side.

### `POST /api/ocr/route.ts`
Server-side OCR processing route (alternative to browser-side Tesseract.js).

---

## 🔄 Data Flow Summary

```
User Action → Frontend Component
           → fetch() to Python Backend (port 8000)
           → Backend calls Gemini AI / Firestore / SQLite
           → Response returned to Frontend
           → UI updated via React state
```

---

## 🎨 Design System

The app uses a custom Tailwind CSS configuration with:

| Class | Usage |
|---|---|
| `glass-card` | Frosted glass card component |
| `interactive-glass` | Glass card with hover effects |
| `text-gradient` | Purple-to-blue gradient text |
| `animate-float` | Gentle floating animation |
| `animate-pulse-subtle` | Soft pulsing animation |
| `brand-*` | Primary brand color scale |
| `accent-*` | Secondary accent color scale |

**Fonts:**
- Display/Headings: `Poppins`, `Manrope`
- Body: `Inter`
- Icons: `Material Symbols Outlined` (Google) + `react-icons`
