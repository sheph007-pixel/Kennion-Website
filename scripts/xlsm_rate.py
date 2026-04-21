#!/usr/bin/env python3
"""Server-side rate engine that delegates to the actuary's xlsm.

Runs inside LibreOffice via python-uno so we can:
  1. Open the xlsm directly (VBA + named ranges preserved)
  2. Write inputs + census via the UNO API
  3. Force full formula recalculation via calculateAll()
  4. Read final rates back from '3. Rate Sheet - HDV'

This is more reliable than openpyxl-inject + soffice-recalc because
openpyxl round-tripping can drop named ranges/defined names that the
rate formulas depend on, and `soffice --convert-to xlsx` does NOT
force formula recalculation — it writes the cached values.
"""
from __future__ import annotations
import json, os, shutil, subprocess, sys, tempfile, time, uuid
from datetime import datetime
from pathlib import Path
from typing import Any

CENSUS_FIRST_ROW = 18          # 1-indexed in UI; 0-indexed in UNO = 17
CENSUS_MAX_ROWS = 300
# UNO uses 0-indexed rows/cols.  B4 → col 1, row 3.
INP_B4 = (1, 3)   # Group Name
INP_B5 = (1, 4)   # Effective Date
INP_B7 = (1, 6)   # Rating Area
INP_E7 = (4, 6)   # Administrator
# Census col indexes (1-indexed source → 0-indexed UNO)
CEN_COL_SSN  = 2   # C
CEN_COL_REL  = 3   # D
CEN_COL_FN   = 4   # E
CEN_COL_LN   = 5   # F
CEN_COL_DOB  = 6   # G
CEN_COL_COMPANY = 7   # H
CEN_COL_PLAN    = 8   # I
CEN_COL_COV     = 9   # J
CEN_COL_COST    = 10  # K
# HDV plan rows: 11..22 (1-indexed) → 10..21 (0-indexed)
HDV_PLAN_ROWS_0 = list(range(10, 22))


def _log(msg: str) -> None:
    sys.stderr.write(f"[xlsm_rate] {time.time():.1f} {msg}\n"); sys.stderr.flush()


def _fail(msg: str, extra: dict | None = None) -> None:
    out = {"error": msg}
    if extra: out.update(extra)
    sys.stdout.write(json.dumps(out) + "\n"); sys.exit(0)


def _norm_rel(rel: str) -> str:
    r = (rel or "").strip().lower()
    if r in ("ee","employee","emp","subscriber","self","primary"): return "Employee"
    if r in ("sp","spouse","partner") or "partner" in r: return "Spouse"
    return "Child"


def _parse_dob(s: str) -> datetime:
    s = (s or "").strip()
    for fmt in ("%Y-%m-%d","%m/%d/%Y","%m/%d/%y","%Y/%m/%d"):
        try: return datetime.strptime(s, fmt)
        except ValueError: continue
    raise ValueError(f"Unparseable DOB: {repr(s)}")


def _parse_eff(s: str) -> datetime:
    for fmt in ("%Y-%m-%d","%m/%d/%Y"):
        try: return datetime.strptime((s or "").strip(), fmt)
        except ValueError: continue
    raise ValueError(f"Unparseable effective_date: {repr(s)}")


def _admin_cell(admin: str) -> str:
    a = (admin or "").strip().upper()
    if a == "EBPA": return "EBPA "
    if "HEALTHEZ" in a and "RBP" in a: return "HEALTHEZ (RBP)"
    if a.replace("_","") == "HEALTHEZ": return "HEALTHEZ (RBP)"
    if a in ("CBA BLUE","CBA","CBA_BLUE"): return "CBA BLUE"
    if "CIGNA" in a: return "HEALTHEZ (CIGNA)"
    if "FREEDOM" in a: return "HEALTHEZ (FREEDOM)"
    return admin


def _area_cell(area: str) -> str:
    m = {"birmingham":"Birmingham","huntsville":"Huntsville",
         "montgomery":"Montgomery","alabama other area":"Alabama Other Area",
         "al other":"Alabama Other Area","out-of-state":"Out-of-State",
         "out of state":"Out-of-State","oos":"Out-of-State"}
    return m.get((area or "").strip().lower(), area or "Birmingham")


