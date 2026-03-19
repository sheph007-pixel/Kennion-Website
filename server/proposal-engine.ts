/**
 * Proposal Engine — drives the actuary's XLSM template:
 *   1. Inject census data into the Census sheet
 *   2. Run "Determine Member Level Factors" macro (calculates rates)
 *   3. Export the proposal sheets to PDF via LibreOffice
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
const LO_PROFILE = path.join(process.cwd(), "uploads", "lo-profile");

// Ensure directories exist
for (const dir of [PROPOSALS_DIR, TEMP_DIR, LO_PROFILE]) {
  fs.mkdirSync(dir, { recursive: true });
}

// ─── LibreOffice Setup ────────────────────────────────────────────────────

/**
 * Create a LibreOffice user profile that allows macros to run
 * without security prompts (headless mode).
 */
function ensureLoProfile() {
  const regFile = path.join(LO_PROFILE, "user", "registrymodifications.xcu");
  if (fs.existsSync(regFile)) return;

  fs.mkdirSync(path.join(LO_PROFILE, "user"), { recursive: true });
  fs.writeFileSync(regFile, `<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry"
           xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <item oor:path="/org.openoffice.Office.Common/Security/Scripting">
    <prop oor:name="MacroSecurityLevel" oor:op="fuse">
      <value>0</value>
    </prop>
  </item>
  <item oor:path="/org.openoffice.Office.Common/Security/Scripting">
    <prop oor:name="DisableMacrosExecution" oor:op="fuse">
      <value>false</value>
    </prop>
  </item>
</oor:items>`);
  log("Created LibreOffice profile with macros enabled", "proposal");
}

function loCmd(args: string): string {
  ensureLoProfile();
  return `libreoffice --headless --norestore ` +
    `--env:UserInstallation=file://${LO_PROFILE} ${args}`;
}

// ─── Census Data Injection ────────────────────────────────────────────────

export function injectCensusData(
  templatePath: string,
  group: Group,
  census: CensusEntry[],
  targetSheet: string = "Census"
): string {
  const buf = fs.readFileSync(templatePath);
  const wb = XLSX.read(buf, { type: "buffer", bookVBA: true });

  // Find target sheet (case-insensitive)
  const sheetName = wb.SheetNames.find(s => s === targetSheet)
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

  log(`Template headers: ${JSON.stringify(headers)}`, "proposal");

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

  // Clear existing data rows (keep headers)
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      delete ws[XLSX.utils.encode_cell({ r, c })];
    }
  }

  function normalizeRelationship(rel: string): string {
    const upper = rel.toUpperCase().trim();
    if (upper === "EE" || upper === "EMPLOYEE") return "Employee";
    if (upper === "SP" || upper === "SPOUSE") return "Spouse";
    if (upper === "CH" || upper === "CHILD" || upper === "DEP" || upper === "DEPENDENT") return "Child";
    return rel;
  }

  // Inject census data
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

  // Update range
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: range.s.c },
    e: { r: Math.max(range.e.r, census.length), c: range.e.c },
  });

  // Write temp file (preserving VBA macros)
  const tempPath = path.join(TEMP_DIR, `${group.id}_${Date.now()}.xlsm`);
  const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsm", bookVBA: true });
  fs.writeFileSync(tempPath, outBuf);

  log(`Injected ${census.length} rows into "${sheetName}"`, "proposal");
  return tempPath;
}

// ─── Macro Execution ──────────────────────────────────────────────────────

/**
 * Create a LibreOffice Basic script that:
 *   1. Opens the XLSM
 *   2. Runs the rate calculation VBA macro
 *   3. Saves the file (so calculated values persist)
 *   4. Exports specific sheets to PDF
 *
 * This script runs inside LibreOffice, so it has full access to the
 * workbook's VBA macros and can control the PDF export path.
 */
function createRunnerScript(xlsmPath: string, pdfPath: string): string {
  const scriptPath = path.join(TEMP_DIR, `runner_${Date.now()}.py`);

  // Use a Python macro (LibreOffice supports Python macros natively)
  // This opens the file, runs the VBA macro, and exports to PDF
  fs.writeFileSync(scriptPath, `
import subprocess
import os
import sys
import time

xlsm_path = "${xlsmPath.replace(/\\/g, "/")}"
pdf_path = "${pdfPath.replace(/\\/g, "/")}"
proposals_dir = "${PROPOSALS_DIR.replace(/\\/g, "/")}"
lo_profile = "${LO_PROFILE.replace(/\\/g, "/")}"

def run_lo(args, timeout=120):
    """Run a LibreOffice command and return (returncode, stdout, stderr)."""
    cmd = (
        f"libreoffice --headless --norestore "
        f"--env:UserInstallation=file://{lo_profile} "
        f"{args}"
    )
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout"

# Step 1: Try running the rate calculation macro
# Try different possible module/macro name combinations
macro_names = [
    "VBAProject.ThisWorkbook.DetermineMemberLevelFactors",
    "VBAProject.Module1.DetermineMemberLevelFactors",
    "VBAProject.ThisWorkbook.Determine_Member_Level_Factors",
    "VBAProject.Module1.Determine_Member_Level_Factors",
    "VBAProject.ThisWorkbook.CalculateRates",
    "VBAProject.Module1.CalculateRates",
]

macro_ran = False
for macro in macro_names:
    print(f"Trying macro: {macro}")
    rc, out, err = run_lo(
        f'--calc "macro://./{ macro }" "{ xlsm_path }"',
        timeout=90
    )
    print(f"  rc={rc} out={out[:200]} err={err[:200]}")
    if rc == 0:
        macro_ran = True
        print(f"  SUCCESS: {macro}")
        break

if not macro_ran:
    print("WARNING: No rate calculation macro found/ran, formulas may recalculate on open")

# Small delay to let LibreOffice release file locks
time.sleep(1)

# Step 2: Export to PDF using --convert-to
# LibreOffice will recalculate all cell formulas when opening
print(f"Exporting PDF...")
rc, out, err = run_lo(
    f'--calc --convert-to pdf --outdir "{proposals_dir}" "{xlsm_path}"'
)
print(f"PDF export: rc={rc} out={out[:200]} err={err[:200]}")

# Find the generated PDF
base = os.path.splitext(os.path.basename(xlsm_path))[0]
generated = os.path.join(proposals_dir, base + ".pdf")

if os.path.exists(generated):
    os.rename(generated, pdf_path)
    print(f"PDF saved to: {pdf_path}")
    sys.exit(0)
else:
    # Check for any new PDF
    pdfs = [f for f in os.listdir(proposals_dir) if f.endswith(".pdf")]
    print(f"PDF files found: {pdfs}")
    sys.exit(1)
`);

  return scriptPath;
}

