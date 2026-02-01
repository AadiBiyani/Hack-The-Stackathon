# MatchPoint Gateway (Vercel AI SDK)

TypeScript/Next.js gateway that runs the matching agent using the Vercel AI SDK (bash-tool + OpenAI). It calls the Python FastAPI backend for patient/trials data and posts match results back.

## Setup

1. Copy `.env.example` to `.env.local` and set:
   - `BACKEND_URL` – Python backend base URL (e.g. `http://localhost:8000`)
   - `OPENAI_API_KEY` – Your OpenAI API key ([get one here](https://platform.openai.com/api-keys))
   - `OPENAI_MODEL` – (optional) Model ID, default `gpt-4o`

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

3. Ensure the Python backend is running and has:
   - At least one patient (with `condition` set)
   - Trials for that condition (run crawl first: `POST /api/trials/crawl`)

## API

- **POST /api/match**  
  Body: `{ "patient_id": "<patient_id>" }`  
  Fetches patient and trials filesystem from the backend, runs the agent (bash-tool over trial markdown), parses top 3 matches, and posts them to `POST /api/matches` on the backend (storage + optional Resend email).

## Deployment (Vercel)

- Set env vars: `BACKEND_URL`, `OPENAI_API_KEY`, optionally `OPENAI_MODEL`
- Ensure the Python backend allows CORS from your Vercel origin
