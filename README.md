# 🧬 Aivoa CRM — HCP Interaction Module
### Full Stack Developer – AI Applications | Round 1 Technical Assignment

> An AI-First CRM system for pharma field representatives to log Healthcare Professional (HCP) interactions via a structured form **or** a conversational AI chat interface powered by LangGraph + Google Gemini LLM.

---

## 🎥 Video Demo
> *(Add your Loom/Drive video link here after recording)*

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | UI framework |
| State Management | Redux Toolkit | Global state, async API calls |
| Backend | Python + FastAPI | REST API server |
| AI Agent Framework | LangGraph | Stateful multi-tool agent |
| LLM | Google Gemini 1.5 Flash | Data extraction, suggestions, sentiment |
| Database | PostgreSQL + SQLAlchemy | Persistent storage |
| Font | Google Inter | Typography |

> **Note on LLM Choice:** The assignment originally specified Groq (gemma2-9b-it). That model was decommissioned by Groq during development. The llama-3.3-70b-versatile fallback on Groq free tier hit hard token limits (100k TPD) that made the LangGraph agent (which makes multiple LLM calls per request) non-functional. As a practical engineering decision, Google Gemini 1.5 Flash was adopted — it is also free tier, has a 1M token/day limit, and the entire LangGraph agent architecture remains exactly as required by the assignment.

---

## 🤖 LangGraph Agent Architecture

The LangGraph agent is a **stateful graph-based AI system** that processes user messages and decides which tools to call automatically.

```
User Chat Message
      │
      ▼
┌─────────────┐
│  agent_node │  ← LLM reads message + decides which tool to call
└──────┬──────┘
       │
       ▼ (tool needed?)
┌─────────────┐
│  tool_node  │  ← Executes the chosen tool
└──────┬──────┘
       │
       ▼ (loop back)
┌─────────────┐
│  agent_node │  ← LLM processes tool result, decides next action
└──────┬──────┘
       │
       ▼ (done?)
    END / Response
```

### 5 LangGraph Tools

| # | Tool | What it does |
|---|------|-------------|
| 1 | `log_interaction` | Sends text to LLM → extracts interaction_type, topics, sentiment, outcomes, follow_up_actions, materials_shared as structured JSON |
| 2 | `edit_interaction` | Validates field name, prepares update payload for a logged interaction |
| 3 | `fetch_hcp_details` | Signals the API to search the HCP table by name |
| 4 | `suggest_followups` | Sends topics + sentiment to LLM → returns 3 specific actionable follow-up suggestions |
| 5 | `analyze_sentiment` | Deep sentiment analysis with confidence score, key signals, and summary |

---

## 📁 Project Structure

```
aivoa-crm/
│
├── backend/
│   ├── main.py                       # FastAPI app, CORS, router
│   ├── .env                          # API keys (not committed to Git)
│   └── app/
│       ├── database.py               # SQLAlchemy engine + session
│       ├── models/models.py          # HCP and Interaction DB tables
│       ├── schemas/schemas.py        # Pydantic validators
│       ├── agent/crm_agent.py        # LangGraph agent + 5 tools
│       └── api/routes.py             # All REST endpoints
│
└── frontend/
    └── src/
        ├── App.js                    # Root component + layout
        ├── App.css                   # All styles
        ├── index.js                  # React entry point
        ├── store/store.js            # Redux store + thunks
        ├── api/apiService.js         # Backend API calls
        └── components/
            ├── LogInteractionForm.js # Structured form
            ├── ChatInterface.js      # AI chat UI
            └── InteractionsList.js  # Logged interactions panel
```

---

## 🚀 Setup & Run Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL running locally
- Google Gemini API Key → [aistudio.google.com](https://aistudio.google.com)

### Step 1 — Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/aivoa-crm.git
cd aivoa-crm
```

### Step 2 — Create PostgreSQL Database
```sql
CREATE DATABASE aivoa_crm;
```

### Step 3 — Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate

pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv langgraph langchain-google-genai langchain-core pydantic
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/aivoa_crm
GEMINI_API_KEY=your_gemini_api_key_here
```

Start backend:
```bash
uvicorn main:app --reload
```

✅ API runs at: **http://localhost:8000**
✅ Swagger docs: **http://localhost:8000/docs**

### Step 4 — Seed Sample HCPs
Open http://localhost:8000/docs → POST /api/hcps/ → Try it out:
```json
{"name": "Dr. Priya Sharma", "specialty": "Oncology", "hospital": "Apollo Hospital"}
{"name": "Dr. Rahul Patel", "specialty": "Cardiology", "hospital": "Fortis Hospital"}
```

### Step 5 — Frontend Setup
```bash
cd ../frontend
npm install
npm start
```

✅ App runs at: **http://localhost:3000**

---

## ✅ Features

- **Dual input** — Structured form OR AI chat
- **AI extraction** — Type naturally, AI fills all form fields
- **5 LangGraph tools** — log, edit, fetch, suggest, analyze
- **AI follow-up suggestions** — 3 auto-generated after every interaction
- **Sentiment detection** — Positive / Neutral / Negative with confidence
- **Full CRUD** — Create, Read, Update, Delete interactions
- **PostgreSQL persistence** — All data saved permanently

---

## 🔌 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/hcps/` | Get all HCPs |
| POST | `/api/hcps/` | Create new HCP |
| GET | `/api/hcps/search/{name}` | Search HCP by name |
| GET | `/api/interactions/` | Get all interactions |
| POST | `/api/interactions/` | Log new interaction |
| PUT | `/api/interactions/{id}` | Update interaction |
| DELETE | `/api/interactions/{id}` | Delete interaction |
| POST | `/api/chat/` | Send message to AI agent |

---

## 👨‍💻 Author
**Sharath S**
Full Stack Developer – AI Applications Assignment
Submitted via: [Google Form](https://forms.gle/g76jGd47P8T86gQ69)
