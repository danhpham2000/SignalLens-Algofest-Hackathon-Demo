# SignalLens Backend

SignalLens is a FastAPI backend for a hackathon MVP that takes one financial PDF or screenshot, extracts text and candidate metrics, ranks anomalies with deterministic scoring, and returns grounded explanations plus evidence references.

## What It Does

- Accepts `pdf`, `png`, `jpg`, `jpeg`, and `webp` uploads
- Extracts text blocks and table-like content from PDFs with PyMuPDF and pdfplumber
- Runs OCR for image inputs and scanned pages with Tesseract when available
- Falls back to OpenAI vision OCR when Tesseract is unavailable and `OPENAI_API_KEY` is set
- Detects candidate financial metrics from text/table content
- Scores anomalies with a visible composite formula
- Generates concise explanations and an executive summary
- Exposes a lightweight graph payload, read-only Cypher query endpoint, and optional Neo4j sync
- Persists documents, results, and retrieved RAG segments into Neon/Postgres when `DATABASE_URL` is set

## Architecture

The backend is intentionally simple:

1. `POST /upload` stores a file in `temp/uploads` and creates an in-memory document record.
2. `POST /extract` parses the file into chunks, metrics, and extraction metadata.
3. `POST /analyze` ranks findings deterministically from the extracted metrics and evidence.
4. `POST /explain` adds explanations and an executive summary, using OpenAI when available and a rule-based fallback otherwise.
5. `GET /result/{document_id}` returns the combined payload the frontend can render directly.

The app still keeps an in-memory cache for speed, but it now persists runs into Postgres when `DATABASE_URL` is configured. Neo4j sync/query is optional and best-effort.

## API

### `POST /upload`

Multipart form upload with field `file`.

Returns:

```json
{
  "document": {
    "id": "doc_id",
    "file_name": "report.pdf",
    "file_type": "pdf",
    "status": "uploaded"
  }
}
```

### `POST /extract`

```json
{
  "document_id": "doc_id"
}
```

Returns extracted chunks, metrics, table count, and extraction warnings.

### `POST /analyze`

```json
{
  "document_id": "doc_id"
}
```

Returns ranked findings with:

- `severity_score`
- `confidence_score`
- `final_score`
- `score_breakdown`
- `evidence_ids`

### `POST /explain`

```json
{
  "document_id": "doc_id"
}
```

Returns the full result payload with explanations and summary.

### `GET /result/{document_id}`

Returns the combined result. By default it will finish missing pipeline steps automatically.

Optional query param:

- `ensure_complete=true|false`

### Extra Endpoints

- `GET /health`
- `GET /demo/overview`
- `GET /demo/database`
- `GET /demo/rag/{document_id}`
- `GET /graph/{document_id}`
- `GET /graph/{document_id}/findings`
- `POST /graph/{document_id}/sync`
- `POST /graph/query`

## Scoring Logic

Findings use a visible composite score:

```text
final_score = change_score + severity_score + evidence_score + keyword_score - uncertainty_penalty
```

Main factors:

- Magnitude of change versus nearby values or prior period
- Threshold breach severity for risky metric types
- Evidence strength from table/text support
- Risk-keyword boost from nearby context
- Extraction uncertainty penalty for OCR-heavy or weak evidence

## OpenAI + LangChain RAG

The explanation layer now uses a real LangChain retrieval flow:

- extracted chunks are split with LangChain `RecursiveCharacterTextSplitter`
- segments are embedded with `OpenAIEmbeddings`
- an in-memory LangChain `InMemoryVectorStore` retrieves the most relevant evidence per finding
- retrieved evidence segments are written into `signallens_rag_segments` in Postgres for demo/debugging
- OpenAI is asked to explain findings using only that retrieved evidence
- if embeddings or OpenAI are unavailable, the backend falls back to deterministic lexical retrieval and template explanations

## Environment Variables

Use `.env`:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_TIMEOUT_SECONDS=20
NEO4J_URI=
NEO4J_USER=
NEO4J_PASSWORD=
DATABASE_URL=
NEO4J_TIMEOUT_SECONDS=4
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MAX_UPLOAD_MB=15
MAX_FINDINGS=5
```

Notes:

- Postgres tables created automatically on startup:
  - `signallens_documents`
  - `signallens_results`
  - `signallens_rag_segments`
- Neo4j is optional. If configured, `POST /graph/{document_id}/sync` will push documents, chunks, metrics, and findings, and `POST /graph/query` can run read-only Cypher.
- Use an explicit `NEO4J_URI` if possible. Inferring the URI from `NEO4J_CLIENT_ID` is not reliable for Aura setups.

## Run Locally

```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Then open:

- API root: `http://127.0.0.1:8000/`
- Swagger docs: `http://127.0.0.1:8000/docs`

## MVP Constraints

- Uploaded files still live on local disk, but documents/results now persist in Postgres
- OCR quality depends on either local Tesseract or OpenAI vision availability
- Metric extraction is heuristic, tuned for hackathon demos rather than every financial format
- The backend is optimized for one-document interactive analysis, not batch pipelines
