/**
 * server/proposal-pdf.ts
 *
 * Native PDF renderer for group proposals. Consumes the output of
 * `priceGroup()` (server/rate-engine.ts) and produces a multi-page PDF:
 *
 *   1. Cover           — Kennion letterhead, group name, effective date, lives
 *   2. Health Plans    — 23-plan table with EE / EC / ES / EF columns
 *   3. Methodology     — base PMPM x age factor x area factor x trend
 *   4. Disclaimers     — legal/actuarial caveats
 *
 * Zero runtime dependency on LibreOffice/Excel. Uses `pdfkit` only.
 */

import PDFDocument from "pdfkit";
import type { Group } from "@shared/schema";
import type { PricingResult } from "./rate-engine";

// ── Kennion brand ─────────────────────────────────────────────────────────
const NAVY = "#0B2545";
const ACCENT = "#13315C";
const GOLD = "#C9A961";
const TEXT = "#1B1B1B";
const MUTED = "#6B7280";
const BORDER = "#D1D5DB";
const ROW_ALT = "#F4F6FA";

// ── Customer-facing plan names ────────────────────────────────────────────
// Internal name (from factor-tables.json) → display name on proposal.
// If a plan from plan_rates isn't in this map, the internal name is used.
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
  "Value Essential MEC": "Value Essential Plan",
  "AL Healthy 500": "AL Healthy 500",
  "Platinum": "Platinum",
  "Preferred Gold": "Preferred Gold",
  "Virtual 1,000": "Virtual 1,000",
  "Virtual 2,500": "Virtual 2,500",
  "Virtual 5,000": "Virtual 5,000",
  "Virtual 10,000": "Virtual 10,000",
};

// Plans considered "core" that appear on page 2. Everything else goes on
// the "Additional Plans" subsection so the primary sheet mirrors the
// customer's existing Health Plans template.
const CORE_PLAN_ORDER = [
  "Deluxe Platinum",
  "Choice Gold",
  "Basic Gold",
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
  "Value Essential MEC",
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
  // iso expected "YYYY-MM-DD"; avoid timezone wobble by parsing manually
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function safeFileName(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 80);
}

// ── Drawing helpers ───────────────────────────────────────────────────────
type Doc = InstanceType<typeof PDFDocument>;

function header(doc: Doc, title: string) {
  const pw = doc.page.width;
  doc.save();
  doc.rect(0, 0, pw, 62).fill(NAVY);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18)
    .text("KENNION", 48, 20, { continued: true })
    .font("Helvetica").fontSize(11).fillColor(GOLD)
    .text("   Captive Health Solutions", { continued: false });
  doc.font("Helvetica").fontSize(10).fillColor("#E5E7EB")
    .text(title, pw - 260, 24, { width: 220, align: "right" });
  doc.restore();
  doc.y = 90;
  doc.fillColor(TEXT);
}

function footer(doc: Doc) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const savedY = doc.y;
  doc.save();
  doc.fillColor(MUTED).font("Helvetica").fontSize(8)
    .text(
      "Kennion — Captive Health Solutions  •  Rates are illustrative and subject to final underwriting approval.",
      48, ph - 42, { width: pw - 96, align: "center", lineBreak: false },
    );
  doc.restore();
  doc.y = savedY;
}

function hr(doc: Doc, y?: number) {
  const yy = y ?? doc.y;
  const pw = doc.page.width;
  doc.save().strokeColor(BORDER).lineWidth(0.5)
    .moveTo(48, yy).lineTo(pw - 48, yy).stroke().restore();
  doc.y = yy + 8;
}

