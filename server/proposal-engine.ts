/**
 * Proposal Engine — injects census data into XLSM template,
 * runs LibreOffice to execute macros and export PDF.
 */
import XLSX from "xlsx";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { Group, CensusEntry } from "@shared/schema";
import { log } from "./index";

const PROPOSALS_DIR = path.join(process.cwd(), "uploads", "proposals");
const TEMPLATE_DIR = path.join(process.cwd(), "uploads", "templates");
const TEMP_DIR = path.join(process.cwd(), "uploads", "temp");

// Ensure directories exist
fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─── Age Calculation ──────────────────────────────────────────────────────

export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 30;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

export function getAgeBand(age: number): string {
  if (age <= 4) return "0-4";
  if (age <= 9) return "5-9";
  if (age <= 14) return "10-14";
  if (age <= 19) return "15-19";
  if (age <= 24) return "20-24";
  if (age <= 29) return "25-29";
  if (age <= 34) return "30-34";
  if (age <= 39) return "35-39";
  if (age <= 44) return "40-44";
  if (age <= 49) return "45-49";
  if (age <= 54) return "50-54";
  if (age <= 59) return "55-59";
  if (age <= 64) return "60-64";
  if (age <= 69) return "65-69";
  return "70+";
}

// ─── Template Sheet Inspection ────────────────────────────────────────────

export function getTemplateInfo(templatePath: string) {
  const buf = fs.readFileSync(templatePath);
  const wb = XLSX.read(buf, { type: "buffer", bookVBA: true });
  return {
    sheetNames: wb.SheetNames,
    hasVBA: !!wb.vbaraw,
  };
}

// ─── Census Data Injection ────────────────────────────────────────────────

/**
 * Inject census data into the XLSM template's Census sheet.
 * Returns the path to the modified temp file.
 */
export function injectCensusData(
  templatePath: string,
  group: Group,
  census: CensusEntry[],
  targetSheet: string = "Census"
): string {
  const buf = fs.readFileSync(templatePath);
  const wb = XLSX.read(buf, { type: "buffer", bookVBA: true });

  // Find target sheet (case-insensitive)
  let sheetName = wb.SheetNames.find(s => s === targetSheet)
    || wb.SheetNames.find(s => s.toLowerCase() === targetSheet.toLowerCase());

  if (!sheetName) {
    throw new Error(`Sheet "${targetSheet}" not found. Available: ${wb.SheetNames.join(", ")}`);
  }

  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  // Read headers from row 0
  const headers: Record<string, number> = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell && cell.v != null) {
      headers[String(cell.v).trim().toLowerCase()] = c;
    }
  }

  log(`Template headers found: ${JSON.stringify(headers)}`, "proposal");

  // Map census fields to template columns
  const fieldMappings: Record<string, string[]> = {
    relationship: ["relationship", "type", "relation", "coverage type", "member type", "dependent type"],
    firstName: ["first name", "firstname", "first", "first_name", "name first"],
    lastName: ["last name", "lastname", "last", "last_name", "name last"],
    dateOfBirth: ["date of birth", "dob", "dateofbirth", "birth date", "birthdate", "date_of_birth"],
    gender: ["gender", "sex"],
    zipCode: ["zip code", "zipcode", "zip", "postal code", "zip_code"],
    companyName: ["company name", "companyname", "company", "company_name", "group", "group name", "employer"],
  };

  const colMap: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(fieldMappings)) {
    for (const alias of aliases) {
      if (headers[alias] !== undefined) {
        colMap[field] = headers[alias];
        break;
      }
    }
  }

  log(`Column mapping: ${JSON.stringify(colMap)}`, "proposal");

  // Clear existing data rows (row 1+)
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      delete ws[XLSX.utils.encode_cell({ r, c })];
    }
  }

  // Normalize relationship values to what the template expects
  function normalizeRelationship(rel: string): string {
    const upper = rel.toUpperCase().trim();
    if (upper === "EE" || upper === "EMPLOYEE") return "Employee";
    if (upper === "SP" || upper === "SPOUSE") return "Spouse";
    if (upper === "CH" || upper === "CHILD" || upper === "DEP" || upper === "DEPENDENT") return "Child";
    return rel;
  }

  // Inject census data starting at row 1
  census.forEach((entry, i) => {
    const r = i + 1;

    const write = (col: number | undefined, val: string) => {
      if (col === undefined || val == null) return;
      ws[XLSX.utils.encode_cell({ r, c: col })] = { t: "s", v: val };
    };

    write(colMap.relationship, normalizeRelationship(entry.relationship));
    write(colMap.firstName, entry.firstName);
    write(colMap.lastName, entry.lastName);
    write(colMap.dateOfBirth, entry.dateOfBirth);
    write(colMap.gender, entry.gender);
    write(colMap.zipCode, entry.zipCode);
    write(colMap.companyName, group.companyName);
  });

  // Update sheet range
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: range.s.c },
    e: { r: Math.max(range.e.r, census.length), c: range.e.c },
  });

  // Write to temp file
  const tempPath = path.join(TEMP_DIR, `${group.id}_${Date.now()}.xlsm`);
  const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsm", bookVBA: true });
  fs.writeFileSync(tempPath, outBuf);

  log(`Injected ${census.length} rows into "${sheetName}", saved to ${tempPath}`, "proposal");
  return tempPath;
}

// ─── LibreOffice Macro Execution + PDF Export ─────────────────────────────

/**
 * Run LibreOffice headless to execute macros and export to PDF.
 *
 * Strategy:
 * 1. First try running the specific macro if we can detect it
 * 2. Then export the workbook to PDF via LibreOffice
 */
