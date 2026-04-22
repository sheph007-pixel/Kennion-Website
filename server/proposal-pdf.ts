/**
 * server/proposal-pdf.ts
 *
 * Native PDF renderer for group proposals. Consumes the output of
 * `priceGroup()` (server/rate-engine.ts) and produces a multi-section PDF:
 *
 *   1. Cover                         — Kennion letterhead, group facts, summary
 *   2. Medical Plans                 — traditional medical plan rates
 *   3. Supplemental & Virtual Care   — MEC + Virtual plan rates
 *   4. Census Roster                 — one row per enrolled member (paginated)
 *   5. Methodology                   — pricing formula + this group's factors
 *   6. Disclaimers                   — legal / actuarial caveats
 *
 * Zero runtime dependency on LibreOffice/Excel. Uses `pdfkit` only.
 */

import PDFDocument from "pdfkit";
import type { Group, CensusEntry } from "@shared/schema";
import type { PricingResult } from "./rate-engine";

// ── Kennion brand ─────────────────────────────────────────────────────────
const NAVY = "#0B2545";
const ACCENT = "#13315C";
const GOLD = "#C9A961";
const TEXT = "#1B1B1B";
const MUTED = "#6B7280";
const BORDER = "#D1D5DB";
const ROW_ALT = "#F4F6FA";

// ── Page geometry ─────────────────────────────────────────────────────────
const MARGIN_L = 48;
const MARGIN_R = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 56;
const HEADER_H = 62;
const FOOTER_BAND = 42;

// ── Customer-facing plan names ────────────────────────────────────────────
// Internal name (from factor-tables.json) → display name on proposal.
// Any plan not in this map renders under its internal name.
const PLAN_DISPLAY_MAP: Record<string, string> = {
  "Deluxe Platinum": "Deluxe Platinum",
  "Choice Gold": "Choice Gold",
  "Basic Gold": "Basic Gold",
  "Preferred Silver": "Preferred Silver",
  "Enhanced Silver": "Enhanced Silver",
  "Classic Silver": "Classic Silver",
  "Saver HSA": "Saver HSA (Health Savings Account)",
  "Elite Health Plan": "Elite Health",
  "Premier Health Plan": "Premier Health",
  "Select Health Plan": "Select Health",
  "Core Health Plan": "Core Health",
  "Freedom Platinum": "Freedom Platinum (Generic Rx)",
  "Freedom Gold": "Freedom Gold (Generic Rx)",
  "Freedom Silver": "Freedom Silver (Generic Rx)",
  "Freedom Bronze": "Freedom Bronze (Generic Rx)",
  "Value Essential MEC": "Value Essential (MEC)",
  "AL Healthy 500": "AL Healthy 500",
  "Platinum": "Platinum",
  "Preferred Gold": "Preferred Gold",
  "Virtual 1,000": "Virtual 1,000",
  "Virtual 2,500": "Virtual 2,500",
  "Virtual 5,000": "Virtual 5,000",
  "Virtual 10,000": "Virtual 10,000",
};

// Traditional medical plans — page 1 of rates.
const MEDICAL_PLAN_ORDER = [
  "Deluxe Platinum",
  "Platinum",
  "Choice Gold",
  "Basic Gold",
  "Preferred Gold",
  "Preferred Silver",
  "Enhanced Silver",
  "Classic Silver",
  "Saver HSA",
  "Elite Health Plan",
  "Premier Health Plan",
  "Select Health Plan",
  "Core Health Plan",
  "Freedom Platinum",
  "Freedom Gold",
  "Freedom Silver",
  "Freedom Bronze",
  "AL Healthy 500",
];

// Supplemental & Virtual Care — page 2 of rates. MEC + virtual-only plans
// belong together since they're secondary / limited coverage offerings.
const SUPPLEMENTAL_VIRTUAL_ORDER = [
  "Value Essential MEC",
  "Virtual 1,000",
  "Virtual 2,500",
  "Virtual 5,000",
  "Virtual 10,000",
];

// ── Formatting helpers ────────────────────────────────────────────────────
function fmtUSD(n: number): string {
  if (!isFinite(n)) return "—";
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateLong(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function fmtDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC",
  });
}

function safeFileName(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 80);
}

