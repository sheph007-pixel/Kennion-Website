#!/usr/bin/env python3
"""Server-side rate engine that delegates to the actuary's xlsm.

Injects census + inputs into a copy of Kennion Actuarial Rater.xlsm, runs
LibreOffice headless to recalculate, and reads back the final rates from the
'3. Rate Sheet - HDV' tab (the actuary's customer-facing output).

Invoked via stdin/stdout JSON from server/rate-engine.ts.
"""
from __future__ import annotations
import json, os, shutil, subprocess, sys, tempfile, time, uuid
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from openpyxl import load_workbook
except ImportError:
    sys.stdout.write(json.dumps({"error": "openpyxl not installed"}) + "\n"); sys.exit(0)


CENSUS_FIRST_ROW = 18
CENSUS_MAX_ROWS = 300
INP_GROUP_NAME = "B4"
INP_EFF_DATE = "B5"
INP_RATING_AREA = "B7"
INP_ADMIN = "E7"

CEN_SSN, CEN_REL, CEN_FN, CEN_LN, CEN_DOB = 3, 4, 5, 6, 7
CEN_COMPANY, CEN_PLAN, CEN_COV, CEN_COST = 8, 9, 10, 11

# Plan rows on '3. Rate Sheet - HDV'. Col A=name, B=EE, C=EC, D=ES, E=EF
HDV_PLAN_ROWS = list(range(11, 23))


def _fail(msg: str, extra: dict | None = None) -> None:
    out = {"error": msg}
    if extra: out.update(extra)
    sys.stdout.write(json.dumps(out) + "\n"); sys.exit(0)


def _norm_rel(rel: str) -> str:
    r = (rel or "").strip().lower()
    if r in ("ee", "employee", "emp", "subscriber", "self", "primary"): return "Employee"
    if r in ("sp", "spouse", "partner") or "partner" in r: return "Spouse"
    return "Child"


def _parse_dob(s: str) -> datetime:
    s = (s or "").strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%Y/%m/%d"):
        try: return datetime.strptime(s, fmt)
        except ValueError: continue
    # Last-resort: split
    raise ValueError(f"Unparseable DOB: {s!r}")


def _parse_eff(s: str) -> datetime:
    s = (s or "").strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try: return datetime.strptime(s, fmt)
        except ValueError: continue
    raise ValueError(f"Unparseable effective_date: {s!r}")


def _admin_cell(admin: str) -> str:
    a = (admin or "").strip().upper()
    if a == "EBPA": return "EBPA "  # template dropdown has trailing space
    if "HEALTHEZ" in a and "RBP" in a: return "HEALTHEZ (RBP)"
    if a.replace("_", "") == "HEALTHEZ": return "HEALTHEZ (RBP)"
    if a in ("CBA BLUE", "CBA", "CBA_BLUE"): return "CBA BLUE"
    if "CIGNA" in a: return "HEALTHEZ (CIGNA)"
    if "FREEDOM" in a: return "HEALTHEZ (FREEDOM)"
    return admin


def _area_cell(area: str) -> str:
    m = {
        "birmingham": "Birmingham", "huntsville": "Huntsville",
        "montgomery": "Montgomery", "alabama other area": "Alabama Other Area",
        "al other": "Alabama Other Area", "out-of-state": "Out-of-State",
        "out of state": "Out-of-State", "oos": "Out-of-State",
    }
    return m.get((area or "").strip().lower(), area or "Birmingham")


def inject(xlsm: Path, out: Path, group: str, eff: datetime, area: str, admin: str,
           census: list[dict[str, Any]]) -> None:
    wb = load_workbook(xlsm, keep_vba=False, data_only=False, keep_links=False)
    inp = wb["Inputs"]
    inp[INP_GROUP_NAME] = group
    inp[INP_EFF_DATE] = eff
    inp[INP_RATING_AREA] = _area_cell(area)
    inp[INP_ADMIN] = _admin_cell(admin)

    cen = wb["Census"]
    # Clear existing rows
    for r in range(CENSUS_FIRST_ROW, CENSUS_FIRST_ROW + CENSUS_MAX_ROWS):
        for c in (CEN_SSN, CEN_REL, CEN_FN, CEN_LN, CEN_DOB, CEN_COMPANY, CEN_PLAN, CEN_COV, CEN_COST):
            cen.cell(r, c).value = None
    for i, m in enumerate(census):
        if i >= CENSUS_MAX_ROWS: break
        r = CENSUS_FIRST_ROW + i
        cen.cell(r, CEN_SSN).value = f"SSN{i+1:05d}"
        cen.cell(r, CEN_REL).value = _norm_rel(m.get("relationship", ""))
        cen.cell(r, CEN_FN).value = m.get("first_name") or m.get("firstName") or f"M{i+1}"
        cen.cell(r, CEN_LN).value = m.get("last_name") or m.get("lastName") or "Doe"
        dob = m.get("dob") or m.get("date_of_birth") or m.get("dateOfBirth")
        if dob:
            cen.cell(r, CEN_DOB).value = dob if isinstance(dob, datetime) else _parse_dob(str(dob))
    wb.save(out)


