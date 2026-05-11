/**
 * Kennion Risk Screen — single-page PDF renderer.
 *
 * Drop-in: place at server/risk-screen-pdf.ts in the Kennion-Website repo.
 * Uses pdfkit (already in the dependency tree via server/proposal-pdf.ts).
 *
 * Layout (US Letter, single page):
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Header strip — group name, advisor, date, KRS hash    [TIER PILL]│
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Scorecard — Demo / Geo / Comp bars + AI Residual box              │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Group profile grid + age-band table                               │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ AI Summary (left) + Top 5 Drivers (right) + Decision band         │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * API:
 *   renderRiskScreenPDF(result, opts) -> Buffer
 */
import PDFDocument from "pdfkit";
import type { ScreenResult, RiskTier } from "./risk-screen";

export interface RenderOpts {
  groupName?: string;
  advisor?: string;
  censusId?: string;
}

const COLORS = {
  preferred: "#0F8A4A",   // green
  standard:  "#1F5BB5",   // blue
  highRisk:  "#B83A2A",   // red
  bg:        "#FFFFFF",
  text:      "#1A1A1A",
  muted:     "#6B7280",
  border:    "#D1D5DB",
  bookMedian:"#9CA3AF",
};

function tierColor(t: RiskTier): string {
  if (t === "Preferred") return COLORS.preferred;
  if (t === "High Risk") return COLORS.highRisk;
  return COLORS.standard;
}

