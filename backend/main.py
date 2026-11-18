from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import sqlite3
import re
import os
try:
    import pypdf as PyPDF2
except ImportError:
    import PyPDF2
import tempfile
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import urllib.request
import urllib.error
from openai import OpenAI

app = FastAPI()

def init_sqlite_db():
    conn = sqlite3.connect("learning_notes.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS notes (
                 id TEXT PRIMARY KEY,
                 uid TEXT,
                 subject TEXT,
                 level TEXT,
                 content TEXT,
                 timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              )''')
    c.execute('''CREATE TABLE IF NOT EXISTS roadmaps (
                 uid TEXT PRIMARY KEY,
                 goal TEXT,
                 data TEXT,
                 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )''')
    c.execute('''CREATE TABLE IF NOT EXISTS daily_missions (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 uid TEXT,
                 task TEXT,
                 completed INTEGER DEFAULT 0,
                 score INTEGER DEFAULT 0,
                 date TEXT,
                 UNIQUE(uid, task, date)
              )''')
    c.execute('''CREATE TABLE IF NOT EXISTS tutor_context (
                 uid TEXT PRIMARY KEY,
                 material_text TEXT,
                 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )''')
    c.execute('''CREATE TABLE IF NOT EXISTS collections (
                 id TEXT PRIMARY KEY,
                 uid TEXT DEFAULT 'default_user',
                 name TEXT,
                 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )''')
    c.execute('''CREATE TABLE IF NOT EXISTS flashcard_sets (
                 id TEXT PRIMARY KEY,
                 collection_id TEXT,
                 name TEXT,
                 flashcards TEXT,
                 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                 FOREIGN KEY(collection_id) REFERENCES collections(id)
              )''')
    c.execute('''CREATE TABLE IF NOT EXISTS quiz_attempts (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 uid TEXT DEFAULT 'default_user',
                 topic TEXT,
                 score INTEGER,
                 total INTEGER,
                 accuracy REAL,
                 timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              )''')
    conn.commit()
    conn.close()

init_sqlite_db()

# Allow CORS so the Next.js frontend can make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration for OpenAI & External Services
class Settings(BaseSettings):
    openai_api_key: SecretStr = SecretStr("")
    liveavatar_api_key: SecretStr = SecretStr("")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

client: Optional[OpenAI] = None
if settings.openai_api_key and settings.openai_api_key.get_secret_value():
    client = OpenAI(api_key=settings.openai_api_key.get_secret_value())
    print("[OK] OPENAI_API_KEY loaded successfully")
else:
    print("[WARNING] OPENAI_API_KEY not found or empty in .env!")

if settings.liveavatar_api_key and settings.liveavatar_api_key.get_secret_value():
    print("[OK] LIVEAVATAR_API_KEY loaded successfully")
else:
    print("[ERROR] LIVEAVATAR_API_KEY NOT found in .env!")

def call_openai(prompt: str, model: str = "gpt-4o-mini") -> Optional[str]:
    if not client:
        return None
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        if response and response.choices:
            return response.choices[0].message.content.strip()
        return None
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None

def parse_json_res(text: str):
    """Robustly extracts JSON from AI responses that might use markdown or extra text."""
    try:
        # 1. Search for triple backtick blocks (```json ... ``` or ``` ... ```)
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if json_match:
            return json.loads(json_match.group(1).strip())
        
        # 2. Fallback: Search for the first [ or { and last ] or }
        json_match = re.search(r'(\[|\{)[\s\S]*(\]|\})', text)
        if json_match:
            return json.loads(json_match.group(0).strip())
        
        # 3. Last fallback: try parsing the whole thing
        return json.loads(text.strip())
    except Exception as e:
        print(f"JSON Parse Error: {e} | Raw Text: {text[:100]}...")
        return None


# ---- Pydantic Models ----

class DefaultCollectionRequest(BaseModel):
    uid: Optional[str] = "default_user"

class Flashcard(BaseModel):
    id: Optional[str] = None
    question: str
    answer: str
    easiness_factor: Optional[float] = 2.5
    interval: Optional[float] = 0.0  # Represents days.
    next_review_date: Optional[str] = None

class QuizAttemptRequest(BaseModel):
    uid: Optional[str] = "default_user"
    topic: str
    score: int
    total: int

class ReviewFlashcardRequest(BaseModel):
    uid: Optional[str] = "default_user"
    collection_id: str
    set_id: str
    card_id: str
    quality: int # 0=Again, 1=Hard, 2=Good, 3=Easy

class RoadmapRequest(BaseModel):
    uid: Optional[str] = "default_user"
    goal: str

class QuickNotesRequest(BaseModel):
    subject: str
    level: str

class DailyMissionRequest(BaseModel):
    uid: Optional[str] = "default_user"
    topic: Optional[str] = None
    roadmap: Optional[List[dict]] = None

class DiagramRequest(BaseModel):
    text: str
    diagramType: Optional[str] = "flowchart"

class TutorContextRequest(BaseModel):
    uid: Optional[str] = "default_user"
    material_text: str

class SaveFlashcardsRequest(BaseModel):
    uid: Optional[str] = "default_user"
    collection_id: str
    collection_name: str
    flashcards: List[Flashcard]

class QuizRequest(BaseModel):
    text: str
    count: Optional[int] = 5

class RoadmapQuizRequest(BaseModel):
    uid: Optional[str] = "default_user"
    week_index: int
    focus: str
    milestones: List[str]

class MissionSyncRequest(BaseModel):
    uid: Optional[str] = "default_user"
    tasks: List[str]

class MissionCompleteRequest(BaseModel):
    uid: Optional[str] = "default_user"
    task_id: Optional[Any] = None
    task_text: Optional[str] = None
    score: int

class GenerateFlashcardsRequest(BaseModel):
    text: str
    count: Optional[int] = 10

class InfographRequest(BaseModel):
    text: str

class TutorChatRequest(BaseModel):
    uid: Optional[str] = "default_user"
    message: str

class NoteSaveRequest(BaseModel):
    uid: Optional[str] = "default_user"
    subject: str
    level: str
    content: str

class FlashcardSummarizeRequest(BaseModel):
    flashcards: List[dict]


# ---- COLLECTIONS & FLASHCARDS (SQLite Backed) ----

@app.post("/api/collections/default")
async def create_default_collection(request: DefaultCollectionRequest):
    try:
        uid = request.uid or "default_user"
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("""
            INSERT OR IGNORE INTO collections (id, uid, name) 
            VALUES ('Auto', ?, 'My First Collection')
        """, (uid,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Default collection created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/collections")
async def get_collections(uid: Optional[str] = "default_user"):
    try:
        user_id = uid or "default_user"
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("SELECT id, name, created_at FROM collections WHERE uid=? ORDER BY created_at DESC", (user_id,))
        rows = c.fetchall()
        conn.close()
        collections = [{"id": r[0], "name": r[1]} for r in rows]
        return {"collections": collections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/collections")
async def create_collection(request: dict):
    try:
        uid = request.get("uid", "default_user")
        name = request.get("name", "New Collection")
        col_id = str(uuid.uuid4())
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("INSERT INTO collections (id, uid, name) VALUES (?, ?, ?)", (col_id, uid, name))
        conn.commit()
        conn.close()
        return {"status": "success", "id": col_id, "name": name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flashcards")
async def save_flashcards(request: SaveFlashcardsRequest):
    try:
        valid_cards = []
        for card in request.flashcards:
            valid_cards.append({
                "id": card.id or str(uuid.uuid4()),
                "question": card.question,
                "answer": card.answer,
                "easiness_factor": card.easiness_factor or 2.5,
                "interval": card.interval or 0.0,
                "next_review_date": card.next_review_date or datetime.utcnow().isoformat()
            })
        set_id = str(uuid.uuid4())
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("""
            INSERT INTO flashcard_sets (id, collection_id, name, flashcards)
            VALUES (?, ?, ?, ?)
        """, (set_id, request.collection_id, request.collection_name, json.dumps(valid_cards)))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Flashcards saved successfully", "id": set_id}
    except Exception as e:
        print(f"Error saving flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/collections/{collection_id}/flashcards")
async def get_collection_flashcards(collection_id: str, uid: Optional[str] = "default_user"):
    try:
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("SELECT id, flashcards FROM flashcard_sets WHERE collection_id=? ORDER BY created_at DESC", (collection_id,))
        rows = c.fetchall()
        conn.close()
        all_flashcards = []
        for row in rows:
            set_id = row[0]
            cards = json.loads(row[1]) if row[1] else []
            for card in cards:
                card["set_id"] = set_id
            all_flashcards.extend(cards)
        return {"flashcards": all_flashcards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flashcards/review")
async def review_flashcard(request: ReviewFlashcardRequest):
    conn = sqlite3.connect("learning_notes.db")
    c = conn.cursor()
    c.execute("SELECT flashcards FROM flashcard_sets WHERE id=?", (request.set_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Set not found")

    cards = json.loads(row[0]) if row[0] else []
    updated = False
    for card in cards:
        if card.get("id") == request.card_id:
            ef = card.get("easiness_factor", 2.5)
            interval = card.get("interval", 0.0)

            # Simple SM-2 based on 0=Again, 1=Hard, 2=Good, 3=Easy
            if request.quality == 0:
                interval = 0
            elif request.quality == 1:
                interval = max(1.0, interval * 1.2)
            elif request.quality == 2:
                interval = max(1.0, (interval * 2.5))
            elif request.quality == 3:
                interval = 5.0 if interval == 0 else max(5.0, interval * ef * 1.3)

            card["easiness_factor"] = round(ef, 2)
            card["interval"] = round(interval, 2)

            if interval == 0:
                card["next_review_date"] = datetime.utcnow().isoformat()
            else:
                new_date = datetime.utcnow() + timedelta(days=interval)
                card["next_review_date"] = new_date.isoformat()

            updated = True
            break

    if updated:
        c.execute("UPDATE flashcard_sets SET flashcards=? WHERE id=?", (json.dumps(cards), request.set_id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Card updated"}

    conn.close()
    raise HTTPException(404, "Card not found in set")


# ---- AI GENERATION ENDPOINTS (OpenAI Backed) ----

@app.post("/api/flashcards/generate")
async def generate_flashcards(request: GenerateFlashcardsRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    try:
        prompt = f"""Generate {request.count} flashcards from the text below.
For each flashcard, use this exact format:
Q: <question here>
A: <answer here>

Separate each flashcard with a blank line.
Text: {request.text}"""

        res = call_openai(prompt)
        if res:
            return {"text": res}
        raise HTTPException(status_code=500, detail="AI failed to generate flashcards")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/file")
async def extract_text_from_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        text_content = ""
        with open(tmp_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text = page.extract_text()
                if text: text_content += text + "\n"
        os.unlink(tmp_path)
        return {"text": text_content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to extract text from file")

@app.post("/api/quiz/generate")
async def generate_quiz(request: QuizRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    try:
        prompt = f"""
        Generate {request.count} multiple choice questions based on the text below.
        Return ONLY a JSON array of objects with these keys: 
        "question": string, "options": array of 4 strings, "answer": string, "explanation": string
        Text: {request.text}
        """
        res = call_openai(prompt)
        if res:
            parsed = parse_json_res(res)
            if parsed:
                return {"questions": parsed}
        raise HTTPException(status_code=500, detail="AI failed to generate quiz")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-diagram")
async def generate_diagram(request: DiagramRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    try:
        prompt = f"""Analyze the text and convert it into a Mermaid.js {request.diagramType}. 
Return ONLY the mermaid code. 
IMPORTANT: To prevent syntax errors, ALWAYS wrap any text with spaces or special characters (like parentheses, colons, slashes) inside double quotes when defining node labels (e.g., A["Label (Extra Info)"] instead of A[Label (Extra Info)]).
Text: {request.text}"""
        res = call_openai(prompt)
        if res:
            code = res
            if code.startswith("```"):
                lines = code.split("\n")
                if lines[0].startswith("```"): lines = lines[1:]
                if lines and lines[-1].startswith("```"): lines = lines[:-1]
                code = "\n".join(lines)
            return {"code": code.strip()}
        raise HTTPException(status_code=500, detail="AI failed to generate diagram")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-infograph")
async def generate_infograph(request: InfographRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    try:
        prompt = f"""Analyze the provided text and convert it into a well-structured JSON object representing an infographic.
Identify the main topic, key concepts, and standard chronological or hierarchical facts that can be represented as an infographic.
Return ONLY valid JSON with no markdown wrapping. The JSON structure should ideally be:
{{
  "title": "Main Topic",
  "nodes": [
    {{"id": "1", "label": "Concept 1", "description": "Brief explanation"}},
    {{"id": "2", "label": "Concept 2", "description": "Brief explanation"}}
  ],
  "links": [
    {{"source": "1", "target": "2", "relation": "leads to"}}
  ]
}}
Text: {request.text}"""
        res = call_openai(prompt)
        if res:
            parsed = parse_json_res(res)
            if parsed:
                return parsed
        raise HTTPException(status_code=500, detail="AI failed to generate infograph JSON")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---- QUIZ RESULTS (SQLite Backed) ----

@app.post("/api/quiz/result")
async def save_quiz_result(request: QuizAttemptRequest):
    try:
        uid = request.uid or "default_user"
        accuracy = (request.score / request.total) * 100 if request.total > 0 else 0
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("""
            INSERT INTO quiz_attempts (uid, topic, score, total, accuracy)
            VALUES (?, ?, ?, ?, ?)
        """, (uid, request.topic, request.score, request.total, accuracy))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- MY LEARNING DASHBOARD ----

@app.post("/api/learning/roadmap")
async def generate_roadmap(request: RoadmapRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    prompt = f"""
    Generate a step-by-step weekly roadmap for: '{request.goal}'. Return ONLY a JSON array where each object has:
    - 'week': integer
    - 'focus': string
    - 'milestones': array of strings
    - 'resources': array of objects with 'type' (video or article), 'title', and 'query' (search keywords for YouTube/Library)
    """
    res = call_openai(prompt)
    if res:
        parsed = parse_json_res(res)
        if parsed:
            uid = request.uid or "default_user"
            conn = sqlite3.connect("learning_notes.db")
            cur = conn.cursor()
            cur.execute("INSERT OR REPLACE INTO roadmaps (uid, goal, data) VALUES (?, ?, ?)", 
                       (uid, request.goal, json.dumps(parsed)))
            conn.commit()
            conn.close()
            return {"roadmap": parsed}
    raise HTTPException(status_code=500, detail="AI failed to generate roadmap")

@app.post("/api/tutor/context")
async def save_tutor_context(request: TutorContextRequest):
    try:
        uid = request.uid or "default_user"
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO tutor_context (uid, material_text, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (uid, request.material_text))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Context saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tutor/context/{uid}")
async def get_tutor_context(uid: str):
    try:
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("SELECT material_text FROM tutor_context WHERE uid=?", (uid,))
        row = c.fetchone()
        conn.close()
        if row:
            return {"material_text": row[0]}
        return {"material_text": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/heygen-token")
async def generate_heygen_token():
    if not settings.liveavatar_api_key or not settings.liveavatar_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="LiveAvatar API Key not configured")
    try:
        payload = {
            "avatar_id": "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0",
            "context_id": "158f5d55-2d4f-11f1-8d28-066a7fa2e369",
            "is_sandbox": True
        }

        req = urllib.request.Request(
            "https://api.liveavatar.com/v2/embeddings",
            method="POST",
            headers={
                "X-API-KEY": settings.liveavatar_api_key.get_secret_value(),
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            },
            data=json.dumps(payload).encode()
        )

        with urllib.request.urlopen(req) as response:
            resp_data = json.loads(response.read().decode())
            embed_url = resp_data.get("data", {}).get("url")
            if not embed_url:
                raise Exception(f"No URL in response: {resp_data}")
            return {"url": embed_url}

    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"HEYGEN API ERROR ({e.code}): {error_body}")
        raise HTTPException(status_code=500, detail=f"HeyGen API Error: {error_body}")
    except Exception as e:
        print(f"HEYGEN TOKEN EXCEPTION: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tutor/chat")
async def tutor_chat(request: TutorChatRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    
    uid = request.uid or "default_user"
    context_text = ""
    try:
        conn = sqlite3.connect("learning_notes.db")
        c = conn.cursor()
        c.execute("SELECT material_text FROM tutor_context WHERE uid=? ORDER BY updated_at DESC LIMIT 1", (uid,))
        row = c.fetchone()
        conn.close()
        if row and row[0]:
            context_text = row[0]
            if len(context_text) > 10000:
                context_text = context_text[:10000] + "\n...[truncated]..."
    except: pass
    
    prompt = """You are a friendly, encouraging, and highly intelligent AI academic tutor. 
Keep your responses conversational, spoken-style, and concise (1-3 sentences max).
Do not use emojis or complex markdown formatting as your text will be spoken out loud by an avatar."""

    if context_text:
        prompt += f"\n\nThe student has provided this study material. Answer their question strictly based on it:\n{context_text}\n"
    
    prompt += f"\nStudent says: {request.message}"

    res = call_openai(prompt)
    if res:
        return {"reply": res}
            
    raise HTTPException(status_code=500, detail="Failed to get AI response")

@app.get("/api/learning/active-roadmap/{uid}")
async def get_active_roadmap(uid: str):
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    cur.execute("SELECT goal, data FROM roadmaps WHERE uid=?", (uid,))
    row = cur.fetchone()
    conn.close()
    if row:
        return {"goal": row[0], "roadmap": json.loads(row[1])}
    return {"goal": "", "roadmap": []}

@app.post("/api/learning/roadmap/quiz")
async def generate_roadmap_quiz(request: RoadmapQuizRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    prompt = f"""
    Create a 5-question multiple choice diagnostic quiz to test understanding of the following topic:
    Topic: {request.focus}
    Milestones: {', '.join(request.milestones)}
    
    Return ONLY a JSON array of objects with:
    "question": string, "options": array of 4 strings, "answer": string, "explanation": string
    """
    res = call_openai(prompt)
    if res:
        parsed = parse_json_res(res)
        if parsed:
            return {"questions": parsed}
    raise HTTPException(status_code=500, detail="Failed to generate quiz after multiple attempts")

@app.post("/api/learning/quick-notes")
async def quick_notes(request: QuickNotesRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    prompt = f"Provide simplified structural notes on '{request.subject}' aimed at a '{request.level}' skill level. Use markdown with clear headers and bullet points."
    try:
        res = call_openai(prompt)
        return {"notes": res if res else "Failed to generate notes"}
    except Exception as e:
        raise HTTPException(500, str(e))

# ---- MISSION TRACKING & PERFORMANCE ----

@app.get("/api/learning/missions/{uid}")
async def get_daily_missions(uid: str):
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    cur.execute("SELECT id, task, completed, score FROM daily_missions WHERE uid=? AND date=?", (uid, date_str))
    rows = cur.fetchall()
    conn.close()
    missions = [{"id": r[0], "task": r[1], "completed": bool(r[2]), "score": r[3]} for r in rows]
    return {"missions": missions}

@app.post("/api/learning/missions/sync")
async def sync_daily_missions(request: MissionSyncRequest):
    uid = request.uid or "default_user"
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    for task in request.tasks:
        try:
            cur.execute("INSERT OR IGNORE INTO daily_missions (uid, task, date) VALUES (?, ?, ?)", 
                       (uid, task, date_str))
        except: pass
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/learning/missions/complete")
async def complete_mission(request: MissionCompleteRequest):
    uid = request.uid or "default_user"
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    
    # If we have a task name, we can UPSERT (Insert or Update if exists)
    if request.task_text:
        cur.execute("""
            INSERT INTO daily_missions (uid, task, date, completed, score) 
            VALUES (?, ?, ?, 1, ?)
            ON CONFLICT(uid, task, date) 
            DO UPDATE SET completed=1, score=excluded.score
        """, (uid, request.task_text, date_str, request.score))
    # Fallback to ID-based update if we have a numeric ID
    elif isinstance(request.task_id, int) or (isinstance(request.task_id, str) and request.task_id.isdigit()):
        cur.execute("UPDATE daily_missions SET completed=1, score=? WHERE id=? AND uid=?", 
                   (request.score, int(request.task_id), uid))
    
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/learning/performance/{uid}")
async def get_performance(uid: str):
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    cur.execute("SELECT AVG(score) FROM daily_missions WHERE uid=? AND completed=1", (uid,))
    avg_score = cur.fetchone()[0] or 0
    cur.execute("SELECT COUNT(*) FROM daily_missions WHERE uid=? AND completed=1", (uid,))
    completed_count = cur.fetchone()[0] or 0
    conn.close()
    return {"averageScore": round(avg_score, 1), "completedCount": completed_count}

@app.post("/api/learning/daily-mission")
async def daily_mission(request: DailyMissionRequest):
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
    if request.topic and request.roadmap:
        prompt = f"The student is trying to master '{request.topic}'. Here is their roadmap: {json.dumps(request.roadmap)}. Suggest exactly 3 concrete daily interactive study tasks targeted at the earliest steps of this roadmap. Format as JSON array of exactly 3 concise strings."
    else:
        prompt = "Suggest 3 daily interactive study tasks for a student. Include at least 1 task about spaced repetition review, 1 quiz, and 1 reading goal. Format as JSON array of exactly 3 concise strings."
    
    res = call_openai(prompt)
    if res:
        parsed = parse_json_res(res)
        if parsed:
            return {"tasks": parsed}
    
    return {"tasks": ["Review 5 Spaced Repetition cards", "Complete 1 Quiz", "Read Notes on a New Topic"]}

# ---- NOTES (SQLite Backed) ----

@app.post("/api/learning/notes")
async def save_note(request: NoteSaveRequest):
    note_id = str(uuid.uuid4())
    uid = request.uid or "default_user"
    conn = sqlite3.connect("learning_notes.db")
    c = conn.cursor()
    try:
        c.execute("INSERT INTO notes (id, uid, subject, level, content) VALUES (?, ?, ?, ?, ?)",
                  (note_id, uid, request.subject, request.level, request.content))
        conn.commit()
        return {"id": note_id, "message": "Note saved successfully"}
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        conn.close()

@app.get("/api/learning/notes/{uid}")
async def get_notes(uid: str):
    conn = sqlite3.connect("learning_notes.db")
    c = conn.cursor()
    try:
        c.execute("SELECT id, subject, level, content, timestamp FROM notes WHERE uid=? ORDER BY timestamp DESC", (uid,))
        rows = c.fetchall()
        notes = [{"id": r[0], "subject": r[1], "level": r[2], "content": r[3], "timestamp": r[4]} for r in rows]
        return {"notes": notes}
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        conn.close()

@app.delete("/api/learning/notes/{note_id}")
async def delete_note(note_id: str):
    conn = sqlite3.connect("learning_notes.db")
    c = conn.cursor()
    try:
        c.execute("DELETE FROM notes WHERE id=?", (note_id,))
        conn.commit()
        return {"message": "Note deleted successfully"}
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        conn.close()


# ============================================================
# STUDENT HIGHLIGHTS & PERFORMANCE TRACKING (SQLite Backed)
# ============================================================

@app.get("/api/student/{uid}/highlights")
async def get_student_highlights(uid: str):
    """Aggregated performance snapshot for the student dashboard."""
    user_id = uid or "default_user"
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*), AVG(score) FROM daily_missions WHERE uid=? AND completed=1", (user_id,))
    row = cur.fetchone()
    completed_missions = row[0] or 0
    avg_mission_score  = round(row[1] or 0, 1)
    cur.execute("SELECT COUNT(*) FROM daily_missions WHERE uid=?", (user_id,))
    total_missions = cur.fetchone()[0] or 0
    cur.execute("SELECT task, score, date FROM daily_missions WHERE uid=? AND completed=1 ORDER BY date DESC LIMIT 5", (user_id,))
    recent_missions = [{"task": r[0], "score": r[1], "date": r[2]} for r in cur.fetchall()]

    # Fetch quiz attempts from SQLite
    cur.execute("SELECT topic, accuracy FROM quiz_attempts WHERE uid=? ORDER BY timestamp DESC LIMIT 20", (user_id,))
    quiz_rows = cur.fetchall()
    conn.close()

    topic_map: dict = {}
    total_acc = 0
    count = len(quiz_rows)
    for q_topic, q_acc in quiz_rows:
        topic = q_topic or "General"
        acc = q_acc or 0
        total_acc += acc
        if topic not in topic_map:
            topic_map[topic] = {"attempts": 0, "totalAcc": 0}
        topic_map[topic]["attempts"] += 1
        topic_map[topic]["totalAcc"] += acc

    quiz_stats = {
        "totalAttempts": count,
        "avgAccuracy": round(total_acc / count, 1) if count else 0,
        "topicBreakdown": [
            {"topic": t, "attempts": v["attempts"], "avgAccuracy": round(v["totalAcc"] / v["attempts"], 1)}
            for t, v in topic_map.items()
        ][:5]
    }

    user_stats = {"xp": 0, "level": 1, "streak": 0}
    composite = round((avg_mission_score * 0.5) + (quiz_stats["avgAccuracy"] * 0.5), 1)
    return {
        "missions": {
            "completed": completed_missions,
            "total": total_missions,
            "averageScore": avg_mission_score,
            "recent": recent_missions
        },
        "quizzes": quiz_stats,
        "user": user_stats,
        "overallScore": composite
    }


@app.get("/api/student/{uid}/test-results")
async def get_test_results(uid: str):
    """Full quiz + mission history with accuracy."""
    user_id = uid or "default_user"
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    cur.execute("SELECT id, topic, score, total, accuracy, timestamp FROM quiz_attempts WHERE uid=? ORDER BY timestamp DESC LIMIT 30", (user_id,))
    quiz_rows = cur.fetchall()
    results = [
        {
            "id": str(r[0]),
            "topic": r[1] or "General",
            "score": r[2],
            "total": r[3],
            "accuracy": round(r[4], 1) if r[4] is not None else 0.0,
            "timestamp": str(r[5]) if r[5] else None,
            "source": "quiz"
        }
        for r in quiz_rows
    ]

    cur.execute("SELECT task, score, date FROM daily_missions WHERE uid=? AND completed=1 ORDER BY date DESC LIMIT 20", (user_id,))
    mission_results = [
        {"id": f"mission-{i}", "topic": r[0], "score": r[1], "total": 100, "accuracy": float(r[1]), "timestamp": r[2], "source": "mission"}
        for i, r in enumerate(cur.fetchall())
    ]
    conn.close()
    return {"results": results, "missionResults": mission_results}


@app.get("/api/student/{uid}/achievements")
async def get_achievements(uid: str):
    """Compute achievements based on student activity."""
    user_id = uid or "default_user"
    conn = sqlite3.connect("learning_notes.db")
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM daily_missions WHERE uid=? AND completed=1", (user_id,))
    completed_missions = cur.fetchone()[0] or 0
    cur.execute("SELECT AVG(score) FROM daily_missions WHERE uid=? AND completed=1", (user_id,))
    avg_score = cur.fetchone()[0] or 0
    cur.execute("SELECT COUNT(*) FROM roadmaps WHERE uid=?", (user_id,))
    roadmap_count = cur.fetchone()[0] or 0

    cur.execute("SELECT COUNT(*), MAX(accuracy) FROM quiz_attempts WHERE uid=?", (user_id,))
    q_row = cur.fetchone()
    quiz_count = q_row[0] or 0
    max_quiz_acc = q_row[1] or 0
    high_score_quiz = max_quiz_acc >= 90
    conn.close()

    xp = 0
    streak = 0

    all_achievements = [
        {"id": "first_mission", "title": "First Step", "description": "Completed your first daily mission", "icon": "flag", "color": "emerald", "unlocked": completed_missions >= 1},
        {"id": "mission_5", "title": "Mission Adept", "description": "Completed 5 daily missions", "icon": "military_tech", "color": "blue", "unlocked": completed_missions >= 5},
        {"id": "mission_25", "title": "Mission Master", "description": "Completed 25 daily missions", "icon": "workspace_premium", "color": "purple", "unlocked": completed_missions >= 25},
        {"id": "quiz_first", "title": "Quiz Taker", "description": "Submitted your first quiz", "icon": "quiz", "color": "amber", "unlocked": quiz_count >= 1},
        {"id": "quiz_10", "title": "Quiz Veteran", "description": "Completed 10 quizzes", "icon": "school", "color": "indigo", "unlocked": quiz_count >= 10},
        {"id": "streak_3", "title": "On Fire", "description": "Maintained a 3-day study streak", "icon": "local_fire_department", "color": "orange", "unlocked": streak >= 3},
        {"id": "streak_7", "title": "Week Warrior", "description": "Maintained a 7-day study streak", "icon": "bolt", "color": "yellow", "unlocked": streak >= 7},
        {"id": "xp_100", "title": "XP Earner", "description": "Earned 100 XP points", "icon": "star", "color": "teal", "unlocked": xp >= 100},
        {"id": "xp_500", "title": "Scholar", "description": "Earned 500 XP points", "icon": "auto_awesome", "color": "violet", "unlocked": xp >= 500},
        {"id": "perfect_score", "title": "Perfectionist", "description": "Scored 90%+ on a quiz", "icon": "verified", "color": "green", "unlocked": high_score_quiz},
        {"id": "roadmap_creator", "title": "Pathfinder", "description": "Created your first learning roadmap", "icon": "map", "color": "cyan", "unlocked": roadmap_count >= 1},
        {"id": "high_avg", "title": "High Achiever", "description": "Maintained an average mission score above 80%", "icon": "trending_up", "color": "rose", "unlocked": avg_score >= 80 and completed_missions >= 3},
    ]

    unlocked = [a for a in all_achievements if a["unlocked"]]
    locked   = [a for a in all_achievements if not a["unlocked"]]
    return {"achievements": all_achievements, "unlocked": unlocked, "locked": locked, "totalUnlocked": len(unlocked), "totalAchievements": len(all_achievements)}


# ============================================================
# FLASHCARD SUMMARY GENERATOR (OpenAI Backed)
# ============================================================

@app.post("/api/flashcards/summarize")
async def summarize_flashcards(request: FlashcardSummarizeRequest):
    """Generate a structured summary from a set of flashcards."""
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise HTTPException(500, "OpenAI API missing")
    if not request.flashcards:
        raise HTTPException(400, "No flashcards provided")

    # Build a compact Q&A list for the prompt
    qa_text = "\n".join(
        f"Q: {card.get('question','')}\nA: {card.get('answer','')}"
        for card in request.flashcards[:30]
    )

    prompt = f"""You are an expert educator. Analyze the following flashcard set and produce a structured JSON summary.

Flashcard set:
{qa_text}

Return ONLY valid JSON (no markdown fences) with this exact structure:
{{
  "topic": "Short title for this flashcard set (max 8 words)",
  "overview": "2-3 sentence paragraph summarising what this flashcard set covers",
  "difficulty": "Beginner | Intermediate | Advanced",
  "keyConceptsSummary": [
    {{"concept": "Concept name", "summary": "One sentence explanation"}}
  ],
  "studyTips": ["Tip 1 for studying this material", "Tip 2", "Tip 3"],
  "totalCards": {len(request.flashcards)},
  "estimatedStudyTime": "X minutes"
}}
Produce 4-6 key concepts. Keep all text concise."""

    res = call_openai(prompt)
    if res:
        parsed = parse_json_res(res)
        if parsed:
            return {"summary": parsed}

    raise HTTPException(500, "Failed to generate summary from AI")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