// ── Page 1 — Cover ────────────────────────────────────────────────────────
function renderCover(
  doc: Doc,
  group: Group,
  pricing: PricingResult,
  censusCount: number,
) {
  header(doc, "Group Medical Proposal");

  // Title block
  doc.moveDown(2);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(28)
    .text("Group Medical Proposal", { align: "left" });
  doc.moveDown(0.3);
  doc.fillColor(ACCENT).font("Helvetica").fontSize(14)
    .text("Prepared for", { align: "left" });
  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(22)
    .text(group.companyName || "—", { align: "left" });

  doc.moveDown(1.5);
  hr(doc);
  doc.moveDown(0.5);

  // Facts table
  const labelW = 190;
  const rows: Array<[string, string]> = [
    ["Contact",          group.contactName || "—"],
    ["Contact Email",    group.contactEmail || "—"],
    ["Effective Date",   fmtDateLong(pricing.effective_date)],
    ["Lives",            String(pricing.n_members)],
    ["Employees",        String(pricing.n_employees)],
    ["Rating Area",      pricing.rating_area],
    ["Administrator",    String(pricing.admin)],
    ["Prepared",         fmtDateLong(new Date().toISOString().slice(0, 10))],
  ];
  doc.fontSize(11);
  for (const [k, v] of rows) {
    const y = doc.y;
    doc.fillColor(MUTED).font("Helvetica").text(k, 48, y, { width: labelW });
    doc.fillColor(TEXT).font("Helvetica-Bold").text(v, 48 + labelW, y);
    doc.moveDown(0.3);
  }

  doc.moveDown(1.5);
  hr(doc);
  doc.moveDown(0.5);

  // Executive summary
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14)
    .text("Executive Summary");
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