function dollar(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(n: number, digits = 0): string {
  return (n * 100).toFixed(digits) + "%";
}

export function renderRiskScreenPDF(result: ScreenResult, opts: RenderOpts = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const M = 36;
    const innerW = W - 2 * M;

    // ── Band 1: Header strip ────────────────────────────────────────────
    let y = M;

    // Title
    doc.fillColor(COLORS.text)
       .font("Helvetica-Bold").fontSize(18)
       .text("Kennion Risk Screen", M, y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted)
       .text(`Model ${result.model_version}  ·  hash ${result.model_hash}`, M, y + 22);

    // Tier pill (top right)
    const pillW = 165, pillH = 50;
    const pillX = W - M - pillW;
    const pillY = y;
    doc.roundedRect(pillX, pillY, pillW, pillH, 8)
       .fillColor(tierColor(result.tier)).fill();
    doc.fillColor("white")
       .font("Helvetica-Bold").fontSize(14)
       .text(result.tier.toUpperCase(), pillX, pillY + 8, { width: pillW, align: "center" });
    doc.font("Helvetica-Bold").fontSize(20)
       .text(`KRI ${result.kri.toFixed(2)}`, pillX, pillY + 26, { width: pillW, align: "center" });

    y += 56;

    // Group + advisor + date strip
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(12)
       .text(opts.groupName || result.group || "Group", M, y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
    const meta = [
      opts.advisor ? `Advisor: ${opts.advisor}` : null,
      opts.censusId ? `Census ${opts.censusId}` : null,
      `Effective ${result.effective_date}`,
      `Scored ${result.scored_at.slice(0, 16).replace("T", " ")} UTC`,
    ].filter(Boolean).join("  ·  ");
    doc.text(meta, M, y + 14);

    y += 36;
    doc.moveTo(M, y).lineTo(W - M, y)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    y += 10;

    // ── Band 2: Scorecard (3 horizontal component bars + AI residual box) ─
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(11)
       .text("Component Scorecard", M, y);
    y += 18;

    const barLeft = M + 95;
    const barWidth = innerW - 95 - 130; // leave 130 for AI residual box on right
    const aiBoxX = M + innerW - 120;

    function drawBar(label: string, raw: number, normalized: number, contribution: number, drivers: string[]) {
      const barY = y;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.text)
         .text(label, M, barY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
         .text(drivers[0] || "", M, barY + 12, { width: 90 });

      // Background bar
      doc.roundedRect(barLeft, barY + 4, barWidth, 14, 3)
         .fillColor("#E5E7EB").fill();
      // Foreground bar (capped at 1.5x for visual)
      const visualNorm = Math.min(Math.max(normalized, 0.5), 1.6);
      const fillW = barWidth * ((visualNorm - 0.5) / 1.1);
      let color = COLORS.standard;
      if (normalized < 0.95) color = COLORS.preferred;
      else if (normalized >= 1.5) color = COLORS.highRisk;
      doc.roundedRect(barLeft, barY + 4, Math.max(fillW, 3), 14, 3)
         .fillColor(color).fill();
      // Book median line at normalized = 1.0
      const medX = barLeft + barWidth * ((1.0 - 0.5) / 1.1);
      doc.moveTo(medX, barY + 1).lineTo(medX, barY + 21)
         .strokeColor(COLORS.bookMedian).lineWidth(1).dash(2, { space: 2 }).stroke();
      doc.undash();

      // Value label
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.text)
         .text(normalized.toFixed(2), barLeft + barWidth + 6, barY + 6, { width: 30 });

      y += 30;
    }

    drawBar("Demographic", result.demographic.raw, result.demographic.normalized,
            result.demographic.contribution, result.demographic.drivers);
    drawBar("Geographic",  result.geographic.raw, result.geographic.normalized,
            result.geographic.contribution, result.geographic.drivers);
    drawBar("Composition", result.composition.raw, result.composition.normalized,
            result.composition.contribution, result.composition.drivers);

    // AI residual box (top right of scorecard band)
    const aiBoxY = y - 90;
    doc.roundedRect(aiBoxX, aiBoxY, 110, 90, 4)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.text)
       .text("AI Residual", aiBoxX + 6, aiBoxY + 6);
    const adj = result.ai_residual.clamped;
    const adjColor = adj > 0 ? COLORS.highRisk : adj < 0 ? COLORS.preferred : COLORS.muted;
    doc.font("Helvetica-Bold").fontSize(20).fillColor(adjColor)
       .text(`${adj >= 0 ? "+" : ""}${(adj * 100).toFixed(1)}%`, aiBoxX, aiBoxY + 28, { width: 110, align: "center" });
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.muted)
       .text("ML adjustment\nbounded to ±10%", aiBoxX, aiBoxY + 60, { width: 110, align: "center" });

    y += 8;
    doc.moveTo(M, y).lineTo(W - M, y)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    y += 10;

    // ── Band 3: Group profile grid ──────────────────────────────────────
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(11)
       .text("Group Profile", M, y);
    y += 16;

    const gridY = y;
    const gridCols = 4;
    const gridColW = innerW / gridCols;
    const cells: Array<[string, string]> = [
      ["Total Lives",      String(result.n_members)],
      ["Employees",        String(result.n_employees)],
      ["Spouses",          String(result.n_spouses)],
      ["Children",         String(result.n_children)],
      ["Median Age",       String(result.median_age)],
      ["Avg Age",          result.avg_age.toFixed(1)],
      ["Female %",         pct(result.pct_female)],
      ["Medicare-Cliff %", pct(result.pct_medicare_cliff)],
      ["Top County",       result.top_county],
      ["County Conc.",     pct(result.pct_top_county)],
      ["Family Tier %",
       `${pct((result.family_tier_mix.FAM) /
         Math.max(1, result.family_tier_mix.EE + result.family_tier_mix.ECH +
                     result.family_tier_mix.ESP + result.family_tier_mix.FAM))}`],
      ["Tier Mix",
       `EE ${result.family_tier_mix.EE} / ECH ${result.family_tier_mix.ECH} / ` +
       `ESP ${result.family_tier_mix.ESP} / FAM ${result.family_tier_mix.FAM}`],
    ];
    for (let i = 0; i < cells.length; i++) {
      const col = i % gridCols, row = Math.floor(i / gridCols);
      const cx = M + col * gridColW;
      const cy = gridY + row * 28;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
         .text(cells[i][0], cx, cy);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.text)
         .text(cells[i][1], cx, cy + 11, { width: gridColW - 6 });
    }
    y = gridY + Math.ceil(cells.length / gridCols) * 28 + 8;

    doc.moveTo(M, y).lineTo(W - M, y)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    y += 10;

    // ── Band 4: AI Summary + Top Drivers + Decision ─────────────────────
    const summaryW = innerW * 0.55;
    const driversX = M + summaryW + 12;
    const driversW = innerW - summaryW - 12;

    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(11)
       .text("AI Summary", M, y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.text)
       .text(result.ai_summary, M, y + 14, { width: summaryW, lineGap: 2 });

    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.text)
       .text("Top Risk Drivers", driversX, y);
    let dy = y + 14;
    for (const d of result.top_drivers) {
      doc.font("Helvetica-Bold").fontSize(8)
         .fillColor(d.impact > 0 ? COLORS.highRisk : COLORS.preferred)
         .text(`${d.impact >= 0 ? "+" : ""}${d.impact.toFixed(2)}`, driversX, dy, { width: 32 });
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.text)
         .text(`${d.category}: ${d.text}`, driversX + 34, dy, { width: driversW - 34, lineGap: 1 });
      dy += 16;
    }

    // Decision band at the bottom
    const decisionY = H - M - 40;
    let decisionLabel: string;
    let decisionColor: string;
    if (result.decision === "DECLINE") {
      decisionLabel = "DECISION:  DECLINE — DO NOT QUOTE";
      decisionColor = COLORS.highRisk;
    } else if (result.decision === "QUOTE_WITH_REVIEW") {
      decisionLabel = "DECISION:  QUOTE — UNDERWRITER REVIEW REQUIRED";
      decisionColor = COLORS.standard;
    } else {
      decisionLabel = "DECISION:  QUOTE";
      decisionColor = COLORS.preferred;
    }
    doc.roundedRect(M, decisionY, innerW, 30, 4)
       .fillColor(decisionColor).fill();
    doc.fillColor("white").font("Helvetica-Bold").fontSize(13)
       .text(decisionLabel, M, decisionY + 9, { width: innerW, align: "center" });

    // Footer
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.muted)
       .text(
         `Sources: AHRQ MEPS 2021–2023 (HC-233/243/251) · CDC PLACES 2024 release · HUD ZIP-COUNTY Q1 2025 · Kennion block experience  ·  ` +
         `Methodology: KRS-METHOD-v${result.model_version}  ·  hash ${result.model_hash}`,
         M, H - 14, { width: innerW, align: "center" }
       );

    doc.end();
  });
}
