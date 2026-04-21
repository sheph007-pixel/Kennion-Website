/**
 * xlsm-backed rate engine.
 *
 * Spawns `scripts/xlsm_rate.py`, which:
 *   1. Copies Kennion Actuarial Rater.xlsm to a temp file
 *   2. Writes the group's census + inputs into it
 *   3. Runs `soffice --headless --calc --convert-to xlsx` to recalculate
 *   4. Reads the final rates back from `3. Rate Sheet - HDV`
 *   5. Emits JSON on stdout
 *
 * This guarantees the rates exactly match what the actuary's xlsm would
 * produce, because the xlsm IS the calc engine.
 *
 * Requires: Python 3, openpyxl (pip), libreoffice-calc (apt).  See nixpacks.toml.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import type { CensusEntry } from "@shared/schema";

const REPO_ROOT = path.resolve(process.cwd());
const TEMPLATE_PATH = path.resolve(REPO_ROOT, "Kennion Actuarial Rater.xlsm");
const PY_SCRIPT = path.resolve(REPO_ROOT, "scripts", "xlsm_rate.py");

export interface XlsmRateInput {
  census: Array<{
    relationship: string;
    firstName?: string | null;
    lastName?: string | null;
    dob: string | Date;         // any parseable form
    sex?: string | null;
    zip?: string | null;
  }>;
  effectiveDate: string | Date;
  ratingArea?: string;          // Birmingham | Huntsville | Montgomery | Alabama Other Area | Out-of-State
  admin?: string;               // EBPA | HEALTHEZ (RBP) | ...
  group?: string;
}

export interface XlsmRateResult {
  engine_version: string;
  group?: string;
  effective_date: string;
  rating_area: string;
  admin: string;
  n_members: number;
  n_employees: number;
  avg_age: number;
  plan_rates: Record<string, { EE: number | null; EC: number | null; ES: number | null; EF: number | null }>;
  timings_sec?: { inject: number; recalc: number; extract: number };
}

function isoDate(d: string | Date): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // US M/D/YYYY
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (us) {
    let y = +us[3];
    if (y < 100) y += y < 30 ? 2000 : 1900;
    return `${y}-${String(+us[1]).padStart(2, "0")}-${String(+us[2]).padStart(2, "0")}`;
  }
  // Best-effort: Date parse
  const p = new Date(s);
  if (!isNaN(p.getTime())) return p.toISOString().slice(0, 10);
  return s;
}

export async function priceGroupViaXlsm(input: XlsmRateInput): Promise<XlsmRateResult> {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`xlsm template not found at ${TEMPLATE_PATH}`);
  }
  if (!fs.existsSync(PY_SCRIPT)) {
    throw new Error(`xlsm_rate.py helper not found at ${PY_SCRIPT}`);
  }

  // Per-call temp dir (Python script writes filled xlsx + soffice profile here)
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "xrate_"));

  const req = {
    template_path: TEMPLATE_PATH,
    work_dir: workDir,
    group: input.group ?? "",
    effective_date: isoDate(input.effectiveDate),
    rating_area: input.ratingArea ?? "Birmingham",
    admin: input.admin ?? "EBPA",
    census: input.census.map((m) => ({
      relationship: m.relationship,
      first_name: m.firstName ?? "",
      last_name: m.lastName ?? "",
      dob: m.dob instanceof Date ? m.dob.toISOString().slice(0, 10) : String(m.dob),
      sex: m.sex ?? null,
      zip: m.zip ?? null,
    })),
  };

  try {
    const out = await runPy(req);
    const result = JSON.parse(out) as XlsmRateResult & { error?: string };
    if (result.error) throw new Error(`xlsm_rate.py: ${result.error}`);
    return result;
  } finally {
    // Cleanup in background
    fs.rm(workDir, { recursive: true, force: true }, () => {});
  }
}

function runPy(req: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [PY_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    let stdout = "";
    let stderr = "";
    py.stdout.on("data", (b: Buffer) => { stdout += b.toString(); });
    py.stderr.on("data", (b: Buffer) => { stderr += b.toString(); });
    py.on("error", (e) => reject(new Error(`spawn python3 failed: ${e.message}`)));
    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`python3 exit=${code} stderr=${stderr.slice(-500)} stdout=${stdout.slice(-300)}`));
        return;
      }
      resolve(stdout);
    });
    // Hard cap the whole invocation (soffice recalc + IO) at 180s
    const killer = setTimeout(() => {
      py.kill("SIGKILL");
      reject(new Error("xlsm_rate.py timed out after 180s"));
    }, 180_000);
    py.on("close", () => clearTimeout(killer));

    py.stdin.write(JSON.stringify(req));
    py.stdin.end();
  });
}

/** Adapter: convert Drizzle `census_entries` rows into the input shape the
 *  Python helper expects, then call it and return its result. */
export async function priceGroupFromCensusEntries(
  rows: CensusEntry[],
  opts: { effectiveDate: string | Date; ratingArea?: string; admin?: string; group?: string }
): Promise<XlsmRateResult> {
  const census = rows.map((r) => ({
    relationship: r.relationship,
    firstName: r.firstName,
    lastName: r.lastName,
    dob: r.dateOfBirth,
    sex: r.gender,
    zip: r.zipCode ?? null,
  }));
  return priceGroupViaXlsm({ census, ...opts });
}