function relationshipLabel(rel: string): string {
  const r = (rel || "").trim().toUpperCase();
  if (r === "EE") return "Employee";
  if (r === "SP") return "Spouse";
  if (r === "CH") return "Child";
  return rel;
}

// ── Drawing helpers ───────────────────────────────────────────────────────
type Doc = InstanceType<typeof PDFDocument>;

function contentWidth(doc: Doc): number {
  return doc.page.width - MARGIN_L - MARGIN_R;
}

function header(doc: Doc, title: string) {
  const pw = doc.page.width;
  doc.save();
  doc.rect(0, 0, pw, HEADER_H).fill(NAVY);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18)
    .text("KENNION", MARGIN_L, 20, { continued: true })
    .font("Helvetica").fontSize(11).fillColor(GOLD)
    .text("   Captive Health Solutions", { continued: false });
  doc.font("Helvetica").fontSize(10).fillColor("#E5E7EB")
    .text(title, pw - 260, 24, { width: 220, align: "right" });
  doc.restore();
  doc.y = HEADER_H + 28;
  doc.fillColor(TEXT);
}

function hr(doc: Doc, y?: number) {
  const yy = y ?? doc.y;
  doc.save().strokeColor(BORDER).lineWidth(0.5)
    .moveTo(MARGIN_L, yy).lineTo(doc.page.width - MARGIN_R, yy).stroke().restore();
  doc.y = yy + 8;
}

function sectionTitle(doc: Doc, title: string, subtitle?: string) {
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(20).text(title);
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(subtitle);
  }
  doc.moveDown(0.6);
}

// Page-footer band: a thin brand rule plus the "Kennion — …" tagline.
// Rendered after layout on every page via doc.bufferedPageRange().
// We zero the bottom margin while stamping — pdfkit's text pipeline
// treats writes below the bottom margin as overflow and auto-injects
// a new page, which would silently double the PDF length here.
function renderFooterBand(doc: Doc, pageNum: number, totalPages: number) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const savedMarginBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  try {
    doc.save();
    doc.strokeColor(GOLD).lineWidth(0.8)
      .moveTo(MARGIN_L, ph - FOOTER_BAND + 4)
      .lineTo(pw - MARGIN_R, ph - FOOTER_BAND + 4)
      .stroke();
    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
      .text(
        "Kennion — Captive Health Solutions  •  Rates are illustrative and subject to final underwriting approval.",
        MARGIN_L, ph - 28,
        { width: pw - MARGIN_L - MARGIN_R, align: "left", lineBreak: false },
      );
    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
      .text(`Page ${pageNum} of ${totalPages}`, pw - 140, ph - 28, {
        width: 100, align: "right", lineBreak: false,
      });
    doc.restore();
  } finally {
    doc.page.margins.bottom = savedMarginBottom;
  }
}

// ── Tables ────────────────────────────────────────────────────────────────
// Shared rate-table renderer used by both Medical and Supplemental pages.
// Draws the 5-column grid (plan / EE / EC / ES / EF) with alternating rows
// and a navy header; paginates automatically with a continued-header.
function renderRateTable(
  doc: Doc,
  plans: string[],
  pricing: PricingResult,
  contTitle: string,
) {
  const pw = doc.page.width;
  const leftX = MARGIN_L;
  const rightX = pw - MARGIN_R;
  // Wider tier columns so header labels never wrap. A wrapped text
  // that overflows the page triggers pdfkit's continueOnNewPage
  // auto-pagination, which silently injects blank pages.
  const planColW = 196;
  const tierColW = (rightX - leftX - planColW) / 4;
  const rowH = 18;

  function drawHeaderBand() {
    const y = doc.y;
    doc.save();
    doc.rect(leftX, y, rightX - leftX, rowH + 4).fill(NAVY);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
    doc.text("Plan", leftX + 8, y + 5, { width: planColW - 8, lineBreak: false });
    const tiers: string[] = ["EE Only", "+ Children", "+ Spouse", "+ Family"];
    tiers.forEach((label, i) => {
      const tx = leftX + planColW + i * tierColW;
      doc.text(label, tx, y + 5, {
        width: tierColW,
        align: "center",
        lineBreak: false,
      });
    });
    doc.restore();
    doc.y = y + rowH + 8;
  }

  function drawRow(planInternal: string, idx: number) {
    const rate = pricing.plan_rates[planInternal];
    if (!rate) return;
    const y = doc.y;
    if (idx % 2 === 0) {
      doc.save().rect(leftX, y - 2, rightX - leftX, rowH).fill(ROW_ALT).restore();
    }
    doc.fillColor(TEXT).font("Helvetica").fontSize(10);
    const display = PLAN_DISPLAY_MAP[planInternal] || planInternal;
    doc.text(display, leftX + 8, y + 2, {
      width: planColW - 8,
      lineBreak: false,
      ellipsis: true,
    });
    const values = [rate.EE, rate.EC, rate.ES, rate.EF];
    values.forEach((v, i) => {
      const tx = leftX + planColW + i * tierColW;
      doc.text(fmtUSD(v), tx, y + 2, {
        width: tierColW - 6,
        align: "right",
        lineBreak: false,
      });
    });
    doc.y = y + rowH;
  }

  drawHeaderBand();
  plans.forEach((p, i) => {
    if (doc.y > doc.page.height - FOOTER_BAND - 30) {
      doc.addPage();
      header(doc, contTitle);
      drawHeaderBand();
    }
    drawRow(p, i);
  });
}

