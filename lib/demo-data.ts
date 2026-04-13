import {
  type ProcessingStep,
  type ResultResponse,
  type SampleFile,
} from "@/lib/types"

export const DEFAULT_RESULT_ID = "apollo-q4-report"

export const PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: "extract",
    label: "Extracting text and tables",
    description:
      "Pulling page structure, table rows, captions, and numeric values.",
  },
  {
    id: "entities",
    label: "Identifying entities and metrics",
    description:
      "Normalizing periods, counterparties, KPI names, and supporting sections.",
  },
  {
    id: "graph",
    label: "Building graph",
    description:
      "Linking facts across the document into a connected evidence graph.",
  },
  {
    id: "anomalies",
    label: "Ranking anomalies",
    description:
      "Applying deterministic scoring across change, graph risk, and evidence strength.",
  },
  {
    id: "explain",
    label: "Generating explanation",
    description:
      "Preparing the judge-facing summary and business impact narrative.",
  },
]

export const sampleFiles: SampleFile[] = [
  {
    id: "earnings-report",
    name: "ACME Corp Q1 2025 Financial Summary",

    filename: "acme-q1-2025.pdf",
    fileType: "pdf",
    focus: "Anomaly-rich demo PDF",
    resultId: "apollo-q4-report",
    viewHref: "/samples/acme-q1-2025.pdf",
    viewLabel: "View PDF",
  },
  {
    id: "kpi-dashboard",
    name: "Executive summary image",
    // description:
    //   "PNG rendered from a real page of the official Treasury financial report.",
    filename: "us-financial-report-2025-page-9.png",
    fileType: "png",
    focus: "Real public image",
    resultId: "apollo-q4-report",
    viewHref: "/samples/us-financial-report-2025-page-9.png",
    viewLabel: "View image",
    sourceHref:
      "https://fiscal.treasury.gov/system/files/2026-03/FY-2025-Financial-Report-3-19-2025%28Final%29.pdf",
  },
  {
    id: "executive-summary-jpg",
    name: "Executive summary JPG",
    // description:
    //   "JPEG version of the same real Treasury page for quick image-upload testing.",
    filename: "us-financial-report-2025-page-9.jpg",
    fileType: "jpg",
    focus: "Real public JPG",
    resultId: "apollo-q4-report",
    viewHref: "/samples/us-financial-report-2025-page-9.jpg",
    viewLabel: "View JPG",
    sourceHref:
      "https://fiscal.treasury.gov/system/files/2026-03/FY-2025-Financial-Report-3-19-2025%28Final%29.pdf",
  },
]

