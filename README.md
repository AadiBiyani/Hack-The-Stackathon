# MatchPoint

**AI-powered clinical trial matching for patients and healthcare providers.**

MatchPoint connects patients with life-changing clinical trials by using GPT-4o to analyze patient profiles against trial eligibility criteria. Built for the Hack the Stackathon.

---

## What It Does

1. **Register Patients** — Create patient profiles with condition, demographics, lab values, treatment history, and medical history
2. **Build Trial Knowledge Base** — Crawl ClinicalTrials.gov for trials by condition, with optional Firecrawl enrichment for detailed eligibility criteria
3. **AI Matching** — An AI agent uses bash-tool to navigate trial markdown files and returns the top 3 matches with scores and reasoning
4. **Notifications** — Email alerts to patients and doctors when matches are found (via Resend)

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React, Tailwind CSS, Vercel AI SDK, bash-tool |
| **AI** | OpenAI GPT-4o, ToolLoopAgent with filesystem navigation |
| **Backend** | FastAPI, Python 3.12 |
| **Database** | MongoDB Atlas |
| **Data Sources** | ClinicalTrials.gov API, Firecrawl |
| **Email** | Resend |
| **Deployment** | Railway (backend), Vercel (frontend) |

---

## Project Structure

```
├── frontend/           # Next.js app
│   ├── src/app/        # Pages & API routes
│   │   ├── api/match/  # POST /api/match – AI matching endpoint
│   │   ├── dashboard/  # Dashboard with stats, knowledge base controls
│   │   └── patients/   # Patient list, detail, edit, match
│   └── src/components/ # UI components
├── backend/            # FastAPI app
│   ├── app/
│   │   ├── routes/     # trials, patients, matches APIs
│   │   ├── services/   # MongoDB, crawler, Firecrawl, ClinicalTrials.gov
│   │   └── models/     # Pydantic schemas
│   └── requirements.txt
└── railway.json        # Railway deployment config
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- MongoDB Atlas account
- OpenAI API key

### 1. Clone and install

```bash
git clone <repo-url>
cd "Hack The Stackathon"

# Frontend
cd frontend && npm install

# Backend
cd ../backend && python -m venv venv
source venv/bin/activate   # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### 2. Environment variables

**Backend** (`backend/.env`):

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/clinical_trials?retryWrites=true&w=majority
FIRECRAWL_API_KEY=fc-your-key          # Optional – for trial enrichment
RESEND_API_KEY=re_your-key             # Optional – for email notifications
RESEND_FROM_EMAIL=onboarding@resend.dev
PORT=8000
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
```

### 3. Run locally

```bash
# Terminal 1 – Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 – Frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

---

## Key Features

- **Patient management** — Add, view, edit patients with full clinical profiles (demographics, labs, vitals, treatments, exclusions)
- **Trial knowledge base** — Crawl trials by condition; deduplicate; optionally enrich with Firecrawl
- **AI matching** — Agent browses trial markdown via bash-tool, returns top 3 matches with scores (0–100) and reasoning
- **Streaming reasoning** — Live view of the agent’s thinking during matching
- **Email notifications** — Resend emails to patients and doctors with match summaries
- **Accurate counts** — `/api/trials/stats` for real-time patient, trial, and match counts

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patients` | GET, POST | List and create patients |
| `/api/patients/{id}` | GET, PUT, DELETE | Get, update, delete patient |
| `/api/trials` | GET | List trials (filter by condition) |
| `/api/trials/stats` | GET | Patient, trial, match counts |
| `/api/trials/crawl` | POST | Crawl trials for a condition |
| `/api/trials/crawl/bulk` | POST | Bulk crawl for all patient conditions |
| `/api/trials/crawl-index` | DELETE | Clear crawl index (force re-crawl) |
| `/api/matches` | GET, POST | List and store matches |

---

## How Matching Works

1. User clicks **Find Matches** on a patient’s page.
2. Frontend calls `POST /api/match` with `patient_id`.
3. Next.js API route:
   - Fetches patient from backend
   - Fetches trial markdown filesystem from backend
   - Runs ToolLoopAgent (bash-tool + OpenAI) with the patient profile
   - Extracts top 3 matches from the agent’s JSON output
4. Matches are sent to backend `POST /api/matches` and stored in MongoDB.
5. Backend optionally sends Resend email to the patient and doctor.

---

## Deployment

- **Backend** — Railway (Python/FastAPI, MongoDB connection)
- **Frontend** — Vercel (Next.js)

Configure `NEXT_PUBLIC_BACKEND_URL` in the frontend to point to the deployed backend URL.

---

## License

Built for Hack the Stackathon.