// ── 1 · Cover ─────────────────────────────────────────────────────────────
function renderCover(doc: Doc, group: Group, pricing: PricingResult) {
  header(doc, "Group Medical Proposal");

  doc.moveDown(2);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(28)
    .text("Group Medical Proposal");
  doc.moveDown(0.3);
  doc.fillColor(ACCENT).font("Helvetica").fontSize(14).text("Prepared for");
  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(22)
    .text(group.companyName || "—");

  doc.moveDown(1.5);
  hr(doc);
  doc.moveDown(0.5);

  const labelW = 190;
  const rows: Array<[string, string]> = [
    ["Contact", group.contactName || "—"],
    ["Contact Email", group.contactEmail || "—"],
    ["Effective Date", fmtDateLong(pricing.effective_date)],
    ["Lives", String(pricing.n_members)],
    ["Employees", String(pricing.n_employees)],
    ["Rating Area", pricing.rating_area],
    ["Administrator", String(pricing.admin)],
    ["Prepared", fmtDateLong(new Date().toISOString().slice(0, 10))],
  ];
  doc.fontSize(11);
  for (const [k, v] of rows) {
    const y = doc.y;
    doc.fillColor(MUTED).font("Helvetica").text(k, MARGIN_L, y, { width: labelW });
    doc.fillColor(TEXT).font("Helvetica-Bold").text(v, MARGIN_L + labelW, y);
    doc.moveDown(0.3);
  }

  doc.moveDown(1.5);
  hr(doc);
  doc.moveDown(0.5);

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14).text("Executive Summary");
  doc.moveDown(0.3);
  doc.fillColor(TEXT).font("Helvetica").fontSize(11).text(
    `This proposal presents level-funded medical plan options for ${group.companyName}, ` +
    `covering ${pricing.n_members} covered lives (${pricing.n_employees} employees) with ` +
    `an effective date of ${fmtDateLong(pricing.effective_date)}. Rates are calculated ` +
    `using Kennion's composite rating engine, which applies the group's average employee ` +
    `age factor (${pricing.group_age_factor_ee.toFixed(4)}), the ${pricing.rating_area} ` +
    `area factor (${pricing.area_factor.toFixed(3)}), and an annualized trend adjustment ` +
    `to the actuary-certified base PMPM for each plan.`,
    { align: "left", lineGap: 2 },
  );
}

// ── 2 · Medical Plans ─────────────────────────────────────────────────────
function renderMedicalPlans(doc: Doc, group: Group, pricing: PricingResult) {
  doc.addPage();
  header(doc, "Medical Plans");

  sectionTitle(
    doc,
    "Medical Plans — Monthly Rates",
    `${group.companyName}  •  Effective ${fmtDateLong(pricing.effective_date)}  •  ${pricing.rating_area}  •  ${pricing.n_members} lives`,
  );

  const available = Object.keys(pricing.plan_rates);
  const plans = MEDICAL_PLAN_ORDER.filter((p) => available.includes(p));
  renderRateTable(doc, plans, pricing, "Medical Plans (cont.)");

  doc.moveDown(0.8);
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(9).text(
    "All rates are monthly and include plan benefits, stop-loss, administration, " +
    "and network access. Final rates are subject to completed underwriting, receipt " +
    "of required documentation, and any applicable state or federal adjustments.",
    { width: contentWidth(doc), align: "left" },
  );
}