def recalc(in_xlsx: Path, out_dir: Path, timeout: int = 150) -> Path:
    profile = out_dir / ("sofp_" + uuid.uuid4().hex[:8])
    profile.mkdir(parents=True, exist_ok=True)
    cmd = [
        "soffice", "--headless", "--calc",
        "--nologo", "--nofirststartwizard", "--nocrashreport", "--nodefault",
        f"-env:UserInstallation=file://{profile}",
        "--convert-to", "xlsx", "--outdir", str(out_dir), str(in_xlsx),
    ]
    proc = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f"soffice rc={proc.returncode} stderr={proc.stderr.decode(errors='replace')[-500:]}")
    out_xlsx = out_dir / (in_xlsx.stem + ".xlsx")
    if not out_xlsx.exists():
        # Fall back to whatever xlsx it produced
        xlsxs = [f for f in out_dir.iterdir() if f.suffix.lower() == ".xlsx" and f.stem == in_xlsx.stem]
        if not xlsxs: raise RuntimeError(f"no xlsx produced in {out_dir}")
        out_xlsx = xlsxs[0]
    return out_xlsx


def extract(recalced: Path) -> dict[str, dict[str, float | None]]:
    wb = load_workbook(recalced, data_only=True, read_only=True, keep_links=False)
    ws = wb["3. Rate Sheet - HDV"]
    out: dict[str, dict[str, float | None]] = {}
    for r in HDV_PLAN_ROWS:
        name = ws.cell(r, 1).value
        if not name or not isinstance(name, str) or not name.strip(): continue
        def n(v: Any) -> float | None:
            if isinstance(v, (int, float)): return round(float(v), 2)
            return None
        out[name.strip()] = {
            "EE": n(ws.cell(r, 2).value),
            "EC": n(ws.cell(r, 3).value),
            "ES": n(ws.cell(r, 4).value),
            "EF": n(ws.cell(r, 5).value),
        }
    return out


def summary(census: list[dict[str, Any]], eff: datetime) -> dict[str, Any]:
    def age_at(dob_s: str) -> int | None:
        try: d = _parse_dob(dob_s)
        except Exception: return None
        y = eff.year - d.year
        if (eff.month, eff.day) < (d.month, d.day): y -= 1
        return max(0, y)
    n = len(census)
    ees = [m for m in census if _norm_rel(m.get("relationship", "")) == "Employee"]
    ages = [age_at(str(m.get("dob") or m.get("date_of_birth") or m.get("dateOfBirth") or "")) for m in census]
    ages = [a for a in ages if a is not None]
    return {"n_members": n, "n_employees": len(ees), "avg_age": round(sum(ages)/len(ages), 1) if ages else 0.0}


def main() -> None:
    try:
        req = json.loads(sys.stdin.read() or "{}")
    except Exception as e: _fail(f"bad stdin json: {e}")

    tpl = req.get("template_path")
    if not tpl or not Path(tpl).exists(): _fail(f"template missing: {tpl}")
    work = Path(req.get("work_dir") or tempfile.mkdtemp(prefix="xrate_"))
    work.mkdir(parents=True, exist_ok=True)

    try: eff = _parse_eff(str(req.get("effective_date", "")))
    except Exception as e: _fail(f"bad eff date: {e}")

    census = req.get("census") or []
    if not isinstance(census, list) or not census: _fail("census empty")

    group = str(req.get("group") or "Kennion Proposal")
    area = str(req.get("rating_area") or "Birmingham")
    admin = str(req.get("admin") or "EBPA")

    token = uuid.uuid4().hex[:10]
    filled = work / f"filled_{token}.xlsx"

    t0 = time.time()
    try: inject(Path(tpl), filled, group, eff, area, admin, census)
    except Exception as e: _fail(f"inject: {e}")
    t_inj = time.time() - t0

    t0 = time.time()
    try: rec = recalc(filled, work)
    except Exception as e: _fail(f"recalc: {e}", {"inject_sec": round(t_inj, 2)})
    t_rec = time.time() - t0

    t0 = time.time()
    try: rates = extract(rec)
    except Exception as e: _fail(f"extract: {e}")
    t_ex = time.time() - t0

    sys.stdout.write(json.dumps({
        "engine_version": "xlsm-1.0",
        "group": group,
        "effective_date": eff.strftime("%Y-%m-%d"),
        "rating_area": _area_cell(area),
        "admin": admin,
        **summary(census, eff),
        "plan_rates": rates,
        "timings_sec": {"inject": round(t_inj,2), "recalc": round(t_rec,2), "extract": round(t_ex,2)},
    }) + "\n")


if __name__ == "__main__":
    main()
