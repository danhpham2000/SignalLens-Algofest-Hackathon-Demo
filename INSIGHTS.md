# SignalLens Insights

## Product Thesis

SignalLens matters because financial review teams do not only need extraction. They need:

- fast change detection
- evidence they can trust
- official-source cross-checks
- a short path from document to decision

That is why the strongest version of this project is not "AI for PDFs." It is `explainable financial change detection with official-data verification`.

## Why This Matters In Finance

### 1. Model outputs must be explainable and governable

Financial institutions are under pressure to manage model risk, validation, monitoring, and vendor dependence more explicitly. That makes a black-box summarizer weak. SignalLens is stronger when it shows:

- deterministic scoring
- provenance and page-level proof
- explicit confidence
- documented verification against public data

Why users need it:

- risk teams need to defend outputs internally
- finance teams need something faster than manual review, but safer than unaudited GenAI text
- judges will trust visible evidence more than narrative claims

### 2. Official public data is a competitive advantage, not just a data source

The best fintech workflows increasingly treat regulation and public reporting as a feature, not a burden. SignalLens can use official datasets to prove that a finding is grounded in:

- SEC filings and XBRL
- Treasury fiscal data
- FDIC bank data
- other public benchmarks

Why users need it:

- analysts want a faster first pass without losing source integrity
- product teams can show `verified`, `mismatch`, and `document-only` instead of pretending every extracted number is equally trustworthy
- this gives the product a real differentiator versus generic document chat

### 3. Finance teams care about change over time

A single filing or report page is useful, but decision-makers usually ask:

- what changed vs last quarter
- what worsened
- what improved
- what requires follow-up now

That is why `compare mode` is one of the highest-value features in the repo. It converts a static report review into a signal review workflow.

## Features In This Project And Why They Matter

### Compare Mode

What it does now:

- builds a compact current-vs-prior comparison from metrics the document already exposes
- labels movements as worsening, improving, or stable
- shows the values and period labels in one place

Why it matters:

- finance teams review movement, not just absolute values
- it creates a natural demo story: "here is what changed, here is the evidence, here is why it matters"
- it is the fastest way to make the product feel like an analyst tool

### Official-Data Verification

What it does now:

- classifies supported documents
- links them to official sources
- runs a live Treasury verification check for the Treasury sample
- returns explicit statuses:
  - `verified`
  - `mismatch`
  - `document-only`

Why it matters:

- trust is the main weakness of raw document AI
- official-source checks reduce hallucination risk
- even when exact verification is not available, document-level traceability is still valuable

### Provenance Viewer

What it does now:

- shows exact page preview
- overlays the highlighted region when bounding boxes exist
- shows source type such as PDF text, table, OCR, or image

Why it matters:

- finance users need to inspect the underlying proof quickly
- this reduces back-and-forth between summary and source document
- it supports manual validation, which is still essential in higher-stakes workflows

### Deterministic Scoring

What it does now:

- scores anomalies with visible components instead of hiding everything in a single model output

Why it matters:

- transparent scoring is easier to explain to judges and users
- it reduces the "magic" feeling that makes financial AI tools hard to trust
- it gives a strong fallback when LLM explanation quality varies

### Graph Investigation

What it does now:

- links findings, metrics, chunks, and related nodes
- supports focused exploration and canned graph prompts

Why it matters:

- financial signals are often relational, not isolated
- graph views help users trace a finding back through evidence and connected facts
- this is a better fit than a generic chatbot because the user stays anchored to a structured artifact

### Analyst Brief Export

What it does now:

- exports a short memo with top findings, evidence, confidence, compare output, and verification

Why it matters:

- finance teams often need to hand off review output quickly
- hackathon judges also reward documentation and demo clarity
- this makes the product feel operational, not just exploratory

### Multi-Format Ingestion

What it does now:

- handles PDF, image, and chart-image inputs

Why it matters:

- real financial workflows include screenshots, excerpts, scanned pages, and charts
- supporting only clean PDFs would make the product feel less realistic

## Strongest Near-Term Expansion

If more time remains, the highest-return next steps are:

1. Baseline-document compare
   - compare one run to the prior saved run for the same issuer or agency
   - use Postgres persistence and Neo4j relationships to build history

2. Broader official verification
   - SEC/XBRL for public companies
   - FDIC financials for banks
   - more Treasury datasets for deficit, receipts, and outlays

3. Watchlists and monitoring
   - save issuers or agencies
   - trigger alerts when a known metric worsens or a new signal appears

## Why Judges Should Care

SignalLens is not trying to replace analysts. It is trying to compress the slowest part of review:

- finding the signal
- proving the signal
- comparing it to prior context
- packaging it for action

That is a credible fintech workflow.

## Sources

- [OCC Bulletin 2026-13, Model Risk Management: Revised Guidance](https://www.occ.treas.gov/news-issuances/bulletins/2026/bulletin-2026-13.html)
- [SEC EDGAR APIs](https://www.sec.gov/edgar/sec-api-documentation)
- [FDIC Open Data](https://www.fdic.gov/about/open-data-fdic)
- [FDIC Data Downloads](https://www.fdic.gov/bank-data-guide/data-downloads)
- [Treasury Fiscal Data](https://fiscaldata.treasury.gov/)
- [FRED API](https://fred.stlouisfed.org/docs/api/fred/)
- [CFPB Personal Financial Data Rights resources](https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/personal-financial-data-rights/)
- [McKinsey: The next age of fintech](https://www.mckinsey.com/industries/financial-services/our-insights/the-next-age-of-fintech-ai-digital-assets-and-new-paths-to-success)