# ── UNO helpers ─────────────────────────────────────────────────────────────
def _start_soffice(profile_dir: Path, port: int) -> subprocess.Popen:
    cmd = [
        "soffice","--headless","--norestore","--nologo","--nocrashreport",
        "--nodefault","--nofirststartwizard","--nolockcheck",
        f"--accept=socket,host=127.0.0.1,port={port};urp;StarOffice.ServiceManager",
        f"-env:UserInstallation=file://{profile_dir}",
    ]
    _log(f"spawn soffice port={port}")
    return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _connect_uno(port: int, timeout: float = 45.0):
    import uno  # type: ignore
    deadline = time.time() + timeout
    last: Exception | None = None
    i = 0
    while time.time() < deadline:
        try:
            ctx = uno.getComponentContext()
            res = ctx.ServiceManager.createInstanceWithContext(
                "com.sun.star.bridge.UnoUrlResolver", ctx)
            sctx = res.resolve(
                f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext")
            desk = sctx.ServiceManager.createInstanceWithContext(
                "com.sun.star.frame.Desktop", sctx)
            _log(f"uno connect ok after {i} retries")
            return desk, sctx
        except Exception as e:
            last = e; time.sleep(0.4); i += 1
    raise RuntimeError(f"UNO connect timed out after {timeout}s: {last}")


def _prop(name: str, value: Any):
    from com.sun.star.beans import PropertyValue  # type: ignore
    p = PropertyValue(); p.Name = name; p.Value = value; return p


def _set_date(sheet, col: int, row: int, d: datetime) -> None:
    """Write a date into a cell as a numeric date-serial so Excel-style
    formulas work reliably."""
    # Excel/LO date serial: days since 1899-12-30
    epoch = datetime(1899, 12, 30)
    serial = (d - epoch).days
    cell = sheet.getCellByPosition(col, row)
    cell.setValue(serial)
    # Format as date (m/d/yyyy)
    try:
        nfs = cell.getPropertyValue("NumberFormat")  # read current
        # Apply standard date format if unset
        from com.sun.star.util import NumberFormat  # type: ignore
        # don't change if already a date; skip to keep simple
    except Exception:
        pass


def run_pipeline(template: Path, work: Path,
                 group: str, eff: datetime, area: str, admin: str,
                 census: list[dict[str, Any]]) -> dict[str, Any]:
    """End-to-end: open xlsm via UNO, inject, recalc, read rates, close."""
    import uno  # type: ignore

    token = uuid.uuid4().hex[:10]
    filled_xlsm = work / f"filled_{token}.xlsm"
    shutil.copy(template, filled_xlsm)
    _log(f"copied template -> {filled_xlsm} ({filled_xlsm.stat().st_size} bytes)")

    profile = work / f"up_{token}"
    profile.mkdir(parents=True, exist_ok=True)
    port = 2002 + (os.getpid() % 997) + (int(time.time()) % 100)
    proc = _start_soffice(profile, port)
    try:
        desktop, _ctx = _connect_uno(port, timeout=60.0)

        url = "file://" + str(filled_xlsm.resolve())
        _log(f"loadComponentFromURL {url}")
        # MacroExecutionMode=4 (ALWAYS_EXECUTE_NO_WARN) to allow any auto-macros
        load_props = (
            _prop("Hidden", True),
            _prop("ReadOnly", False),
            _prop("MacroExecutionMode", 4),
            _prop("UpdateDocMode", 1),  # QUIET_UPDATE
        )
        doc = desktop.loadComponentFromURL(url, "_blank", 0, load_props)
        if doc is None:
            raise RuntimeError("loadComponentFromURL returned None")

        sheets = doc.Sheets
        inp = sheets.getByName("Inputs")
        cen = sheets.getByName("Census")

        _log("writing Inputs")
        inp.getCellByPosition(*INP_B4).setString(group)
        _set_date(inp, *INP_B5, eff)
        inp.getCellByPosition(*INP_B7).setString(_area_cell(area))
        inp.getCellByPosition(*INP_E7).setString(_admin_cell(admin))

        _log(f"clearing + writing {len(census)} census rows")
        # Clear 0-indexed rows: CENSUS_FIRST_ROW-1 .. CENSUS_FIRST_ROW-1+CENSUS_MAX_ROWS
        for i in range(CENSUS_MAX_ROWS):
            r0 = CENSUS_FIRST_ROW - 1 + i
            for c0 in (CEN_COL_SSN, CEN_COL_REL, CEN_COL_FN, CEN_COL_LN,
                       CEN_COL_DOB, CEN_COL_COMPANY, CEN_COL_PLAN,
                       CEN_COL_COV, CEN_COL_COST):
                cell = cen.getCellByPosition(c0, r0)
                # setString("") doesn't always clear number formatting; use clearContents
                cell.setString("")
        for i, m in enumerate(census):
            if i >= CENSUS_MAX_ROWS: break
            r0 = CENSUS_FIRST_ROW - 1 + i
            cen.getCellByPosition(CEN_COL_SSN, r0).setString(f"SSN{i+1:05d}")
            cen.getCellByPosition(CEN_COL_REL, r0).setString(_norm_rel(m.get("relationship","")))
            cen.getCellByPosition(CEN_COL_FN,  r0).setString(str(m.get("first_name") or m.get("firstName") or f"M{i+1}"))
            cen.getCellByPosition(CEN_COL_LN,  r0).setString(str(m.get("last_name")  or m.get("lastName")  or "Doe"))
            dob = m.get("dob") or m.get("date_of_birth") or m.get("dateOfBirth")
            if dob:
                try:
                    dobd = dob if isinstance(dob, datetime) else _parse_dob(str(dob))
                    _set_date(cen, CEN_COL_DOB, r0, dobd)
                except Exception:
                    pass

        _log("calculateAll()")
        doc.calculateAll()
        try:
            # Extra pass in case deps depend on newly set cells that had cached values
            doc.calculate()
        except Exception:
            pass

        # Extract rates directly via UNO (avoid a second xlsx hop)
        hdv = sheets.getByName("3. Rate Sheet - HDV")
        rates: dict[str, dict[str, float | None]] = {}
        for r0 in HDV_PLAN_ROWS_0:
            name_cell = hdv.getCellByPosition(0, r0)
            plan = name_cell.getString().strip()
            if not plan:
                continue
            def gv(c: int) -> float | None:
                cell = hdv.getCellByPosition(c, r0)
                # CellContentType: 0=EMPTY,1=VALUE,2=TEXT,3=FORMULA
                try: ty = cell.getType()
                except Exception: ty = None
                v = cell.getValue()
                # getValue returns 0.0 for empty/text; use formula-aware check
                if ty is not None and int(ty) in (1, 3):
                    if v == v:  # non-NaN
                        return round(float(v), 2)
                return None
            rates[plan] = {
                "EE": gv(1), "EC": gv(2), "ES": gv(3), "EF": gv(4),
            }

        # Diagnostics pulled from key cells for debugging
        diag: dict[str, Any] = {}
        try:
            diag["inputs.B4"] = inp.getCellByPosition(*INP_B4).getString()
            diag["inputs.B5"] = inp.getCellByPosition(*INP_B5).getValue()
            diag["inputs.B7"] = inp.getCellByPosition(*INP_B7).getString()
            diag["inputs.E7"] = inp.getCellByPosition(*INP_E7).getString()
        except Exception as e:
            diag["inputs.err"] = str(e)
        try:
            rsa = sheets.getByName("Rate Summary All")
            # J131 = col 9, row 130 (0-indexed).  Deluxe Platinum MONTHLY RATE (HEALTHEZ/EBPA side)
            diag["rsa.J131"] = rsa.getCellByPosition(9, 130).getValue()
            diag["rsa.C131"] = rsa.getCellByPosition(2, 130).getValue()
            diag["rsa.J128"] = rsa.getCellByPosition(9, 127).getValue()
        except Exception as e:
            diag["rsa.err"] = str(e)
        try:
            # Count census-populated rows (col D relationship)
            pop = 0; tiers = []
            for i in range(50):
                r0 = CENSUS_FIRST_ROW - 1 + i
                if cen.getCellByPosition(CEN_COL_REL, r0).getString().strip():
                    pop += 1
                    # Column P = 15 (Medical Enrollment Tier)
                    tiers.append(cen.getCellByPosition(15, r0).getValue())
            diag["census.populated_rows"] = pop
            diag["census.first_tiers"] = tiers[:5]
        except Exception as e:
            diag["census.err"] = str(e)

        # Also save a recalc'd xlsx for audit (optional, doesn't block response)
        try:
            out_xlsx = work / f"recalc_{token}.xlsx"
            doc.storeToURL("file://" + str(out_xlsx.resolve()),
                (_prop("FilterName","Calc Office Open XML"), _prop("Overwrite", True)))
        except Exception as e:
            _log(f"storeToURL non-fatal: {e}")

        doc.close(True)
        return {"plan_rates": rates, "diagnostics": diag}
    finally:
        try:
            proc.terminate(); proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        except Exception:
            pass


def summary(census: list[dict[str, Any]], eff: datetime) -> dict[str, Any]:
    def age_at(dob_s: str):
        try: d = _parse_dob(dob_s)
        except Exception: return None
        y = eff.year - d.year
        if (eff.month, eff.day) < (d.month, d.day): y -= 1
        return max(0, y)
    n = len(census)
    ees = [m for m in census if _norm_rel(m.get("relationship", "")) == "Employee"]
    ages = [age_at(str(m.get("dob") or m.get("date_of_birth") or m.get("dateOfBirth") or "")) for m in census]
    ages = [a for a in ages if a is not None]
    return {"n_members": n, "n_employees": len(ees),
            "avg_age": round(sum(ages)/len(ages), 1) if ages else 0.0}


def main() -> None:
    try: req = json.loads(sys.stdin.read() or "{}")
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

    t0 = time.time()
    try:
        result = run_pipeline(Path(tpl), work, group, eff, area, admin, census)
    except Exception as e:
        _fail(f"pipeline: {e}")
    dt = time.time() - t0
    _log(f"pipeline done in {dt:.1f}s")

    sys.stdout.write(json.dumps({
        "engine_version": "xlsm-2.0-uno",
        "group": group, "effective_date": eff.strftime("%Y-%m-%d"),
        "rating_area": _area_cell(area), "admin": admin,
        **summary(census, eff),
        "plan_rates": result["plan_rates"],
        "diagnostics": result.get("diagnostics", {}),
        "timings_sec": {"total": round(dt, 2)},
    }) + "\n")


if __name__ == "__main__":
    main()
