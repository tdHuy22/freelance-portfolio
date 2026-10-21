"""Cleaning steps for messy spreadsheet exports.

Each function takes a DataFrame and returns a new one; nothing is modified in place.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import pandas as pd

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$")
YEAR_FIRST_RE = re.compile(r"^\d{4}([-/.]\d{1,2}[-/.]\d{1,2}([ T].*)?|\d{4})$")
VND_RE = re.compile(r"₫|vnđ|vnd|\d\s*đ", re.IGNORECASE)
_SPACES = re.compile(r"\s+")


@dataclass
class CleanReport:
    rows_in: int = 0
    rows_out: int = 0
    blank_rows_removed: int = 0
    duplicates_removed: int = 0
    issues: list[dict] = field(default_factory=list)

    def add_issue(self, row: int, column: str, value, problem: str) -> None:
        self.issues.append({"Row": row, "Column": column, "Value": value, "Problem": problem})


def _is_text(series: pd.Series) -> bool:
    return pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series)


def normalize_headers(df: pd.DataFrame) -> pd.DataFrame:
    """Trims and collapses whitespace in column names; renames blanks to Column_N."""
    headers = []
    for i, col in enumerate(df.columns, start=1):
        name = _SPACES.sub(" ", str(col)).strip()
        headers.append(name if name and not name.startswith("Unnamed:") else f"Column_{i}")
    out = df.copy()
    out.columns = headers
    return out


def strip_text(df: pd.DataFrame) -> pd.DataFrame:
    """Trims text cells, collapses inner whitespace, and turns empty strings into missing values."""
    out = df.copy()
    for col in out.columns:
        if _is_text(out[col]):
            cleaned = out[col].map(lambda v: _SPACES.sub(" ", v).strip() if isinstance(v, str) else v)
            out[col] = cleaned.replace("", pd.NA)
    return out


def drop_blank_rows(df: pd.DataFrame, report: CleanReport) -> pd.DataFrame:
    out = df.dropna(how="all")
    report.blank_rows_removed = len(df) - len(out)
    return out


def title_case(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """'  north ', 'NORTH', 'North' all become 'North'."""
    out = df.copy()
    for col in columns:
        out[col] = out[col].map(lambda v: v.title() if isinstance(v, str) else v)
    return out


def clean_emails(df: pd.DataFrame, columns: list[str], report: CleanReport) -> pd.DataFrame:
    out = df.copy()
    for col in columns:
        def fix(v, row):
            if not isinstance(v, str):
                return v
            email = v.strip().lower().replace(" ", "")
            if not EMAIL_RE.match(email):
                report.add_issue(row, col, v, "invalid email")
            return email

        out[col] = [fix(v, row) for row, v in zip(out.index, out[col])]
    return out


def clean_phones(df: pd.DataFrame, columns: list[str], country_code: str, report: CleanReport) -> pd.DataFrame:
    """Keeps digits only and rewrites local numbers (leading 0) to +<country code>."""
    out = df.copy()
    for col in columns:
        def fix(v, row):
            if v is None or (not isinstance(v, str) and pd.isna(v)):
                return v
            raw = str(v)
            if raw.endswith(".0"):  # phone numbers read from Excel as floats
                raw = raw[:-2]
            raw = raw.replace("(0)", "")  # +84 (0)912 ... style
            digits = re.sub(r"\D", "", raw)
            if not digits:
                report.add_issue(row, col, v, "not a phone number")
                return v
            if raw.strip().startswith("+"):
                phone = "+" + digits
            elif digits.startswith("00"):
                phone = "+" + digits[2:]
            elif digits.startswith("0"):
                phone = f"+{country_code}{digits[1:]}"
            elif digits.startswith(country_code):
                phone = "+" + digits
            else:
                phone = f"+{country_code}{digits}"
            if not 9 <= len(phone) - 1 <= 15:
                report.add_issue(row, col, v, "phone number has the wrong length")
            return phone

        out[col] = [fix(v, row) for row, v in zip(out.index, out[col])]
    return out


def parse_numbers(df: pd.DataFrame, columns: list[str], report: CleanReport) -> pd.DataFrame:
    """'$1,234.50', '1 234,50 €' style strings -> floats. Unparseable values are reported and left empty."""
    out = df.copy()
    for col in columns:
        def fix(v, row):
            if isinstance(v, (int, float)) or v is None or pd.isna(v):
                return v
            text = str(v).strip()
            negative = text.startswith("(") and text.endswith(")")  # accounting style (1,234.50)
            vnd = bool(VND_RE.search(text))
            s = re.sub(r"[^\d,.\-]", "", str(v))
            if "." in s and "," not in s and (vnd or s.count(".") > 1):
                # 45.500 ₫ or 1.250.000: dots are thousands separators.
                s = s.replace(".", "")
            elif "," in s and "." in s:
                # Whichever separator comes last is the decimal point.
                s = s.replace(",", "") if s.rfind(".") > s.rfind(",") else s.replace(".", "").replace(",", ".")
            elif "," in s:
                head, _, tail = s.rpartition(",")
                s = s.replace(",", "") if len(tail) == 3 else f"{head.replace(',', '')}.{tail}"
            try:
                return -float(s) if negative else float(s)
            except ValueError:
                report.add_issue(row, col, v, "not a number")
                return pd.NA

        out[col] = pd.to_numeric(pd.Series([fix(v, r) for r, v in zip(out.index, out[col])], index=out.index))
    return out


def parse_dates(df: pd.DataFrame, columns: list[str], dayfirst: bool, report: CleanReport) -> pd.DataFrame:
    """Parses mixed date formats one cell at a time so one bad cell does not break the column."""
    out = df.copy()
    for col in columns:
        def fix(v, row):
            if v is None or (not isinstance(v, str) and pd.isna(v)):
                return pd.NaT
            # Year-first dates (2026-10-04, 2026/10/04, 20261004) are unambiguous;
            # dayfirst would swap their month and day.
            text = v.strip() if isinstance(v, str) else v
            if isinstance(text, str) and YEAR_FIRST_RE.match(text):
                fmt = "%Y%m%d" if text.isdigit() else None
                parsed = pd.to_datetime(text, format=fmt, dayfirst=False, errors="coerce")
            else:
                parsed = pd.to_datetime(text, dayfirst=dayfirst, errors="coerce")
            if pd.isna(parsed):
                report.add_issue(row, col, v, "unrecognised date")
                return pd.NaT
            # Excel cannot store time zones: keep the local wall-clock time.
            return parsed.tz_localize(None) if parsed.tzinfo else parsed

        out[col] = pd.to_datetime(pd.Series([fix(v, r) for r, v in zip(out.index, out[col])], index=out.index))
    return out


def drop_duplicates(df: pd.DataFrame, keys: list[str] | None, report: CleanReport) -> pd.DataFrame:
    """Keeps the first occurrence. With keys, rows that share those columns count as duplicates.

    Rows with an empty key are never treated as duplicates of each other.
    """
    if keys:
        has_key = df[keys].notna().all(axis=1)
        dupes = df[has_key].duplicated(subset=keys, keep="first")
        out = df.drop(index=dupes[dupes].index)
    else:
        out = df.drop_duplicates(keep="first")
    report.duplicates_removed = len(df) - len(out)
    return out