// ── Page 2 — Health Plans table ───────────────────────────────────────────
function renderHealthPlans(
  doc: Doc,
  group: Group,
  pricing: PricingResult,
) {
  doc.addPage();
  header(doc, "Health Plans — Monthly Rates");

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(18)
    .text("Health Plans — Monthly Rates");
  doc.moveDown(0.2);
  doc.fillColor(MUTED).font("Helvetica").fontSize(10)
    .text(
      `${group.companyName}  •  Effective ${fmtDateLong(pricing.effective_date)}  •  ` +
      `${pricing.rating_area}  •  ${pricing.n_members} lives`,
    );
  doc.moveDown(0.6);

  const pw = doc.page.width;
  const leftX = 48;
  const rightX = pw - 48;
  const planColW = 220;
  const tierColW = (rightX - leftX - planColW) / 4;
  const rowH = 18;

  const allPlans = Object.keys(pricing.plan_rates);
  const corePlans = CORE_PLAN_ORDER.filter((p) => allPlans.includes(p));
  const extraPlans = allPlans.filter((p) => !corePlans.includes(p)).sort();

  function drawHeader() {
    const y = doc.y;
    doc.save();
    doc.rect(leftX, y, rightX - leftX, rowH + 4).fill(NAVY);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
    doc.text("Plan", leftX + 8, y + 5, { width: planColW - 8 });
    const tiers: Array<[string, string]> = [
      ["EE",  "Employee Only"],
      ["EC",  "Employee + Children"],
      ["ES",  "Employee + Spouse"],
      ["EF",  "Employee + Family"],
    ];
    tiers.forEach(([code, label], i) => {
      const tx = leftX + planColW + i * tierColW;
      doc.text(label, tx, y + 5, { width: tierColW, align: "center" });
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
    doc.text(display, leftX + 8, y + 2, { width: planColW - 8 });
    const values = [rate.EE, rate.EC, rate.ES, rate.EF];
    values.forEach((v, i) => {
      const tx = leftX + planColW + i * tierColW;
      doc.text(fmtUSD(v), tx, y + 2, { width: tierColW - 6, align: "right" });
    });
    doc.y = y + rowH;
  }

  function drawSectionTitle(s: string) {
    doc.moveDown(0.4);
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(12).text(s);
    doc.moveDown(0.2);
  }

  drawHeader();
  corePlans.forEach((p, i) => {
    if (doc.y > doc.page.height - 90) {
      doc.addPage();
      header(doc, "Health Plans — Monthly Rates (cont.)");
      drawHeader();
    }
    drawRow(p, i);
  });

  if (extraPlans.length > 0) {
    if (doc.y > doc.page.height - 140) {
      doc.addPage();
      header(doc, "Health Plans — Additional Plans");
    }
    drawSectionTitle("Additional Plans");
    drawHeader();
    extraPlans.forEach((p, i) => {
      if (doc.y > doc.page.height - 90) {
        doc.addPage();
        header(doc, "Health Plans — Additional Plans (cont.)");
        drawHeader();
      }
      drawRow(p, i);
    });
  }

  doc.moveDown(0.8);
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(9)
    .text(
      "All rates shown are monthly and include plan benefits, stop-loss, administration, " +
      "and network access. Final rates are subject to completed underwriting, receipt of " +
      "required documentation, and any applicable state or federal adjustments.",
      { width: rightX - leftX, align: "left" },
    );

}

// ── Page 3 — Methodology ──────────────────────────────────────────────────
function renderMethodology(doc: Doc, pricing: PricingResult) {
  doc.addPage();
  header(doc, "Rating Methodology");

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(18).text("How These Rates Were Calculated");
  doc.moveDown(0.6);

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
    ["Rating Area",                      pricing.rating_area],
    ["Area Factor",                      pricing.area_factor.toFixed(4)],
    ["Average EE Age Factor",            pricing.group_age_factor_ee.toFixed(5)],
    ["All-Member Avg Age Factor",        pricing.all_member_avg_age_factor.toFixed(5)],
    ["Trend Adjustment",                 pricing.trend_adjustment.toFixed(4)],
    ["Average Age (Employees)",          pricing.avg_age.toFixed(1) + " yrs"],
    ["Tier Multipliers",                 `EE ${pricing.tier_factors.EE} / ECH ${pricing.tier_factors.ECH} / ESP ${pricing.tier_factors.ESP} / FAM ${pricing.tier_factors.FAM}`],
    ["Engine Version",                   pricing.engine_version],
    ["Factor Tables Version / SHA",      `${pricing.factor_tables_version} / ${pricing.factor_tables_sha256.slice(0, 16)}`],
  ];
  doc.fontSize(11);
  const labelW = 230;
  for (const [k, v] of factors) {
    const y = doc.y;
    doc.fillColor(MUTED).font("Helvetica").text(k, 48, y, { width: labelW });
    doc.fillColor(TEXT).font("Helvetica-Bold").text(v, 48 + labelW, y);
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
    "Kennion's rate engine will return byte-identical rates. When your actuary updates " +
    "the rating factors, the version identifier changes so you can always tie a quoted " +
    "rate back to the precise table that produced it.",
    { lineGap: 2 },
  );

}

// ── Page 4 — Disclaimers ──────────────────────────────────────────────────
function renderDisclaimers(doc: Doc) {
  doc.addPage();
  header(doc, "Disclaimers & Terms");

  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(18).text("Disclaimers");
  doc.moveDown(0.5);

  doc.fillColor(TEXT).font("Helvetica").fontSize(10).text(
    "This proposal is presented for illustrative purposes and represents preliminary " +
    "rate indications based on the census data provided. Rates are subject to the following " +
    "terms and conditions:",
    { lineGap: 2 },
  );
  doc.moveDown(0.5);

  const items: string[] = [
    "Final rates are contingent upon completed underwriting review, including receipt " +
    "of any requested documentation, prior claims experience, and medical history where applicable.",
    "Rate tables used in this proposal are maintained by a credentialed actuary and " +
    "reviewed periodically. Kennion reserves the right to revise rates if the underlying " +
    "actuarial tables are updated before policy issuance.",
    "Proposed plans are offered through a level-funded arrangement. Employer reimbursement " +
    "obligations, claims fund requirements, and stop-loss coverage are detailed in the " +
    "accompanying plan documents and summary of benefits.",
    "Rates quoted assume the census provided is complete and accurate as of the effective " +
    "date. Material changes in group composition (greater than 10% change in enrolled lives " +
    "or a material shift in dependent tiers) may trigger re-rating.",
    "This proposal does not constitute an offer of insurance. Coverage is bound only upon " +
    "execution of an approved enrollment package and receipt of the initial funding.",
    "All rates exclude any applicable state premium taxes, assessments, or regulatory " +
    "fees that may be charged in addition to the monthly rate.",
    "Kennion and its affiliates are not acting as a fiduciary or providing legal, tax, " +
    "or accounting advice. The employer should consult its own advisors regarding " +
    "plan selection and regulatory compliance (ERISA, ACA, HIPAA, and applicable state law).",
  ];

  for (const it of items) {
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("•", 48, doc.y, { continued: true, lineGap: 2 });
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
  censusCount: number,
): Promise<RenderProposalOutput> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 48, bottom: 56, left: 48, right: 48 },
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

      renderCover(doc, group, pricing, censusCount);
      renderHealthPlans(doc, group, pricing);
      renderMethodology(doc, pricing);
      renderDisclaimers(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
