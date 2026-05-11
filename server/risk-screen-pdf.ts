/**
 * Kennion Risk Screen — single-page PDF renderer.
 *
 * Hard one-page layout for US Letter. Every band has a fixed y-budget
 * so content never spills to a second page even at maximum width.
 */
import PDFDocument from "pdfkit";
import type { ScreenResult, RiskTier } from "./risk-screen";

export interface RenderOpts {
  groupName?: string;
  advisor?: string;
  censusId?: string;
}

const COLORS = {
  preferred: "#0F8A4A",
  standard:  "#1F5BB5",
  highRisk:  "#B83A2A",
  text:      "#1A1A1A",
  muted:     "#6B7280",
  border:    "#D1D5DB",
  median:    "#9CA3AF",
};

function tierColor(t: RiskTier): string {
  if (t === "Preferred") return COLORS.preferred;
  if (t === "High Risk") return COLORS.highRisk;
  return COLORS.standard;
}

function pct(n: number, d = 0): string {
  return (n * 100).toFixed(d) + "%";
}

export function renderRiskScreenPDF(result: ScreenResult, opts: RenderOpts = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 36, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const M = 36;
    const innerW = W - 2 * M;

    // Header strip
    let y = M;
    const pillW = 165, pillH = 56;
    const pillX = W - M - pillW;

    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(20)
       .text("Kennion Risk Screen", M, y);
    doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted)
       .text(`Model ${result.model_version}  ·  hash ${result.model_hash}`, M, y + 26);

    doc.roundedRect(pillX, y, pillW, pillH, 8)
       .fillColor(tierColor(result.tier)).fill();
    doc.fillColor("white").font("Helvetica-Bold").fontSize(13)
       .text(result.tier.toUpperCase(), pillX, y + 10, { width: pillW, align: "center" });
    doc.font("Helvetica-Bold").fontSize(20)
       .text(`KRI ${result.kri.toFixed(2)}`, pillX, y + 28, { width: pillW, align: "center" });
    y += 72;

    // Meta strip
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(12)
       .text(opts.groupName || result.group || "Group", M, y);
    doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted);
    const meta = [
      opts.advisor ? `Advisor: ${opts.advisor}` : null,
      opts.censusId ? `Census ${opts.censusId.slice(0, 28)}` : null,
      `Effective ${result.effective_date}`,
      `Scored ${result.scored_at.slice(0, 16).replace("T", " ")} UTC`,
    ].filter(Boolean).join("  ·  ");
    doc.text(meta, M, y + 14, { width: innerW });
    y += 28;

    doc.moveTo(M, y).lineTo(W - M, y)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    y += 8;

    // Scorecard
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(10.5)
       .text("Component Scorecard", M, y);
    y += 16;

    const aiBoxW = 110;
    const aiBoxX = W - M - aiBoxW;
    const aiBoxY = y;
    const labelX = M;
    const labelW = 75;
    const barLeft = M + labelW + 6;
    const barRight = aiBoxX - 16;
    const valueW = 32;
    const barWidth = barRight - barLeft - valueW;

    function drawBar(label: string, normalized: number) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.text)
         .text(label, labelX, y + 3, { width: labelW });
      doc.roundedRect(barLeft, y + 4, barWidth, 11, 2)
         .fillColor("#E5E7EB").fill();
      const visualNorm = Math.min(Math.max(normalized, 0.5), 1.6);
      const fillW = Math.max(3, barWidth * ((visualNorm - 0.5) / 1.1));
      const color =
        normalized < 0.95 ? COLORS.preferred :
        normalized >= 1.5 ? COLORS.highRisk  :
                            COLORS.standard;
      doc.roundedRect(barLeft, y + 4, fillW, 11, 2).fillColor(color).fill();
      const medX = barLeft + barWidth * ((1.0 - 0.5) / 1.1);
      doc.dash(2, { space: 2 }).strokeColor(COLORS.median).lineWidth(0.75)
         .moveTo(medX, y + 2).lineTo(medX, y + 17).stroke()
         .undash();
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.text)
         .text(normalized.toFixed(2), barRight - valueW + 2, y + 5,
               { width: valueW, align: "right" });
      y += 22;
    }
    drawBar("Demographic", result.demographic.normalized);
    drawBar("Geographic",  result.geographic.normalized);
    drawBar("Composition", result.composition.normalized);

    const aiBoxH = 66;
    doc.roundedRect(aiBoxX, aiBoxY, aiBoxW, aiBoxH, 4)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.muted)
       .text("AI Residual", aiBoxX, aiBoxY + 6, { width: aiBoxW, align: "center" });
    const adj = result.ai_residual.clamped;
    const adjColor = adj > 0.01 ? COLORS.highRisk : adj < -0.01 ? COLORS.preferred : COLORS.text;
    doc.font("Helvetica-Bold").fontSize(18).fillColor(adjColor)
       .text(`${adj >= 0 ? "+" : ""}${(adj * 100).toFixed(1)}%`, aiBoxX, aiBoxY + 22,
             { width: aiBoxW, align: "center" });
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.muted)
       .text("ML adjustment\nbounded to ±10%", aiBoxX, aiBoxY + 48,
             { width: aiBoxW, align: "center" });

    y = Math.max(y, aiBoxY + aiBoxH) + 6;

    doc.moveTo(M, y).lineTo(W - M, y)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    y += 8;

    // Group profile
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(10.5)
       .text("Group Profile", M, y);
    y += 16;

    const cells: Array<[string, string]> = [
      ["Total Lives",      String(result.n_members)],
      ["Employees",        String(result.n_employees)],
      ["Spouses",          String(result.n_spouses)],
      ["Children",         String(result.n_children)],
      ["Median Age",       String(result.median_age)],
      ["Avg Age",          result.avg_age.toFixed(1)],
      ["Female %",         pct(result.pct_female)],
      ["Medicare-Cliff %", pct(result.pct_medicare_cliff)],
      ["Top County",       result.top_county || "—"],
      ["County Conc.",     pct(result.pct_top_county)],
      ["Family Tier %",    pct(
        (result.family_tier_mix.FAM) /
        Math.max(1, result.family_tier_mix.EE + result.family_tier_mix.ECH +
                    result.family_tier_mix.ESP + result.family_tier_mix.FAM)
      )],
      ["Tier Mix",
       `EE ${result.family_tier_mix.EE} / ECH ${result.family_tier_mix.ECH} / ` +
       `ESP ${result.family_tier_mix.ESP} / FAM ${result.family_tier_mix.FAM}`],
    ];
    const gridCols = 4;
    const gridColW = innerW / gridCols;
    const gridY = y;
    for (let i = 0; i < cells.length; i++) {
      const col = i % gridCols, row = Math.floor(i / gridCols);
      const cx = M + col * gridColW;
      const cy = gridY + row * 28;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
         .text(cells[i][0], cx, cy);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.text)
         .text(cells[i][1], cx, cy + 10, { width: gridColW - 6, height: 14, ellipsis: true });
    }
    y = gridY + Math.ceil(cells.length / gridCols) * 28 + 4;

    doc.moveTo(M, y).lineTo(W - M, y)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    y += 8;

    // AI Summary + Top Drivers
    const colGap = 14;
    const summaryW = Math.floor(innerW * 0.45);
    const driversX = M + summaryW + colGap;
    const driversW = innerW - summaryW - colGap;

    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(10.5)
       .text("AI Summary", M, y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.text)
       .text(result.ai_summary, M, y + 14,
             { width: summaryW, lineGap: 2, height: 160, ellipsis: true });

    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COLORS.text)
       .text("Top Risk Drivers", driversX, y, { width: driversW });
    let dy = y + 14;
    if (!result.top_drivers || result.top_drivers.length === 0) {
      doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted)
         .text("Group scores near book median — no single factor dominates.",
               driversX, dy, { width: driversW });
    } else {
      for (const d of result.top_drivers) {
        const impactColor = d.impact > 0.01 ? COLORS.highRisk
                          : d.impact < -0.01 ? COLORS.preferred
                          : COLORS.muted;
        const chipW = 38;
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(impactColor)
           .text(`${d.impact >= 0 ? "+" : ""}${d.impact.toFixed(2)}`,
                 driversX, dy, { width: chipW });
        const txt = `${d.category}: ${d.text}`;
        const h = doc.heightOfString(txt, { width: driversW - chipW - 4, lineGap: 1 });
        doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.text)
           .text(txt, driversX + chipW + 4, dy,
                 { width: driversW - chipW - 4, lineGap: 1, height: h });
        dy += Math.max(h, 11) + 4;
        if (dy > y + 170) break;
      }
    }

    // Decision band (anchored bottom)
    const decisionY = H - M - 56;
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
       .text(decisionLabel, M, decisionY + 10, { width: innerW, align: "center" });

    // Footer
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.muted)
       .text(
         `AHRQ MEPS · CDC PLACES · HUD ZIP-COUNTY · Kennion block  ·  KRS-METHOD-v${result.model_version} · hash ${result.model_hash}`,
         M, H - M - 10, { width: innerW, align: "center", lineBreak: false }
       );

    doc.end();
  });
}