const demoResults: Record<string, ResultResponse> = {
  "apollo-q4-report": {
    id: "apollo-q4-report",
    filename: "apollo_q4_report.pdf",
    documentType: "Quarterly report PDF",
    lastUpdated: "April 11, 2026",
    scoreFormula:
      "final_score = change_score + severity_score + graph_risk_score + evidence_score - uncertainty_penalty",
    summary: {
      title: "Apollo Ventures Q4 signal snapshot",
      headline:
        "Three linked anomalies stand out across revenue compression, spend acceleration, and vendor reuse.",
      overview:
        "SignalLens connected the financial table, management commentary, and vendor references into a single graph. The strongest risk pattern is not a single metric drop; it is the combination of falling revenue, rising marketing spend, and a repeated counterparty referenced in the same period.",
      keyTakeaways: [
        "Revenue fell from $5.0M to $4.1M quarter over quarter in the core subscription line.",
        "Marketing expense grew 27% in the same period, outpacing sales movement and compressing efficiency.",
        "Nova Holdings appears in both the vendor note and a high-value transaction appendix.",
      ],
    },
    stats: {
      totalFindings: 4,
      highRiskCount: 3,
      entityCount: 12,
      relationshipCount: 16,
      confidenceScore: 84,
    },
    findings: [
      {
        id: "rev-drop",
        title: "Revenue decline anomaly",
        category: "metric",
        severity: "high",
        confidence: 0.91,
        explanation:
          "Revenue dropped from $5.0M to $4.1M in the latest period, a materially sharper movement than adjacent metrics and prior-quarter commentary suggested.",
        impact:
          "The primary growth engine weakened while fixed operating commitments remained elevated.",
        metricDelta: "-18% QoQ",
        section: "Financial highlights",
        recommendation:
          "Validate whether the decline is concentrated in one segment or reflects broader demand weakness.",
        evidenceIds: ["apollo-e1", "apollo-e2"],
        relatedNodeIds: [
          "apollo-doc",
          "apollo-company",
          "apollo-metric-revenue",
          "apollo-period-q3",
          "apollo-period-q4",
          "apollo-flag-revenue",
        ],
        scoreBreakdown: {
          changeScore: 3.8,
          severityScore: 2.2,
          graphRiskScore: 1.6,
          evidenceScore: 1.1,
          uncertaintyPenalty: 0.3,
          finalScore: 8.4,
        },
      },
      {
        id: "marketing-spike",
        title: "Expense growth outpaced sales growth",
        category: "trend",
        severity: "high",
        confidence: 0.89,
        explanation:
          "Marketing expense increased 27% while revenue moved in the opposite direction, indicating a sharp deterioration in spend efficiency.",
        impact:
          "This pattern can pressure burn and may point to underperforming acquisition channels.",
        metricDelta: "+27% QoQ",
        section: "Operating expenses",
        recommendation:
          "Inspect campaign-level ROI and confirm whether the increase reflects one-time launch costs.",
        evidenceIds: ["apollo-e3", "apollo-e4"],
        relatedNodeIds: [
          "apollo-doc",
          "apollo-section-opex",
          "apollo-metric-marketing",
          "apollo-period-q4",
          "apollo-flag-efficiency",
        ],
        scoreBreakdown: {
          changeScore: 3.3,
          severityScore: 2.0,
          graphRiskScore: 1.4,
          evidenceScore: 1.0,
          uncertaintyPenalty: 0.2,
          finalScore: 7.5,
        },
      },
      {
        id: "nova-repeat",
        title: "Repeated counterparty appears across high-value rows",
        category: "counterparty",
        severity: "high",
        confidence: 0.87,
        explanation:
          "Nova Holdings is referenced in the transaction appendix and in a procurement narrative note, indicating repeat exposure in a compressed time window.",
        impact:
          "Repeated counterparties in unusually large rows can indicate concentration risk or non-routine vendor activity.",
        metricDelta: "3 linked mentions",
        section: "Appendix B",
        recommendation:
          "Review contract purpose, approval path, and whether related entities share beneficial ownership.",
        evidenceIds: ["apollo-e5", "apollo-e6"],
        relatedNodeIds: [
          "apollo-doc",
          "apollo-counterparty-nova",
          "apollo-transaction-nova",
          "apollo-section-appendix",
          "apollo-flag-vendor",
        ],
        scoreBreakdown: {
          changeScore: 2.1,
          severityScore: 2.3,
          graphRiskScore: 2.0,
          evidenceScore: 1.0,
          uncertaintyPenalty: 0.2,
          finalScore: 7.2,
        },
      },
      {
        id: "narrative-mismatch",
        title: "Narrative optimism conflicts with reported trend",
        category: "narrative",
        severity: "medium",
        confidence: 0.78,
        explanation:
          "Management commentary describes demand as resilient, but the linked revenue and conversion metrics show a meaningful pullback.",
        impact:
          "Narrative divergence is a useful follow-up signal because it can hide the practical severity of the trend.",
        metricDelta: "Commentary mismatch",
        section: "CEO letter",
        recommendation:
          "Cross-check forecast language against segment-level bookings before using the narrative for planning.",
        evidenceIds: ["apollo-e2", "apollo-e7"],
        relatedNodeIds: [
          "apollo-doc",
          "apollo-section-letter",
          "apollo-metric-revenue",
          "apollo-flag-revenue",
        ],
        scoreBreakdown: {
          changeScore: 1.8,
          severityScore: 1.6,
          graphRiskScore: 1.1,
          evidenceScore: 1.0,
          uncertaintyPenalty: 0.4,
          finalScore: 5.1,
        },
      },
    ],
    evidence: [
      {
        id: "apollo-e1",
        sourceType: "table",
        title: "Quarterly revenue table",
        content:
          "Subscription revenue declined from $5.0M in Q3 to $4.1M in Q4, with total revenue also contracting.",
        page: 3,
        section: "Financial highlights",
      },
      {
        id: "apollo-e2",
        sourceType: "text",
        title: "Management commentary",
        content:
          "Management describes customer demand as resilient despite elongated decision cycles and a slower close rate.",
        page: 2,
        section: "CEO letter",
      },
      {
        id: "apollo-e3",
        sourceType: "table",
        title: "Operating expense table",
        content:
          "Marketing expense increased from $1.1M to $1.4M quarter over quarter while sales and success remained flat.",
        page: 4,
        section: "Operating expenses",
      },
      {
        id: "apollo-e4",
        sourceType: "text",
        title: "Campaign note",
        content:
          "The company expanded paid acquisition and partner promotions in advance of a product launch.",
        page: 4,
        section: "Operating expenses",
      },
      {
        id: "apollo-e5",
        sourceType: "table",
        title: "Transaction appendix row",
        content:
          "Nova Holdings appears on a $420K consulting and integration payment dated December 18.",
        page: 8,
        section: "Appendix B",
      },
      {
        id: "apollo-e6",
        sourceType: "text",
        title: "Procurement note",
        content:
          "A related vendor was retained to support a strategic migration initiative during the quarter.",
        page: 7,
        section: "Vendor notes",
      },
      {
        id: "apollo-e7",
        sourceType: "text",
        title: "Forward-looking statement",
        content:
          "The company expects pipeline normalization to support improved demand in the next reporting period.",
        page: 2,
        section: "CEO letter",
      },
    ],
    graph: {
      nodes: [
        {
          id: "apollo-doc",
          label: "Apollo Q4 Report",
          type: "Document",
          metadata: { pages: 12, source: "pdf" },
        },
        {
          id: "apollo-company",
          label: "Apollo Ventures",
          type: "Company",
          metadata: { sector: "B2B SaaS" },
        },
        {
          id: "apollo-section-letter",
          label: "CEO Letter",
          type: "Section",
          metadata: { page: 2 },
        },
        {
          id: "apollo-section-opex",
          label: "Operating Expenses",
          type: "Section",
          metadata: { page: 4 },
        },
        {
          id: "apollo-section-appendix",
          label: "Appendix B",
          type: "Section",
          metadata: { page: 8 },
        },
        {
          id: "apollo-metric-revenue",
          label: "Subscription Revenue",
          type: "Metric",
          metadata: { current: "$4.1M", prior: "$5.0M" },
        },
        {
          id: "apollo-metric-marketing",
          label: "Marketing Expense",
          type: "Metric",
          metadata: { current: "$1.4M", prior: "$1.1M" },
        },
        {
          id: "apollo-period-q3",
          label: "Q3 2025",
          type: "Period",
        },
        {
          id: "apollo-period-q4",
          label: "Q4 2025",
          type: "Period",
        },
        {
          id: "apollo-counterparty-nova",
          label: "Nova Holdings",
          type: "Counterparty",
          metadata: { appearances: 3 },
        },
        {
          id: "apollo-transaction-nova",
          label: "Integration Payment",
          type: "Transaction",
          metadata: { amount: "$420K" },
        },
        {
          id: "apollo-flag-revenue",
          label: "Revenue Shock",
          type: "RiskFlag",
          metadata: { severity: "high" },
        },
        {
          id: "apollo-flag-efficiency",
          label: "Efficiency Compression",
          type: "RiskFlag",
          metadata: { severity: "high" },
        },
        {
          id: "apollo-flag-vendor",
          label: "Vendor Concentration",
          type: "RiskFlag",
          metadata: { severity: "high" },
        },
      ],
      edges: [
        {
          id: "apollo-g1",
          source: "apollo-doc",
          target: "apollo-company",
          label: "MENTIONS",
        },
        {
          id: "apollo-g2",
          source: "apollo-doc",
          target: "apollo-section-letter",
          label: "APPEARS_IN",
        },
        {
          id: "apollo-g3",
          source: "apollo-doc",
          target: "apollo-section-opex",
          label: "APPEARS_IN",
        },
        {
          id: "apollo-g4",
          source: "apollo-doc",
          target: "apollo-section-appendix",
          label: "APPEARS_IN",
        },
        {
          id: "apollo-g5",
          source: "apollo-metric-revenue",
          target: "apollo-period-q3",
          label: "REPORTED_IN",
        },
        {
          id: "apollo-g6",
          source: "apollo-metric-revenue",
          target: "apollo-period-q4",
          label: "REPORTED_IN",
        },
        {
          id: "apollo-g7",
          source: "apollo-metric-marketing",
          target: "apollo-period-q4",
          label: "REPORTED_IN",
        },
        {
          id: "apollo-g8",
          source: "apollo-counterparty-nova",
          target: "apollo-transaction-nova",
          label: "PAID_TO",
        },
        {
          id: "apollo-g9",
          source: "apollo-section-appendix",
          target: "apollo-counterparty-nova",
          label: "MENTIONS",
        },
        {
          id: "apollo-g10",
          source: "apollo-section-letter",
          target: "apollo-metric-revenue",
          label: "RELATED_TO",
        },
        {
          id: "apollo-g11",
          source: "apollo-section-opex",
          target: "apollo-metric-marketing",
          label: "RELATED_TO",
        },
        {
          id: "apollo-g12",
          source: "apollo-metric-revenue",
          target: "apollo-flag-revenue",
          label: "FLAGGED_AS",
        },
        {
          id: "apollo-g13",
          source: "apollo-metric-marketing",
          target: "apollo-flag-efficiency",
          label: "FLAGGED_AS",
        },
        {
          id: "apollo-g14",
          source: "apollo-counterparty-nova",
          target: "apollo-flag-vendor",
          label: "FLAGGED_AS",
        },
        {
          id: "apollo-g15",
          source: "apollo-company",
          target: "apollo-metric-revenue",
          label: "BELONGS_TO",
        },
        {
          id: "apollo-g16",
          source: "apollo-company",
          target: "apollo-metric-marketing",
          label: "BELONGS_TO",
        },
      ],
    },
  },
  "northstar-kpi-dashboard": {
    id: "northstar-kpi-dashboard",
    filename: "northstar_dashboard.png",
    documentType: "KPI dashboard screenshot",
    lastUpdated: "April 11, 2026",
    scoreFormula:
      "final_score = change_score + severity_score + graph_risk_score + evidence_score - uncertainty_penalty",
    summary: {
      title: "Northstar dashboard operating readout",
      headline:
        "The dashboard shows CAC deterioration, weaker conversion, and burn pressure moving together.",
      overview:
        "SignalLens treated the screenshot as a structured dashboard, extracted visible cards and captions, and linked related KPIs. The combined pattern points to sales efficiency stress rather than a one-off variance in a single tile.",
      keyTakeaways: [
        "Customer acquisition cost jumped from $142 to $198 over the visible comparison period.",
        "Pipeline-to-close conversion fell from 31% to 24% while paid spend remained elevated.",
        "Net burn widened faster than management target bands shown in the same dashboard.",
      ],
    },
    stats: {
      totalFindings: 3,
      highRiskCount: 2,
      entityCount: 9,
      relationshipCount: 11,
      confidenceScore: 81,
    },
    findings: [
      {
        id: "cac-spike",
        title: "Customer acquisition cost spiked",
        category: "metric",
        severity: "high",
        confidence: 0.88,
        explanation:
          "CAC increased 39% relative to the comparison card, materially outpacing the change in qualified pipeline volume.",
        impact:
          "The business is paying more for each acquired customer while conversion is moving lower.",
        metricDelta: "+39%",
        section: "Paid acquisition",
        recommendation:
          "Segment paid channels by source and verify whether one campaign family is driving the spike.",
        evidenceIds: ["northstar-e1", "northstar-e2"],
        relatedNodeIds: [
          "northstar-doc",
          "northstar-metric-cac",
          "northstar-metric-conversion",
          "northstar-period-current",
          "northstar-flag-cac",
        ],
        scoreBreakdown: {
          changeScore: 3.5,
          severityScore: 2.0,
          graphRiskScore: 1.5,
          evidenceScore: 1.0,
          uncertaintyPenalty: 0.3,
          finalScore: 7.7,
        },
      },
      {
        id: "conversion-dip",
        title: "Conversion softened against higher spend",
        category: "trend",
        severity: "high",
        confidence: 0.84,
        explanation:
          "Conversion dropped from 31% to 24% while spend commentary still emphasized acceleration, creating a negative efficiency pairing.",
        impact:
          "Pipeline efficiency deterioration can pull forward burn without yielding matching bookings.",
        metricDelta: "-7 pts",
        section: "Revenue engine",
        recommendation:
          "Trace whether the softening is concentrated in one funnel stage or appears across the whole sales motion.",
        evidenceIds: ["northstar-e2", "northstar-e3"],
        relatedNodeIds: [
          "northstar-doc",
          "northstar-section-revenue",
          "northstar-metric-conversion",
          "northstar-metric-burn",
          "northstar-flag-burn",
        ],
        scoreBreakdown: {
          changeScore: 2.8,
          severityScore: 2.0,
          graphRiskScore: 1.6,
          evidenceScore: 1.0,
          uncertaintyPenalty: 0.3,
          finalScore: 7.1,
        },
      },
      {
        id: "burn-band",
        title: "Net burn moved outside target band",
        category: "narrative",
        severity: "medium",
        confidence: 0.73,
        explanation:
          "The visible burn card exceeds the dashboard target annotation, suggesting the operator plan is under pressure.",
        impact:
          "Burn movement matters more because related efficiency metrics are already deteriorating.",
        metricDelta: "+12%",
        section: "Cash management",
        recommendation:
          "Review whether hiring, marketing, or delayed cash collections are the dominant driver.",
        evidenceIds: ["northstar-e3"],
        relatedNodeIds: [
          "northstar-doc",
          "northstar-metric-burn",
          "northstar-flag-burn",
        ],
        scoreBreakdown: {
          changeScore: 2.0,
          severityScore: 1.6,
          graphRiskScore: 1.2,
          evidenceScore: 0.9,
          uncertaintyPenalty: 0.4,
          finalScore: 5.3,
        },
      },
    ],
    evidence: [
      {
        id: "northstar-e1",
        sourceType: "image",
        title: "CAC card",
        content:
          "The dashboard tile shows CAC rising from $142 to $198 over the selected comparison period.",
        page: 1,
        section: "Paid acquisition",
      },
      {
        id: "northstar-e2",
        sourceType: "image",
        title: "Conversion card",
        content:
          "The conversion tile shows pipeline-to-close movement from 31% down to 24%, with the chart shading red.",
        page: 1,
        section: "Revenue engine",
      },
      {
        id: "northstar-e3",
        sourceType: "image",
        title: "Burn target note",
        content:
          "Net burn exceeds the labeled target band shown beneath the cash management summary tile.",
        page: 1,
        section: "Cash management",
      },
    ],
    graph: {
      nodes: [
        { id: "northstar-doc", label: "Northstar Dashboard", type: "Document" },
        {
          id: "northstar-section-revenue",
          label: "Revenue Engine",
          type: "Section",
        },
        {
          id: "northstar-metric-cac",
          label: "CAC",
          type: "Metric",
          metadata: { current: "$198", prior: "$142" },
        },
        {
          id: "northstar-metric-conversion",
          label: "Pipeline Conversion",
          type: "Metric",
          metadata: { current: "24%", prior: "31%" },
        },
        {
          id: "northstar-metric-burn",
          label: "Net Burn",
          type: "Metric",
          metadata: { current: "$1.9M" },
        },
        {
          id: "northstar-period-current",
          label: "Current Window",
          type: "Period",
        },
        {
          id: "northstar-period-prior",
          label: "Prior Window",
          type: "Period",
        },
        {
          id: "northstar-flag-cac",
          label: "Efficiency Risk",
          type: "RiskFlag",
          metadata: { severity: "high" },
        },
        {
          id: "northstar-flag-burn",
          label: "Burn Pressure",
          type: "RiskFlag",
          metadata: { severity: "medium" },
        },
      ],
      edges: [
        {
          id: "northstar-g1",
          source: "northstar-doc",
          target: "northstar-section-revenue",
          label: "APPEARS_IN",
        },
        {
          id: "northstar-g2",
          source: "northstar-doc",
          target: "northstar-metric-cac",
          label: "MENTIONS",
        },
        {
          id: "northstar-g3",
          source: "northstar-doc",
          target: "northstar-metric-conversion",
          label: "MENTIONS",
        },
        {
          id: "northstar-g4",
          source: "northstar-doc",
          target: "northstar-metric-burn",
          label: "MENTIONS",
        },
        {
          id: "northstar-g5",
          source: "northstar-metric-cac",
          target: "northstar-period-prior",
          label: "REPORTED_IN",
        },
        {
          id: "northstar-g6",
          source: "northstar-metric-cac",
          target: "northstar-period-current",
          label: "REPORTED_IN",
        },
        {
          id: "northstar-g7",
          source: "northstar-metric-conversion",
          target: "northstar-period-current",
          label: "REPORTED_IN",
        },
        {
          id: "northstar-g8",
          source: "northstar-metric-conversion",
          target: "northstar-flag-cac",
          label: "RELATED_TO",
        },
        {
          id: "northstar-g9",
          source: "northstar-metric-cac",
          target: "northstar-flag-cac",
          label: "FLAGGED_AS",
        },
        {
          id: "northstar-g10",
          source: "northstar-metric-burn",
          target: "northstar-flag-burn",
          label: "FLAGGED_AS",
        },
        {
          id: "northstar-g11",
          source: "northstar-metric-burn",
          target: "northstar-metric-conversion",
          label: "RELATED_TO",
        },
      ],
    },
  },
  "nova-vendor-ledger": {
    id: "nova-vendor-ledger",
    filename: "nova_vendor_ledger.jpg",
    documentType: "Vendor ledger image",
    lastUpdated: "April 11, 2026",
    scoreFormula:
      "final_score = change_score + severity_score + graph_risk_score + evidence_score - uncertainty_penalty",
    summary: {
      title: "Vendor ledger anomaly review",
      headline:
        "Repeated high-value payments and linked memo text make Nova Holdings the dominant outlier.",
      overview:
        "SignalLens extracted a ledger-like screenshot, normalized counterparties and memo notes, then connected repeated names to clustered payments. The highest-risk pattern is the recurrence of Nova Holdings across unusual rows rather than any single payment amount alone.",
      keyTakeaways: [
        "Nova Holdings appears in three high-value rows inside a short date range.",
        "Two of the rows share memo language tied to migration or emergency support work.",
        "The repeated pattern produces a stronger graph risk score than isolated one-off payments.",
      ],
    },
    stats: {
      totalFindings: 3,
      highRiskCount: 2,
      entityCount: 10,
      relationshipCount: 13,
      confidenceScore: 79,
    },
    findings: [
      {
        id: "vendor-cluster",
        title: "Counterparty cluster detected",
        category: "counterparty",
        severity: "high",
        confidence: 0.9,
        explanation:
          "Three Nova Holdings transactions are tightly clustered, materially above surrounding rows, and linked through similar memo text.",
        impact:
          "Repeated anomalous payments can indicate concentration risk or require deeper procurement review.",
        metricDelta: "3 outlier rows",
        section: "Ledger rows 42-57",
        recommendation:
          "Review approvals, supporting contracts, and whether the memo language maps to one project or multiple engagements.",
        evidenceIds: ["nova-e1", "nova-e2"],
        relatedNodeIds: [
          "nova-doc",
          "nova-counterparty",
          "nova-transaction-1",
          "nova-transaction-2",
          "nova-flag-cluster",
        ],
        scoreBreakdown: {
          changeScore: 2.4,
          severityScore: 2.2,
          graphRiskScore: 2.1,
          evidenceScore: 1.1,
          uncertaintyPenalty: 0.2,
          finalScore: 7.6,
        },
      },
      {
        id: "memo-pattern",
        title: "Memo language repeats across exceptional payments",
        category: "narrative",
        severity: "high",
        confidence: 0.82,
        explanation:
          "The notes 'migration acceleration' and 'emergency support' recur in the same counterparty cluster, increasing contextual suspicion.",
        impact:
          "Repeated narrative framing around exceptional payments can indicate hidden project sprawl or insufficient classification.",
        metricDelta: "2 repeated notes",
        section: "Memo column",
        recommendation:
          "Verify whether these payments should have been grouped under a single purchase order or capitalized separately.",
        evidenceIds: ["nova-e2", "nova-e3"],
        relatedNodeIds: [
          "nova-doc",
          "nova-counterparty",
          "nova-section-memo",
          "nova-flag-cluster",
        ],
        scoreBreakdown: {
          changeScore: 2.0,
          severityScore: 2.0,
          graphRiskScore: 1.8,
          evidenceScore: 1.0,
          uncertaintyPenalty: 0.3,
          finalScore: 6.5,
        },
      },
      {
        id: "support-window",
        title: "Payment timing is unusually compressed",
        category: "trend",
        severity: "medium",
        confidence: 0.72,
        explanation:
          "The flagged payments occur inside a narrow interval relative to the wider ledger cadence.",
        impact:
          "Compressed timing can be normal during projects, but here it compounds a repeated-counterparty pattern.",
        metricDelta: "11-day window",
        section: "Date column",
        recommendation:
          "Compare the timing against milestone schedules or board-approved spend windows.",
        evidenceIds: ["nova-e1"],
        relatedNodeIds: ["nova-doc", "nova-period-window", "nova-counterparty"],
        scoreBreakdown: {
          changeScore: 1.8,
          severityScore: 1.5,
          graphRiskScore: 1.3,
          evidenceScore: 0.9,
          uncertaintyPenalty: 0.4,
          finalScore: 5.1,
        },
      },
    ],
    evidence: [
      {
        id: "nova-e1",
        sourceType: "image",
        title: "Repeated ledger rows",
        content:
          "Nova Holdings is listed on three payments ranging from $180K to $240K within an 11-day period.",
        page: 1,
        section: "Ledger rows 42-57",
      },
      {
        id: "nova-e2",
        sourceType: "image",
        title: "Memo column repeats",
        content:
          "Two highlighted rows include memo text referencing migration acceleration or emergency support.",
        page: 1,
        section: "Memo column",
      },
      {
        id: "nova-e3",
        sourceType: "text",
        title: "Manual annotation",
        content:
          "The reviewer note marks the vendor as unusual relative to normal monthly service vendors.",
        page: 1,
        section: "Analyst note",
      },
    ],
    graph: {
      nodes: [
        { id: "nova-doc", label: "Vendor Ledger", type: "Document" },
        { id: "nova-section-memo", label: "Memo Column", type: "Section" },
        {
          id: "nova-counterparty",
          label: "Nova Holdings",
          type: "Counterparty",
          metadata: { appearances: 3 },
        },
        {
          id: "nova-transaction-1",
          label: "Dec 02 Payment",
          type: "Transaction",
          metadata: { amount: "$180K" },
        },
        {
          id: "nova-transaction-2",
          label: "Dec 13 Payment",
          type: "Transaction",
          metadata: { amount: "$240K" },
        },
        {
          id: "nova-transaction-3",
          label: "Dec 13 Payment B",
          type: "Transaction",
          metadata: { amount: "$210K" },
        },
        { id: "nova-period-window", label: "11-Day Window", type: "Period" },
        {
          id: "nova-flag-cluster",
          label: "Clustered Vendor Risk",
          type: "RiskFlag",
          metadata: { severity: "high" },
        },
      ],
      edges: [
        {
          id: "nova-g1",
          source: "nova-doc",
          target: "nova-counterparty",
          label: "MENTIONS",
        },
        {
          id: "nova-g2",
          source: "nova-doc",
          target: "nova-section-memo",
          label: "APPEARS_IN",
        },
        {
          id: "nova-g3",
          source: "nova-counterparty",
          target: "nova-transaction-1",
          label: "PAID_TO",
        },
        {
          id: "nova-g4",
          source: "nova-counterparty",
          target: "nova-transaction-2",
          label: "PAID_TO",
        },
        {
          id: "nova-g5",
          source: "nova-counterparty",
          target: "nova-transaction-3",
          label: "PAID_TO",
        },
        {
          id: "nova-g6",
          source: "nova-transaction-1",
          target: "nova-period-window",
          label: "REPORTED_IN",
        },
        {
          id: "nova-g7",
          source: "nova-transaction-2",
          target: "nova-period-window",
          label: "REPORTED_IN",
        },
        {
          id: "nova-g8",
          source: "nova-transaction-3",
          target: "nova-period-window",
          label: "REPORTED_IN",
        },
        {
          id: "nova-g9",
          source: "nova-section-memo",
          target: "nova-counterparty",
          label: "RELATED_TO",
        },
        {
          id: "nova-g10",
          source: "nova-counterparty",
          target: "nova-flag-cluster",
          label: "FLAGGED_AS",
        },
        {
          id: "nova-g11",
          source: "nova-transaction-1",
          target: "nova-flag-cluster",
          label: "RELATED_TO",
        },
        {
          id: "nova-g12",
          source: "nova-transaction-2",
          target: "nova-flag-cluster",
          label: "RELATED_TO",
        },
        {
          id: "nova-g13",
          source: "nova-transaction-3",
          target: "nova-flag-cluster",
          label: "RELATED_TO",
        },
      ],
    },
  },
  "uploaded-financial-document": {
    id: "uploaded-financial-document",
    filename: "uploaded_document.pdf",
    documentType: "Uploaded document demo",
    lastUpdated: "April 11, 2026",
    scoreFormula:
      "final_score = change_score + severity_score + graph_risk_score + evidence_score - uncertainty_penalty",
    summary: {
      title: "Uploaded document demo analysis",
      headline:
        "The uploaded file is routed through a generic SignalLens demo pipeline for the MVP walkthrough.",
      overview:
        "For the hackathon frontend, custom uploads land on a representative demo analysis that shows how extraction, scoring, evidence, and graph exploration will appear once the backend is fully wired.",
      keyTakeaways: [
        "A representative revenue anomaly is surfaced first to anchor the demo.",
        "Evidence and graph panels remain interactive so judges can inspect explainability.",
        "The UI is already structured around the final upload to investigation workflow.",
      ],
    },
    stats: {
      totalFindings: 3,
      highRiskCount: 2,
      entityCount: 8,
      relationshipCount: 10,
      confidenceScore: 76,
    },
    findings: [
      {
        id: "upload-demo-1",
        title: "Representative revenue variance flagged",
        category: "metric",
        severity: "high",
        confidence: 0.82,
        explanation:
          "The demo pipeline highlights a sharp movement in a reported revenue metric relative to the nearby baseline.",
        impact:
          "This stands in for the first ranked anomaly the backend would compute after extraction.",
        metricDelta: "-14%",
        section: "Demo summary",
        recommendation:
          "Connect the upload API to replace this seed data with live extraction output.",
        evidenceIds: ["upload-e1"],
        relatedNodeIds: ["upload-doc", "upload-metric", "upload-flag"],
        scoreBreakdown: {
          changeScore: 3.0,
          severityScore: 2.0,
          graphRiskScore: 1.2,
          evidenceScore: 0.9,
          uncertaintyPenalty: 0.3,
          finalScore: 6.8,
        },
      },
      {
        id: "upload-demo-2",
        title: "Context note linked to the metric move",
        category: "narrative",
        severity: "medium",
        confidence: 0.71,
        explanation:
          "The demo shows how a narrative snippet and a metric can be joined into one explainable finding.",
        impact:
          "Judges can inspect the evidence chain even before live backend extraction is connected.",
        metricDelta: "Linked evidence",
        section: "Narrative note",
        recommendation:
          "Swap the mocked evidence store with backend chunk IDs when the API is ready.",
        evidenceIds: ["upload-e2"],
        relatedNodeIds: ["upload-doc", "upload-section", "upload-metric"],
        scoreBreakdown: {
          changeScore: 1.7,
          severityScore: 1.4,
          graphRiskScore: 1.0,
          evidenceScore: 0.9,
          uncertaintyPenalty: 0.3,
          finalScore: 4.7,
        },
      },
      {
        id: "upload-demo-3",
        title: "Graph evidence remains traceable",
        category: "counterparty",
        severity: "medium",
        confidence: 0.69,
        explanation:
          "The representative graph panel shows how extracted entities, sections, and risk flags will connect in the live product.",
        impact:
          "This gives the investigation surface enough fidelity for a polished MVP demo.",
        metricDelta: "3 connected nodes",
        section: "Graph view",
        recommendation:
          "Map backend Neo4j IDs directly into this view for the final presentation.",
        evidenceIds: ["upload-e3"],
        relatedNodeIds: ["upload-doc", "upload-section", "upload-flag"],
        scoreBreakdown: {
          changeScore: 1.5,
          severityScore: 1.4,
          graphRiskScore: 1.3,
          evidenceScore: 0.8,
          uncertaintyPenalty: 0.2,
          finalScore: 4.8,
        },
      },
    ],
    evidence: [
      {
        id: "upload-e1",
        sourceType: "table",
        title: "Representative metric row",
        content:
          "Demo data shows a revenue figure falling against the comparison period to simulate a live anomaly.",
        section: "Demo summary",
      },
      {
        id: "upload-e2",
        sourceType: "text",
        title: "Representative narrative note",
        content:
          "A short commentary block is linked to the metric change so the explanation has grounded context.",
        section: "Narrative note",
      },
      {
        id: "upload-e3",
        sourceType: "image",
        title: "Representative graph connection",
        content:
          "The graph panel highlights a document, metric, and risk flag relationship to demonstrate the investigation workflow.",
        section: "Graph view",
      },
    ],
    graph: {
      nodes: [
        { id: "upload-doc", label: "Uploaded Document", type: "Document" },
        { id: "upload-section", label: "Extracted Section", type: "Section" },
        { id: "upload-metric", label: "Revenue Metric", type: "Metric" },
        { id: "upload-period", label: "Current Period", type: "Period" },
        { id: "upload-flag", label: "Demo Risk Flag", type: "RiskFlag" },
      ],
      edges: [
        {
          id: "upload-g1",
          source: "upload-doc",
          target: "upload-section",
          label: "APPEARS_IN",
        },
        {
          id: "upload-g2",
          source: "upload-doc",
          target: "upload-metric",
          label: "MENTIONS",
        },
        {
          id: "upload-g3",
          source: "upload-metric",
          target: "upload-period",
          label: "REPORTED_IN",
        },
        {
          id: "upload-g4",
          source: "upload-metric",
          target: "upload-flag",
          label: "FLAGGED_AS",
        },
        {
          id: "upload-g5",
          source: "upload-section",
          target: "upload-metric",
          label: "RELATED_TO",
        },
      ],
    },
  },
}

export function getResultById(id: string) {
  return demoResults[id]
}

export function getAllResultIds() {
  return Object.keys(demoResults)
}