export function runLibreOfficeExportPDF(xlsmPath: string, groupId: string): string {
  const pdfFileName = `${groupId}_${Date.now()}.pdf`;
  const pdfPath = path.join(PROPOSALS_DIR, pdfFileName);

  // First, try to run the macro that calculates rates
  // LibreOffice can execute VBA macros with: macro://./Module.MacroName
  // We'll try common macro names the template might have
  const macroNames = [
    "DetermineMemberLevelFactors",
    "Determine_Member_Level_Factors",
    "CalculateRates",
    "RunCalculation",
    "Calculate",
  ];

  // Try to run macros with LibreOffice
  for (const macroName of macroNames) {
    try {
      log(`Attempting to run macro: ${macroName}`, "proposal");
      execSync(
        `libreoffice --headless --norestore --calc --infilter="MS Excel 2007 XML" ` +
        `"macro://./VBAProject.ThisWorkbook.${macroName}" "${xlsmPath}" 2>&1`,
        { timeout: 60000, stdio: "pipe" }
      );
      log(`Macro ${macroName} executed successfully`, "proposal");
      break;
    } catch (err: any) {
      log(`Macro ${macroName} failed or not found: ${err.message?.substring(0, 100)}`, "proposal");
      // Try next macro name or continue to PDF export
    }
  }

  // Also try module-level macros
  for (const macroName of macroNames) {
    try {
      execSync(
        `libreoffice --headless --norestore --calc ` +
        `"macro://./Standard.Module1.${macroName}" "${xlsmPath}" 2>&1`,
        { timeout: 60000, stdio: "pipe" }
      );
      log(`Macro Standard.Module1.${macroName} executed`, "proposal");
      break;
    } catch {
      // continue
    }
  }

  // Now export to PDF using LibreOffice
  try {
    log(`Exporting PDF from ${xlsmPath}`, "proposal");

    // LibreOffice converts to PDF in the same directory as the input
    execSync(
      `libreoffice --headless --norestore --calc --convert-to pdf ` +
      `--outdir "${PROPOSALS_DIR}" "${xlsmPath}"`,
      { timeout: 120000, stdio: "pipe" }
    );

    // Find the generated PDF (LibreOffice names it based on input filename)
    const baseName = path.basename(xlsmPath, ".xlsm");
    const generatedPdf = path.join(PROPOSALS_DIR, `${baseName}.pdf`);

    if (fs.existsSync(generatedPdf)) {
      // Rename to our desired filename
      fs.renameSync(generatedPdf, pdfPath);
      log(`PDF exported successfully: ${pdfPath}`, "proposal");
    } else {
      // Check for any new PDF files in the output directory
      const pdfFiles = fs.readdirSync(PROPOSALS_DIR).filter(f => f.endsWith(".pdf"));
      log(`PDF files in directory: ${pdfFiles.join(", ")}`, "proposal");
      throw new Error("LibreOffice did not produce a PDF file");
    }
  } catch (err: any) {
    log(`LibreOffice PDF export failed: ${err.message}`, "proposal");
    throw new Error(`PDF export failed: ${err.message}`);
  }

  return pdfPath;
}

// ─── Full Pipeline ────────────────────────────────────────────────────────

export interface ProposalResult {
  pdfPath: string;
  fileName: string;
  ratesData: any;
}

/**
 * Full proposal generation pipeline:
 * 1. Inject census data into template
 * 2. Run LibreOffice to execute macros + recalculate
 * 3. Export to PDF
 * 4. Clean up temp files
 */
export async function generateProposal(
  group: Group,
  census: CensusEntry[],
  targetSheet: string = "Census"
): Promise<ProposalResult> {
  // Find template
  const templates = fs.readdirSync(TEMPLATE_DIR).filter(f => /\.xlsm$/i.test(f));
  if (templates.length === 0) {
    throw new Error("No XLSM template uploaded. Please upload a template first.");
  }

  const templatePath = path.join(TEMPLATE_DIR, templates[0]);
  log(`Starting proposal generation for ${group.companyName} (${census.length} members)`, "proposal");

  // Step 1: Inject census data
  const tempXlsm = injectCensusData(templatePath, group, census, targetSheet);

  try {
    let pdfPath: string;

    // Try LibreOffice first (preserves template formatting + runs macros)
    try {
      pdfPath = runLibreOfficeExportPDF(tempXlsm, group.id);
    } catch (loErr: any) {
      log(`LibreOffice failed, falling back to pdfkit: ${loErr.message}`, "proposal");
      // Fallback: generate PDF using pdfkit
      const { generateProposalPDF } = await import("./pdf-generator");
      const { calculateProposalData } = await import("./proposal-engine-calc");
      const proposalData = calculateProposalData(group, census);
      const result = await generateProposalPDF(proposalData);
      pdfPath = result.filePath;
    }

    // Build summary data
    const ratesData = buildSummaryData(group, census);

    const companySlug = group.companyName.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Proposal_${companySlug}_${dateStr}.pdf`;

    return { pdfPath, fileName, ratesData };
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tempXlsm); } catch { /* ignore */ }
  }
}

/**
 * Build summary data for storage alongside the proposal.
 */
function buildSummaryData(group: Group, census: CensusEntry[]) {
  let employees = 0, spouses = 0, children = 0;
  let totalAge = 0;

  for (const entry of census) {
    const age = calculateAge(entry.dateOfBirth);
    totalAge += age;
    const rel = entry.relationship.toUpperCase();
    if (rel === "EE" || rel === "EMPLOYEE") employees++;
    else if (rel === "SP" || rel === "SPOUSE") spouses++;
    else children++;
  }

  return {
    totalLives: census.length,
    employees,
    spouses,
    children,
    averageAge: census.length > 0 ? totalAge / census.length : 0,
    generatedAt: new Date().toISOString(),
  };
}