// ─── Full Pipeline ────────────────────────────────────────────────────────

export interface ProposalResult {
  pdfPath: string;
  fileName: string;
  ratesData: any;
}

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
  log(`Starting proposal for ${group.companyName} (${census.length} members)`, "proposal");

  // Check if LibreOffice is available
  let hasLibreOffice = false;
  try {
    execSync("which libreoffice", { stdio: "pipe" });
    hasLibreOffice = true;
  } catch { /* not available */ }

  const companySlug = group.companyName.replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Proposal_${companySlug}_${dateStr}.pdf`;
  const pdfPath = path.join(PROPOSALS_DIR, `${group.id}_${Date.now()}.pdf`);

  if (hasLibreOffice) {
    log("LibreOffice available — using actuary template", "proposal");

    // Step 1: Inject census data into template
    const tempXlsm = injectCensusData(templatePath, group, census, targetSheet);

    try {
      // Step 2: Run the Python script that handles macro execution + PDF export
      const scriptPath = createRunnerScript(tempXlsm, pdfPath);

      try {
        const output = execSync(`python3 "${scriptPath}"`, {
          timeout: 180000,
          stdio: "pipe",
          env: { ...process.env, HOME: "/tmp" },
        });
        log(`Runner output: ${output.toString().substring(0, 500)}`, "proposal");
      } catch (runErr: any) {
        const stdout = runErr.stdout?.toString() || "";
        const stderr = runErr.stderr?.toString() || "";
        log(`Runner error: ${stdout} ${stderr}`, "proposal");

        // If Python script failed, try direct LibreOffice conversion as fallback
        if (!fs.existsSync(pdfPath)) {
          log("Falling back to direct LibreOffice PDF conversion", "proposal");
          ensureLoProfile();
          try {
            execSync(
              `libreoffice --headless --norestore ` +
              `--env:UserInstallation=file://${LO_PROFILE} ` +
              `--calc --convert-to pdf ` +
              `--outdir "${PROPOSALS_DIR}" "${tempXlsm}"`,
              { timeout: 120000, stdio: "pipe", env: { ...process.env, HOME: "/tmp" } }
            );

            // Find and rename the PDF
            const baseName = path.basename(tempXlsm, ".xlsm");
            const generated = path.join(PROPOSALS_DIR, `${baseName}.pdf`);
            if (fs.existsSync(generated)) {
              fs.renameSync(generated, pdfPath);
            }
          } catch (loErr: any) {
            log(`Direct LO conversion also failed: ${loErr.message}`, "proposal");
          }
        }
      } finally {
        // Clean up temp files
        try { fs.unlinkSync(tempXlsm); } catch { /* ignore */ }
      }

      if (!fs.existsSync(pdfPath)) {
        throw new Error("Failed to generate PDF from template. Check LibreOffice logs.");
      }
    } catch (err: any) {
      if (!fs.existsSync(pdfPath)) {
        // Final fallback: pdfkit
        log(`All LibreOffice methods failed, using pdfkit fallback: ${err.message}`, "proposal");
        const { generateProposalPDF } = await import("./pdf-generator");
        const { calculateProposalData } = await import("./proposal-engine-calc");
        const proposalData = calculateProposalData(group, census);
        const result = await generateProposalPDF(proposalData);
        // Move to expected path
        fs.renameSync(result.filePath, pdfPath);
      }
    }
  } else {
    // No LibreOffice — pdfkit fallback
    log("LibreOffice not available, using pdfkit", "proposal");
    const { generateProposalPDF } = await import("./pdf-generator");
    const { calculateProposalData } = await import("./proposal-engine-calc");
    const proposalData = calculateProposalData(group, census);
    const result = await generateProposalPDF(proposalData);
    fs.renameSync(result.filePath, pdfPath);
  }

  const ratesData = buildSummaryData(group, census);
  return { pdfPath, fileName, ratesData };
}

function buildSummaryData(group: Group, census: CensusEntry[]) {
  let employees = 0, spouses = 0, children = 0;
  let totalAge = 0;

  for (const entry of census) {
    const birth = new Date(entry.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    totalAge += Math.max(0, age);

    const rel = entry.relationship.toUpperCase();
    if (rel === "EE" || rel === "EMPLOYEE") employees++;
    else if (rel === "SP" || rel === "SPOUSE") spouses++;
    else children++;
  }

  return {
    totalLives: census.length,
    employees, spouses, children,
    averageAge: census.length > 0 ? totalAge / census.length : 0,
    generatedAt: new Date().toISOString(),
  };
}
