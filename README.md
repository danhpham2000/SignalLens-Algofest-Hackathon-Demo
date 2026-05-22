# SignalLens

SignalLens is a hackathon project for turning dense financial PDFs or screenshots into ranked, explainable risk signals. The app extracts text and tables, detects candidate metrics, scores anomalies with a visible formula, and presents the result in a short demo-friendly workflow with evidence, provenance, and an interactive graph.

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
4. Build a compare view from current versus prior periods where the document exposes them.
5. Run official-data verification where a supported public benchmark exists.
6. Generate explanations and a summary.
7. Show the strongest findings in a simplified results workspace with compare, trust, and graph investigation.

## Demo Experience

The current demo flow is optimized for a 2-5 minute presentation:

- Landing page with sample files and direct upload
- Step-by-step processing state
- Results page with a compact overview plus focused tabs for findings, compare, trust, and graph review
- Provenance viewer with page thumbnails, highlighted source regions, source type, and confidence
- Official-data verification with `verified`, `mismatch`, and `document-only` states
- Analyst brief export for one-click demo documentation
- Interactive graph plus canned, citation-first graph prompts

## Best Fintech Direction

If you want the project to feel like a real fintech product instead of a PDF summarizer, the strongest next features are:

1. Compare mode
   - Compare current vs prior quarter, filing, budget, or report page.
   - Label signals as new, worsening, resolved, or persistent.
   - This is the highest-value upgrade because analysts care about change, not just extraction.
2. Verification mode
   - Cross-check extracted claims against official public datasets and show `verified`, `mismatch`, or `document-only`.
   - Best follow-on sources for this repo are SEC EDGAR/XBRL, FDIC bank data, Treasury Fiscal Data, and FRED.
3. Monitoring mode
   - Save runs, track the same issuer or agency across time, and surface watchlist alerts.
   - Postgres and Neo4j make this possible without changing the core ingestion flow.
4. Benchmark mode
   - Show whether a finding is unusual versus sector, peer, or macro context.
   - Examples: debt trend versus Treasury data, bank ratios versus FDIC data, or funding conditions versus FRED series.

These are the features most likely to strengthen the hackathon pitch because they align with how finance teams actually review risk: prove the claim, compare over time, and put the number in context.

## Architecture

```text
Next.js Frontend
  app/page.tsx
  app/results/[id]/page.tsx
  components/Hero.tsx
  components/ResultsWorkspace.tsx
  components/ComparePanel.tsx
  components/GraphPanel.tsx
  components/ProvenanceViewer.tsx
  components/VerificationPanel.tsx
  components/AskGraphPanel.tsx
  components/ExportBriefButton.tsx
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
- `GET /result/{document_id}/pages/{page_number}/preview` returns a rendered PNG page preview for provenance review.
- `GET /graph/{document_id}` returns graph nodes and edges for visualization.

### Frontend Flow

- `frontend/components/Hero.tsx` drives the landing page and upload/sample launch flow.
- `frontend/lib/api.ts` runs the backend pipeline and transforms backend payloads into frontend-friendly result objects.
- `frontend/components/ResultsWorkspace.tsx` renders the simplified tabbed review workspace.
- `frontend/components/ComparePanel.tsx` renders compact period-over-period comparisons.
- `frontend/components/ProvenanceViewer.tsx` renders evidence thumbnails with highlighted source regions.
- `frontend/components/VerificationPanel.tsx` renders official-source verification checks.
- `frontend/components/GraphPanel.tsx` renders the interactive investigation graph.

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
   - overview
   - findings tab
   - evidence tab with provenance
   - graph tab with prompts and relationships

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

- `us-financial-report-2025-executive-summary-excerpt.pdf`
- `california-2025-26-summary-chart-image.png`
- `us-financial-report-2025-page-9.png`

These support one PDF path plus image and chart-image demo paths using real
public financial and spending data, with the PDF sample limited to 10 pages or
fewer.

## Notes

- If `DATABASE_URL` is not set, the backend still works using in-memory storage.
- If Neo4j is not configured, graph sync is skipped and the app still renders a usable graph payload.
- If Tesseract is unavailable, image OCR can fall back to OpenAI vision when `OPENAI_API_KEY` is set.
- The project is optimized for single-document interactive demos, not production batch processing.

## Recommended Demo Configuration

For the strongest demo and best path toward a fintech-style product, run with:

- OpenAI enabled for grounded explanations
- Postgres / Neon enabled for persisted runs and future watchlists
- Neo4j enabled for graph sync and multi-document relationship views
- The current default ports:
  - frontend: `http://127.0.0.1:3000`
  - backend: `http://127.0.0.1:8000`

With that setup, the current repo already demonstrates:

- deterministic scoring
- evidence-backed provenance
- analyst-brief export
- graph-based investigation
- database-ready persistence

The next meaningful product step is not more extraction. It is adding time-series comparison and official-data verification on top of the existing pipeline.

## Additional Docs

- [backend/README.md](./backend/README.md)