// ── 3 · Supplemental & Virtual Care ──────────────────────────────────────
function renderSupplementalVirtual(doc: Doc, group: Group, pricing: PricingResult) {
  doc.addPage();
  header(doc, "Supplemental & Virtual Care");

  sectionTitle(
    doc,
    "Supplemental & Virtual Care — Monthly Rates",
    `${group.companyName}  •  Effective ${fmtDateLong(pricing.effective_date)}  •  ${pricing.rating_area}`,
  );

  const available = Object.keys(pricing.plan_rates);
  const supplemental = SUPPLEMENTAL_VIRTUAL_ORDER.filter((p) => available.includes(p));
  const accountedFor = new Set([...MEDICAL_PLAN_ORDER, ...SUPPLEMENTAL_VIRTUAL_ORDER]);
  const extras = available.filter((p) => !accountedFor.has(p)).sort();

  if (supplemental.length > 0) {
    renderRateTable(doc, supplemental, pricing, "Supplemental & Virtual Care (cont.)");
  } else {
    doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(11)
      .text("No supplemental or virtual-care plans are quoted for this group.");
  }

  if (extras.length > 0) {
    doc.moveDown(0.8);
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(12).text("Additional Plans");
    doc.moveDown(0.2);
    renderRateTable(doc, extras, pricing, "Additional Plans (cont.)");
  }

  doc.moveDown(0.8);
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(9).text(
    "Value Essential (MEC) is a Minimum Essential Coverage plan and does not " +
    "satisfy ACA Minimum Value. Virtual plans include unlimited virtual primary-care " +
    "visits; see the plan summary for in-person benefit details.",
    { width: contentWidth(doc), align: "left" },
  );
}

// ── 4 · Census Roster ─────────────────────────────────────────────────────
function renderCensus(doc: Doc, group: Group, census: CensusEntry[]) {
  doc.addPage();
  header(doc, "Census Roster");

  sectionTitle(
    doc,
    "Census Roster",
    `${group.companyName}  •  ${census.length} enrolled ${census.length === 1 ? "member" : "members"}`,
  );

  const pw = doc.page.width;
  const leftX = MARGIN_L;
  const rightX = pw - MARGIN_R;

  // Columns: #, Name, Relationship, Date of Birth, Gender, ZIP
  const colNumW = 26;
  const colRelW = 86;
  const colDobW = 84;
  const colGenderW = 60;
  const colZipW = 60;
  const colNameW = rightX - leftX - colNumW - colRelW - colDobW - colGenderW - colZipW;

  const cols = [
    { key: "#",     w: colNumW,    align: "right"  as const },
    { key: "Name",  w: colNameW,   align: "left"   as const },
    { key: "Role",  w: colRelW,    align: "left"   as const },
    { key: "DOB",   w: colDobW,    align: "left"   as const },
    { key: "Gender",w: colGenderW, align: "left"   as const },
    { key: "ZIP",   w: colZipW,    align: "left"   as const },
  ];
  const rowH = 16;

  function drawHeaderBand() {
    const y = doc.y;
    doc.save();
    doc.rect(leftX, y, rightX - leftX, rowH + 4).fill(NAVY);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
    let x = leftX + 8;
    cols.forEach((c) => {
      doc.text(c.key, x, y + 5, { width: c.w - 6, align: c.align, lineBreak: false });
      x += c.w;
    });
    doc.restore();
    doc.y = y + rowH + 8;
  }

  function drawRow(entry: CensusEntry, idx: number) {
    const y = doc.y;
    if (idx % 2 === 0) {
      doc.save().rect(leftX, y - 2, rightX - leftX, rowH).fill(ROW_ALT).restore();
    }
    doc.fillColor(TEXT).font("Helvetica").fontSize(9);
    const values = [
      String(idx + 1),
      `${entry.firstName} ${entry.lastName}`.trim(),
      relationshipLabel(entry.relationship),
      fmtDateShort(entry.dateOfBirth),
      entry.gender || "—",
      entry.zipCode || "—",
    ];
    let x = leftX + 8;
    cols.forEach((c, i) => {
      doc.text(values[i], x, y + 3, {
        width: c.w - 6,
        align: c.align,
        lineBreak: false,
        ellipsis: true,
      });
      x += c.w;
    });
    doc.y = y + rowH;
  }

  // Sort: Employees first (EE), then dependents grouped beneath; stable
  // within groups by last name. Makes the roster easy to scan family-by-family.
  const sorted = [...census].sort((a, b) => {
    const relOrder = (r: string) => (r === "EE" ? 0 : r === "SP" ? 1 : 2);
    const byRel = relOrder(a.relationship) - relOrder(b.relationship);
    if (byRel !== 0) return byRel;
    return (a.lastName || "").localeCompare(b.lastName || "");
  });

  drawHeaderBand();
  sorted.forEach((entry, i) => {
    if (doc.y > doc.page.height - FOOTER_BAND - 30) {
      doc.addPage();
      header(doc, "Census Roster (cont.)");
      drawHeaderBand();
    }
    drawRow(entry, i);
  });

  doc.moveDown(0.8);
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(9).text(
    "Census as submitted for underwriting. Contains protected health information — " +
    "handle in accordance with HIPAA. Treat this roster as confidential.",
    { width: contentWidth(doc), align: "left" },
  );
}

