# ⚙️ Abhyas AI — Backend Module Documentation

**Tech Stack:** Python 3.10+, FastAPI, Uvicorn, Google Gemini AI, Firebase Admin SDK, SQLite

The backend lives in `backend/main.py` (≈1308 lines) and exposes a REST API consumed by the Next.js frontend.

---

## 📂 Module Overview

| Module | Endpoints | Description |
|---|---|---|
| [1. Configuration & Init](#1-configuration--initialization) | — | App setup, DB init, Firebase, Gemini |
| [2. User Management](#2-user-management-module) | 4 endpoints | CRUD for user profiles |
| [3. Flashcard Management](#3-flashcard-management-module) | 6 endpoints | Collections and flashcard CRUD |
| [4. AI Generation](#4-ai-generation-module) | 5 endpoints | Gemini-powered content generation |
| [5. Quiz Module](#5-quiz-module) | 2 endpoints | Quiz generation and result storage |
| [6. Spaced Repetition (SM-2)](#6-spaced-repetition-sm-2-module) | 1 endpoint | SM-2 algorithm for flashcard review |
| [7. Gamification](#7-gamification-module) | 2 endpoints | XP, levels, streaks |
| [8. Parent-Student Linking](#8-parent-student-linking-module) | 3 endpoints | Referral-based family linking |
| [9. AI Tutor](#9-ai-tutor-module) | 4 endpoints | Context storage and tutor chat |
| [10. My Learning](#10-my-learning-module) | 10 endpoints | Roadmap, notes, missions, quizzes |
| [11. Student Performance](#11-student-performance-module) | 3 endpoints | Highlights, achievements, test results |
| [12. Email Alerts](#12-email-notification-module) | — | Automatic parent alerts |

---

## 1. Configuration & Initialization

### Application Startup

```python
app = FastAPI()
init_sqlite_db()   # Creates all SQLite tables
firebase_admin.initialize_app(cred)  # Firebase Admin
genai.configure(api_key=settings.gemini_api_key)  # Gemini AI
```

### Environment Variables (via `.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key |
| `LIVEAVATAR_API_KEY` | ✅ Yes | LiveAvatar / HeyGen API key |
| `EMAIL_USER` | ⚠️ Optional | Gmail address for parent alerts |
| `EMAIL_PASS` | ⚠️ Optional | Gmail App Password |

### CORS Configuration

Allows requests from:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://127.0.0.1:3000`

### SQLite Database (`learning_notes.db`)

Auto-created on startup with the following tables:

| Table | Primary Key | Description |
|---|---|---|
| `notes` | `id` (UUID) | AI-generated and saved user notes |
| `roadmaps` | `uid` | User learning roadmaps (JSON blob) |
| `daily_missions` | `id` (auto) | Daily tasks with completion status |
| `tutor_context` | `uid` | Uploaded PDF text for AI tutor context |

### Gemini Model Fallback Strategy

All AI endpoints use a fallback list of models in this order:

```python
model_names = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest']
```

If one fails, the next is tried automatically.

### Utility: `parse_json_res(text)`

Robustly extracts JSON from AI responses, handling:
1. Markdown code blocks (` ```json ... ``` `)
2. First `[` or `{` to last `]` or `}`
3. Raw JSON parsing as final fallback

---

## 2. User Management Module

### Pydantic Model: `UserModels`

| Field | Type | Description |
|---|---|---|
| `uid` | `str` | Firebase Auth UID |
| `email` | `str` (optional) | User email |
| `phone` | `str` (optional) | Phone number |
| `name` | `str` | Display name (default: "User") |
| `role` | `str` | `"student"` or `"parent"` |
| `username` | `str` (optional) | Unique username |
| `age` | `int` (optional) | User age |

---

### `POST /api/users`

Saves or updates a user profile in Firestore.

**Behavior:**
- Uses Firestore `set(merge=True)` — creates if new, updates if existing
- Students automatically get a **referral code** (first 6 chars of UID, uppercase)
- Existing referral codes are preserved on updates

**Response:**
```json
{ "status": "success", "message": "User saved" }
```

---

### `GET /api/check-username?username=<value>`

Checks if a username is already taken in Firestore.

**Response:**
```json
{ "exists": true }   // or { "exists": false }
```

---

### `GET /api/get-email-by-username?username=<value>`

Looks up a user's email by their username (used for username-based login).

**Response:**
```json
{ "email": "user@gmail.com" }
```

---

## 3. Flashcard Management Module

### `POST /api/collections/default`

Creates a default "My First Collection" for new users.

**Body:**
```json
{ "uid": "firebase_uid" }
```

---

### `GET /api/collections?uid=<uid>`

Returns all flashcard collections for a user.

**Response:**
```json
{
  "collections": [
    { "id": "col_id", "name": "My Collection", "createdAt": "..." }
  ]
}
```

---

### `POST /api/collections`

Creates a new named collection.

**Body:**
```json
{ "uid": "firebase_uid", "name": "New Collection" }
```

---

### `POST /api/flashcards`

Saves a set of flashcards to a specific collection.

**Body (SaveFlashcardsRequest):**
```json
{
  "uid": "firebase_uid",
  "collection_id": "col_id",
  "collection_name": "My Collection",
  "flashcards": [
    { "question": "...", "answer": "...", "easiness_factor": 2.5, "interval": 0.0 }
  ]
}
```

**Behavior:**
- Each card gets a UUID if `id` is null
- Stored in nested Firestore: `users/{uid}/collections/{col_id}/flashcardSets`

---

### `GET /api/collections/{collection_id}/flashcards?uid=<uid>`

Returns all flashcards in a collection (from all flashcard sets, ordered by creation date descending).

**Response:**
```json
{
  "flashcards": [
    { "id": "card_id", "question": "...", "answer": "...", "set_id": "set_id", ... }
  ]
}
```

---

### `POST /api/file`

Extracts plain text from an uploaded PDF file.

**Form Data:** `file` (PDF only)

**Behavior:**
- Uses `PyPDF2.PdfReader` to extract text page by page
- Returns concatenated text
- Rejects non-PDF files with HTTP 400

**Response:**
```json
{ "text": "extracted text content..." }
```

---

## 4. AI Generation Module

### `POST /api/flashcards/generate`

Generates raw flashcard text from input using Gemini AI.

**Body (GenerateFlashcardsRequest):**
```json
{ "text": "source text", "count": 10 }
```

**Prompt Format:**
```
Generate {count} flashcards from the text below.
Q: <question>
A: <answer>
Separate each with a blank line.
```

**Response:**
```json
{ "text": "Q: What is X?\nA: X is...\n\nQ: ..." }
```

> [!NOTE]
> The frontend parses this raw text into `{question, answer}` pairs.

---

### `POST /api/quiz/generate`

Generates multiple-choice quiz questions from text.

**Body (QuizRequest):**
```json
{ "text": "source text", "count": 5 }
```

**Response:**
```json
{
  "questions": [
    {
      "question": "What is...?",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "Because..."
    }
  ]
}
```

---

### `POST /api/generate-diagram`

Converts text to a Mermaid.js diagram.

**Body (DiagramRequest):**
```json
{ "text": "source text", "diagramType": "flowchart" }
```

**Prompt instruction:** Wraps node labels with spaces/special characters in double quotes to prevent syntax errors.

**Response:**
```json
{ "code": "flowchart TD\n  A[\"Start\"] --> B[\"End\"]" }
```

---

### `POST /api/generate-infograph`

Converts text to a structured node-link JSON for infographic rendering.

**Body:**
```json
{ "text": "source text" }
```

**Response:**
```json
{
  "title": "Topic Name",
  "nodes": [
    { "id": "1", "label": "Concept A", "description": "Brief explanation" }
  ],
  "links": [
    { "source": "1", "target": "2", "relation": "leads to" }
  ]
}
```

---

### `POST /api/flashcards/summarize`

Generates a structured AI summary from a flashcard set.

**Body (FlashcardSummarizeRequest):**
```json
{
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}
```

**Response:**
```json
{
  "summary": {
    "topic": "Topic Title",
    "overview": "2-3 sentence overview",
    "difficulty": "Beginner | Intermediate | Advanced",
    "keyConceptsSummary": [
      { "concept": "Name", "summary": "One sentence" }
    ],
    "studyTips": ["Tip 1", "Tip 2", "Tip 3"],
    "totalCards": 10,
    "estimatedStudyTime": "15 minutes"
  }
}
```

> [!NOTE]
> Uses an older/safer model list: `['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']` for better stability.

---

## 5. Quiz Module

### `POST /api/quiz/result`

Saves a quiz attempt result to Firestore and triggers parent notification checks.

**Body (QuizAttemptRequest):**
```json
{
  "uid": "firebase_uid",
  "topic": "Mathematics",
  "score": 4,
  "total": 5
}
```

**Behavior:**
1. Stores result in `users/{uid}/quiz_attempts`
2. Calls `notify_parents_if_weak()` in background

---

## 6. Spaced Repetition (SM-2) Module

### `POST /api/flashcards/review`

Updates a flashcard's SM-2 scheduling parameters after a review.

**Body (ReviewFlashcardRequest):**
```json
{
  "uid": "firebase_uid",
  "collection_id": "col_id",
  "set_id": "set_id",
  "card_id": "card_id",
  "quality": 2
}
```

### Quality Scale

| Quality | Label | Behavior |
|---|---|---|
| `0` | Again | Resets interval to 0 (re-show immediately) |
| `1` | Hard | Interval × 1.2 (slight increase) |
| `2` | Good | Interval × 2.5 |
| `3` | Easy | Interval × EF × 1.3 (large jump) |

### SM-2 Fields Updated
- `interval` — days until next review
- `easiness_factor` — multiplier (default 2.5)
- `next_review_date` — ISO timestamp of next due date

---

## 7. Gamification Module

### `GET /api/user/{uid}/stats`

Returns the user's gamification stats.

**Response:**
```json
{
  "xp": 240,
  "level": 3,
  "streak": 5,
  "lastActive": "2026-11-18",
  "role": "student",
  "referralCode": "ABC123"
}
```

---

### `POST /api/user/{uid}/activity`

Updates XP, level, and study streak when the user completes an activity.

**Body (UserActivityRequest):**
```json
{ "uid": "firebase_uid", "xp_gained": 20, "collection_id": "col_id" }
```

### Level Calculation
```python
level = 1 + (total_xp // 100)
```

### Streak Logic
| Condition | Result |
|---|---|
| Last active = yesterday | Streak + 1 |
| Last active = today | Streak unchanged |
| Last active > 1 day ago | Streak reset to 1 |

> [!NOTE]
> Parents are excluded from gamification — this endpoint returns early for `role === "parent"`.

---

## 8. Parent-Student Linking Module

### `POST /api/link-student`

Links a parent account to a student using the student's referral code.

**Body (LinkStudentRequest):**
```json
{ "parentId": "parent_uid", "referralCode": "ABC123" }
```

**Behavior:**
1. Queries Firestore for student with matching `referralCode` and `role === "student"`
2. Creates a document in `parent_student_links` collection
3. Returns student's name on success

---

### `GET /api/parent/{parent_id}/students`

Returns all students linked to a parent.

**Response:**
```json
{
  "students": [
    { "id": "student_uid", "name": "John", "email": "...", "xp": 200, "level": 3, "streak": 5 }
  ]
}
```

---

### `GET /api/parent/{parent_id}/student/{student_id}/red-zones`

Identifies topics where the student is consistently scoring below 40%.

**Algorithm:**
1. Fetches last 15 quiz attempts for the student
2. Groups by topic
3. For topics with ≥ 3 attempts and average accuracy < 40% → flagged as "red zone"
4. Generates an AI study suggestion per red zone topic

**Response:**
```json
{
  "redZones": [
    {
      "topic": "Algebra",
      "averageScore": 32.5,
      "suggestion": "Consider scheduling short 10-minute review sessions..."
    }
  ]
}
```

---

## 9. AI Tutor Module

### `POST /api/tutor/context`

Saves PDF text as tutor context for a user session.

**Body (TutorContextRequest):**
```json
{ "uid": "user_uid", "material_text": "extracted PDF text..." }
```

Stored in SQLite `tutor_context` table (1 record per user, overwritten on new upload).

---

### `GET /api/tutor/context/{uid}`

Retrieves the saved tutor context for a user.

**Response:**
```json
{ "material_text": "..." }
```

---

### `POST /api/heygen-token`

Generates a LiveAvatar/HeyGen session token for the AI tutor.

**Behavior:**
- Calls `POST https://api.liveavatar.com/v2/embeddings`
- Uses sandbox mode (`is_sandbox: true`)
- Returns embed URL for iframe mode

**Response:**
```json
{ "url": "https://embed.liveavatar.com/..." }
```

---

### `POST /api/tutor/chat`

Processes a student's voice/text message and returns an AI tutor response.

**Body (TutorChatRequest):**
```json
{ "uid": "user_uid", "message": "What is photosynthesis?" }
```

**Behavior:**
1. Loads tutor context from SQLite (up to 10,000 characters)
2. Builds Gemini prompt: conversational, concise (1-3 sentences), spoken-style
3. If context is loaded, answers strictly based on the uploaded material
4. Returns the AI reply

**System Prompt:**
```
You are a friendly, encouraging, and highly intelligent AI academic tutor.
Keep your responses conversational, spoken-style, and concise (1-3 sentences max).
Do not use emojis or complex markdown formatting as your text will be spoken out loud.
```

**Response:**
```json
{ "reply": "Photosynthesis is the process by which plants convert sunlight into glucose..." }
```

---

## 10. My Learning Module

### `POST /api/learning/roadmap`

Generates a week-by-week learning roadmap for a given goal.

**Body (RoadmapRequest):**
```json
{ "uid": "user_uid", "goal": "Master Quantum Mechanics in 4 weeks" }
```

**Response (stored in SQLite + returned):**
```json
{
  "roadmap": [
    {
      "week": 1,
      "focus": "Fundamentals of Quantum Mechanics",
      "milestones": ["Understand wave-particle duality", "Study Schrödinger equation"],
      "resources": [
        { "type": "video", "title": "Intro to QM", "query": "quantum mechanics introduction" }
      ]
    }
  ]
}
```

---

### `GET /api/learning/active-roadmap/{uid}`

Retrieves the user's currently active roadmap from SQLite.

**Response:**
```json
{ "goal": "Master Quantum Mechanics", "roadmap": [...] }
```

---

### `POST /api/learning/quick-notes`

Generates structured markdown notes on a subject.

**Body (QuickNotesRequest):**
```json
{ "subject": "Newton's Laws", "level": "Beginner" }
```

**Response:**
```json
{ "notes": "## Newton's Laws\n### First Law\n- An object at rest..." }
```

---

### `POST /api/learning/notes`

Saves AI-generated notes to SQLite `notes` table.

**Body (NoteSaveRequest):**
```json
{ "uid": "user_uid", "subject": "Physics", "level": "Beginner", "content": "..." }
```

---

### `GET /api/learning/notes/{uid}`

Returns all saved notes for a user, ordered by most recent.

---

### `DELETE /api/learning/notes/{note_id}`

Deletes a specific note by its UUID.

---

### `POST /api/learning/daily-mission`

Generates 3 AI-powered daily study tasks.

**Body (DailyMissionRequest):**
```json
{ "uid": "user_uid", "topic": "Algebra", "roadmap": [...] }
```

**Behavior:**
- If `topic` + `roadmap` provided: tasks are targeted at earliest roadmap steps
- Otherwise: generic tasks (spaced repetition, quiz, reading)

---

### `GET /api/learning/missions/{uid}`

Returns today's daily missions from SQLite.

---

### `POST /api/learning/missions/sync`

Inserts a list of task strings as today's missions (uses `INSERT OR IGNORE`).

---

### `POST /api/learning/missions/complete`

Marks a mission as complete with a score.

**Body (MissionCompleteRequest):**
```json
{
  "uid": "user_uid",
  "task_text": "Review 5 Spaced Repetition cards",
  "score": 85
}
```

**Behavior:** Uses `ON CONFLICT DO UPDATE` to upsert by task name + date.

---

### `GET /api/learning/performance/{uid}`

Returns average score and completed count across all missions.

---

### `POST /api/learning/roadmap/quiz`

Generates a 5-question MCQ quiz for a specific roadmap week.

**Body (RoadmapQuizRequest):**
```json
{
  "uid": "user_uid",
  "week_index": 0,
  "focus": "Fundamentals of QM",
  "milestones": ["Wave-particle duality", "Schrödinger equation"]
}
```

---

## 11. Student Performance Module

### `GET /api/student/{uid}/highlights`

Returns an aggregated performance snapshot combining missions + quizzes.

**Response:**
```json
{
  "missions": {
    "completed": 12,
    "total": 20,
    "averageScore": 78.5,
    "recent": [{ "task": "...", "score": 90, "date": "2026-11-18" }]
  },
  "quizzes": {
    "totalAttempts": 8,
    "avgAccuracy": 72.3,
    "topicBreakdown": [{ "topic": "Math", "attempts": 3, "avgAccuracy": 68.0 }]
  },
  "user": { "xp": 320, "level": 4, "streak": 5 },
  "overallScore": 75.4
}
```

**Overall Score Formula:**
```python
overallScore = (avg_mission_score * 0.5) + (quiz_avg_accuracy * 0.5)
```

---

### `GET /api/student/{uid}/test-results`

Returns full quiz + mission history for the student.

**Response:**
```json
{
  "results": [
    {
      "id": "...", "topic": "Algebra", "score": 4, "total": 5,
      "accuracy": 80.0, "timestamp": "...", "source": "quiz"
    }
  ],
  "missionResults": [
    { "id": "mission-0", "topic": "Task name", "score": 90, "accuracy": 90.0, "source": "mission" }
  ]
}
```

---

### `GET /api/student/{uid}/achievements`

Computes which of the 12 achievements the student has unlocked.

**Response:**
```json
{
  "achievements": [...],
  "unlocked": [...],
  "locked": [...],
  "totalUnlocked": 5,
  "totalAchievements": 12
}
```

### Achievement Definitions

| ID | Title | Unlock Condition |
|---|---|---|
| `first_mission` | First Step | 1 mission completed |
| `mission_5` | Mission Adept | 5 missions completed |
| `mission_25` | Mission Master | 25 missions completed |
| `quiz_first` | Quiz Taker | 1 quiz submitted |
| `quiz_10` | Quiz Veteran | 10 quizzes completed |
| `streak_3` | On Fire | 3-day streak |
| `streak_7` | Week Warrior | 7-day streak |
| `xp_100` | XP Earner | 100 XP earned |
| `xp_500` | Scholar | 500 XP earned |
| `perfect_score` | Perfectionist | Quiz ≥ 90% accuracy |
| `roadmap_creator` | Pathfinder | 1 roadmap created |
| `high_avg` | High Achiever | Avg score ≥ 80% (3+ missions) |

---

## 12. Email Notification Module

### `send_email(to_email, subject, body)`

Internal helper to send HTML email via Gmail SMTP.

- Uses `smtp.gmail.com:587` with STARTTLS
- Requires `EMAIL_USER` and `EMAIL_PASS` in `.env`

---

### `notify_parents_if_weak(student_id, topic)`

Automatically triggered after every quiz submission.

**Trigger Conditions:**
| Condition | Threshold |
|---|---|
| Current attempt score | < 40% |
| Average of last 3 attempts | < 50% |

**Behavior:**
1. Fetches last 3 quiz attempts for the topic
2. Checks trigger conditions
3. Finds all parent-student links for the student
4. Sends a formatted HTML alert email to each linked parent

**Email Content Includes:**
- Student name and struggling topic
- Performance detail (current score or average)
- Link to Parent Dashboard
- AI-generated action suggestion (from Gemini)

---

## 🗄️ Database Schema

### SQLite (`learning_notes.db`)

#### `notes`
```sql
CREATE TABLE notes (
  id        TEXT PRIMARY KEY,       -- UUID
  uid       TEXT,                   -- Firebase user UID
  subject   TEXT,
  level     TEXT,                   -- Beginner / Intermediate / Advanced
  content   TEXT,                   -- Markdown notes content
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `roadmaps`
```sql
CREATE TABLE roadmaps (
  uid        TEXT PRIMARY KEY,      -- Firebase user UID
  goal       TEXT,                  -- Learning goal string
  data       TEXT,                  -- JSON roadmap array
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `daily_missions`
```sql
CREATE TABLE daily_missions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  uid       TEXT,
  task      TEXT,
  completed INTEGER DEFAULT 0,       -- 0 = pending, 1 = done
  score     INTEGER DEFAULT 0,       -- 0-100
  date      TEXT,                   -- YYYY-MM-DD
  UNIQUE(uid, task, date)
);
```

#### `tutor_context`
```sql
CREATE TABLE tutor_context (
  uid           TEXT PRIMARY KEY,
  material_text TEXT,               -- Extracted PDF text (up to 10k chars used)
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Firestore Collections

| Collection | Documents | Description |
|---|---|---|
| `users` | `{uid}` | User profiles |
| `users/{uid}/collections` | `{collectionId}` | Flashcard collections |
| `users/{uid}/collections/{id}/flashcardSets` | `{setId}` | Flashcard sets |
| `users/{uid}/quiz_attempts` | Auto-id | Quiz result records |
| `parent_student_links` | `{parentId}_{studentId}` | Parent-student relationships |

---

## 🔗 Complete API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users` | Create/update user |
| `GET` | `/api/check-username` | Check username availability |
| `GET` | `/api/get-email-by-username` | Lookup email by username |
| `POST` | `/api/collections/default` | Create default collection |
| `GET` | `/api/collections` | Get user's collections |
| `POST` | `/api/collections` | Create new collection |
| `GET` | `/api/collections/{id}/flashcards` | Get flashcards in collection |
| `POST` | `/api/flashcards` | Save flashcard set |
| `POST` | `/api/flashcards/generate` | AI generate flashcards |
| `POST` | `/api/flashcards/review` | SM-2 review update |
| `POST` | `/api/flashcards/summarize` | AI summarize flashcard set |
| `POST` | `/api/file` | Extract text from PDF |
| `POST` | `/api/quiz/generate` | AI generate quiz |
| `POST` | `/api/quiz/result` | Save quiz attempt |
| `GET` | `/api/user/{uid}/stats` | Get user stats |
| `POST` | `/api/user/{uid}/activity` | Update XP & streak |
| `POST` | `/api/generate-diagram` | AI generate Mermaid diagram |
| `POST` | `/api/generate-infograph` | AI generate infograph JSON |
| `POST` | `/api/link-student` | Link parent to student |
| `GET` | `/api/parent/{pid}/students` | Get linked students |
| `GET` | `/api/parent/{pid}/student/{sid}/red-zones` | Get weak topic zones |
| `POST` | `/api/tutor/context` | Save tutor study context |
| `GET` | `/api/tutor/context/{uid}` | Get tutor context |
| `POST` | `/api/heygen-token` | Generate avatar session token |
| `POST` | `/api/tutor/chat` | AI tutor chat |
| `POST` | `/api/learning/roadmap` | Generate learning roadmap |
| `GET` | `/api/learning/active-roadmap/{uid}` | Get active roadmap |
| `POST` | `/api/learning/roadmap/quiz` | Roadmap week quiz |
| `POST` | `/api/learning/quick-notes` | Generate quick notes |
| `POST` | `/api/learning/notes` | Save note |
| `GET` | `/api/learning/notes/{uid}` | Get saved notes |
| `DELETE` | `/api/learning/notes/{note_id}` | Delete note |
| `POST` | `/api/learning/daily-mission` | Generate daily missions |
| `GET` | `/api/learning/missions/{uid}` | Get today's missions |
| `POST` | `/api/learning/missions/sync` | Sync mission tasks |
| `POST` | `/api/learning/missions/complete` | Mark mission complete |
| `GET` | `/api/learning/performance/{uid}` | Get mission performance |
| `GET` | `/api/student/{uid}/highlights` | Performance highlights |
| `GET` | `/api/student/{uid}/test-results` | Full test history |
| `GET` | `/api/student/{uid}/achievements` | Achievement progress |
