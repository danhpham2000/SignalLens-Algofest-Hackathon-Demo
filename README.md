# SignalLens

SignalLens is a hackathon project for turning dense financial PDFs or screenshots into ranked, explainable risk signals. The app extracts text and tables, detects candidate metrics, scores anomalies with a visible formula, and presents the result in a short demo-friendly workflow with evidence and a simple graph.

## Problem

Financial review is slow because important signals are buried across tables, commentary, and appendices. Analysts and judges do not just need alerts. They need to understand:

- what changed
- why it matters
- what evidence supports it
- how related facts connect across the document

## Solution

SignalLens provides a lightweight end-to-end flow:

1. Upload a PDF or screenshot.
2. Extract text, tables, metrics, periods, and supporting chunks.
3. Rank anomalies with deterministic scoring.
4. Generate explanations and a summary.
5. Show the strongest findings in a simple results UI with evidence and a readable graph preview.

## Demo Experience

The current demo flow is optimized for a 2-5 minute presentation:

- Landing page with sample files and direct upload
- Step-by-step processing state
- Results page with a compact summary, top findings, focused review, and supporting evidence
- Simple graph preview with readable spacing, edge labels, and relationship direction

## Architecture

```text
Next.js Frontend
  app/page.tsx
  app/results/[id]/page.tsx
  components/Hero.tsx
  components/ResultsWorkspace.tsx
  components/SimpleGraphPreview.tsx
  lib/api.ts
        |
        v
FastAPI Backend
  /upload
  /extract
  /analyze
  /explain
  /result/{document_id}
  /graph/{document_id}
        |
        v
Services
  extraction_service.py
  analysis_service.py
  explanation_service.py
  graph_service.py
  storage_service.py
        |
        v
Optional Integrations
  OpenAI
  Postgres / Neon
  Neo4j
```

### Backend Flow

- `POST /upload` stores the file and creates a document record.
- `POST /extract` parses chunks, tables, and candidate metrics.
- `POST /analyze` computes ranked findings with deterministic scoring.
- `POST /explain` adds summary and grounded explanations.
- `GET /result/{document_id}` returns the full payload for the frontend.
- `GET /graph/{document_id}` returns graph nodes and edges for visualization.

### Frontend Flow

- `frontend/components/Hero.tsx` drives the landing page and upload/sample launch flow.
- `frontend/lib/api.ts` runs the backend pipeline and transforms backend payloads into frontend-friendly result objects.
- `frontend/components/ResultsWorkspace.tsx` renders the simplified demo view.
- `frontend/components/SimpleGraphPreview.tsx` renders the focused graph with directional labeled edges.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- Backend: FastAPI, Python, PyMuPDF, pdfplumber, pytesseract, pandas
- AI and retrieval: OpenAI, LangChain, OpenAI embeddings
- Persistence: Postgres / Neon
- Graph: Neo4j

## Repository Structure

```text
backend/              FastAPI app, services, routers, models
frontend/             Next.js app, components, demo UI
README.md             Project documentation and setup
```

## Quick Start

### Prerequisites

- Python 3 with `venv`
- A recent Node.js LTS release with `npm`
- Optional: Tesseract OCR for local image OCR
- Optional: OpenAI API key for LLM explanations and vision fallback
- Optional: Postgres and Neo4j for persistence and graph sync

### 1. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

- API root: `http://127.0.0.1:8000/`
- Swagger docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend URL:

- App: `http://127.0.0.1:3000/`

### 3. Run the Demo

1. Open `http://127.0.0.1:3000/`
2. Choose a sample file or upload your own PDF, PNG, or JPG
3. Let the pipeline run through extraction, graph building, ranking, and explanation
4. Walk through the results page:
   - summary
   - top findings
   - focused review
   - simple graph with directional relationships

## Environment Variables

### Backend: `backend/.env`

Use `backend/.env.example` as the starting point.

Core variables:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_TIMEOUT_SECONDS=20

DATABASE_URL=

NEO4J_URI=
NEO4J_USER=
NEO4J_PASSWORD=
NEO4J_TIMEOUT_SECONDS=4

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ORIGIN_REGEX=https://.*\\.vercel\\.app
MAX_UPLOAD_MB=10
MAX_FINDINGS=5
```

### Frontend: `frontend/.env.local`

Use `frontend/.env.local.example` as the starting point.

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Main API Endpoints

- `GET /health`
- `POST /upload`
- `POST /extract`
- `POST /analyze`
- `POST /explain`
- `GET /result/{document_id}`
- `GET /graph/{document_id}`
- `POST /graph/{document_id}/sync`
- `POST /graph/query`

## Sample Files

The frontend ships with demo assets in `frontend/public/samples/`:

- `acme-q1-2025.pdf`
- `us-financial-report-2025-page-9.png`

These support both PDF and image-based demo paths.

## Notes

- If `DATABASE_URL` is not set, the backend still works using in-memory storage.
- If Neo4j is not configured, graph sync is skipped and the app still renders a usable graph payload.
- If Tesseract is unavailable, image OCR can fall back to OpenAI vision when `OPENAI_API_KEY` is set.
- The project is optimized for single-document interactive demos, not production batch processing.

## Additional Docs

- [backend/README.md](./backend/README.md)