// ── 5 · Methodology ───────────────────────────────────────────────────────
function renderMethodology(doc: Doc, pricing: PricingResult) {
  doc.addPage();
  header(doc, "Rating Methodology");

  sectionTitle(doc, "How These Rates Were Calculated");

  doc.fillColor(TEXT).font("Helvetica").fontSize(11).text(
    "Kennion prices each plan using a deterministic, actuary-certified composite " +
    "formula. The rate for an \"Employee Only\" tier is built from four components:",
    { lineGap: 2 },
  );
  doc.moveDown(0.5);
  doc.font("Courier").fontSize(10).fillColor(ACCENT).text(
    "  EE rate  =  base_PMPM[plan]  ×  avg_EE_age_factor  ×  area_factor  ×  trend_adj",
  );
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(
    "Dependent tiers (Employee + Children, Employee + Spouse, Employee + Family) " +
    "are derived by applying the composite tier multipliers to the Employee Only rate:",
    { lineGap: 2 },
  );
  doc.moveDown(0.4);
  doc.font("Courier").fontSize(10).fillColor(ACCENT).text(
    "  EC  =  EE × 1.85     ES  =  EE × 2.00     EF  =  EE × 2.85",
  );
  doc.moveDown(0.8);
  hr(doc);
  doc.moveDown(0.4);

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14).text("Your Group's Factors");
  doc.moveDown(0.3);

  const factors: Array<[string, string]> = [
    ["Rating Area", pricing.rating_area],
    ["Area Factor", pricing.area_factor.toFixed(4)],
    ["Average EE Age Factor", pricing.group_age_factor_ee.toFixed(5)],
    ["All-Member Avg Age Factor", pricing.all_member_avg_age_factor.toFixed(5)],
    ["Trend Adjustment", pricing.trend_adjustment.toFixed(4)],
    ["Average Age (Employees)", pricing.avg_age.toFixed(1) + " yrs"],
    ["Tier Multipliers", `EE ${pricing.tier_factors.EE} / ECH ${pricing.tier_factors.ECH} / ESP ${pricing.tier_factors.ESP} / FAM ${pricing.tier_factors.FAM}`],
    ["Engine Version", pricing.engine_version],
    ["Factor Tables Version / SHA", `${pricing.factor_tables_version} / ${pricing.factor_tables_sha256.slice(0, 16)}`],
  ];
  doc.fontSize(11);
  const labelW = 230;
  for (const [k, v] of factors) {
    const y = doc.y;
    doc.fillColor(MUTED).font("Helvetica").text(k, MARGIN_L, y, { width: labelW });
    doc.fillColor(TEXT).font("Helvetica-Bold").text(v, MARGIN_L + labelW, y);
    doc.moveDown(0.25);
  }

  doc.moveDown(0.8);
  hr(doc);
  doc.moveDown(0.4);

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14).text("Auditability");
  doc.moveDown(0.3);
  doc.fillColor(TEXT).font("Helvetica").fontSize(11).text(
    "Every rate on this proposal is reproducible. Given the same census, the same " +
    "effective date, and the same factor table version (identified by the SHA above), " +
    "Kennion's rate engine will return byte-identical rates.",
    { lineGap: 2 },
  );
}

// ── 6 · Disclaimers ──────────────────────────────────────────────────────
function renderDisclaimers(doc: Doc) {
  doc.addPage();
  header(doc, "Disclaimers & Terms");

  sectionTitle(doc, "Disclaimers");

  doc.fillColor(TEXT).font("Helvetica").fontSize(10).text(
    "This proposal is presented for illustrative purposes and represents preliminary " +
    "rate indications based on the census data provided. Rates are subject to the following " +
    "terms and conditions:",
    { lineGap: 2 },
  );
  doc.moveDown(0.5);

  const items: string[] = [
    "Final rates are contingent upon completed underwriting review, including receipt of any requested documentation, prior claims experience, and medical history where applicable.",
    "Rate tables used in this proposal are maintained by a credentialed actuary and reviewed periodically. Kennion reserves the right to revise rates if the underlying actuarial tables are updated before policy issuance.",
    "Proposed plans are offered through a level-funded arrangement. Employer reimbursement obligations, claims fund requirements, and stop-loss coverage are detailed in the accompanying plan documents and summary of benefits.",
    "Rates quoted assume the census provided is complete and accurate as of the effective date. Material changes in group composition (greater than 10% change in enrolled lives or a material shift in dependent tiers) may trigger re-rating.",
    "This proposal does not constitute an offer of insurance. Coverage is bound only upon execution of an approved enrollment package and receipt of the initial funding.",
    "All rates exclude any applicable state premium taxes, assessments, or regulatory fees that may be charged in addition to the monthly rate.",
    "Kennion and its affiliates are not acting as a fiduciary or providing legal, tax, or accounting advice. The employer should consult its own advisors regarding plan selection and regulatory compliance (ERISA, ACA, HIPAA, and applicable state law).",
  ];

  for (const it of items) {
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11)
      .text("•", MARGIN_L, doc.y, { continued: true, lineGap: 2 });
    doc.fillColor(TEXT).font("Helvetica").fontSize(10).text("  " + it, { lineGap: 2 });
    doc.moveDown(0.3);
  }

  doc.moveDown(1);
  hr(doc);
  doc.moveDown(0.4);

  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(9).text(
    "Questions about this proposal? Contact your Kennion representative. " +
    "© Kennion Captive Health Solutions. All rights reserved.",
    { align: "center" },
  );
}

// ── Public entry point ────────────────────────────────────────────────────
export interface RenderProposalOutput {
  pdfBuffer: Buffer;
  fileName: string;
}

export async function renderProposalPdf(
  group: Group,
  pricing: PricingResult,
  census: CensusEntry[],
): Promise<RenderProposalOutput> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: {
          top: MARGIN_TOP,
          bottom: MARGIN_BOTTOM,
          left: MARGIN_L,
          right: MARGIN_R,
        },
        bufferPages: true,
        info: {
          Title: `${group.companyName} — Group Medical Proposal`,
          Author: "Kennion Captive Health Solutions",
          Subject: "Group Medical Proposal",
          Creator: "Kennion Rate Engine",
          Producer: `Kennion Rate Engine v${pricing.engine_version}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c as Buffer));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        const ts = new Date().toISOString().slice(0, 10);
        const fileName =
          `Proposal_${safeFileName(group.companyName || "group")}_${ts}.pdf`;
        resolve({ pdfBuffer, fileName });
      });
      doc.on("error", reject);

      renderCover(doc, group, pricing);
      renderMedicalPlans(doc, group, pricing);
      renderSupplementalVirtual(doc, group, pricing);
      if (census.length > 0) renderCensus(doc, group, census);
      renderMethodology(doc, pricing);
      renderDisclaimers(doc);

      // Stamp footers on every page now that layout is complete. Using
      // bufferPages + bufferedPageRange lets us include the final total
      // on the very first page.
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        renderFooterBand(doc, i + 1, range.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
