"""Command line entry point: excel-cleaner input.csv -o cleaned.xlsx [options]."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .pipeline import Options, clean, read_table, summarize, write_report


def _cols(value: str) -> list[str]:
    return [c.strip() for c in value.split(",") if c.strip()]


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="excel-cleaner", description="Clean a messy CSV or Excel export and write an Excel report.")
    p.add_argument("input", type=Path)
    p.add_argument("-o", "--output", type=Path, help="output .xlsx (default: <input>_cleaned.xlsx)")
    p.add_argument("--sheet", default=0, help="sheet name or index for Excel input")
    p.add_argument("--key", type=_cols, default=[], help="columns that identify a duplicate, comma separated")
    p.add_argument("--dates", type=_cols, default=[])
    p.add_argument("--numbers", type=_cols, default=[])
    p.add_argument("--emails", type=_cols, default=[])
    p.add_argument("--phones", type=_cols, default=[])
    p.add_argument("--categories", type=_cols, default=[], help="columns to normalise to Title Case")
    p.add_argument("--group-by")
    p.add_argument("--sum", dest="sum_column")
    p.add_argument("--monthfirst", action="store_true", help="read 03/04/2026 as March 4 (default: 3 April)")
    p.add_argument("--country-code", default="84", help="for local phone numbers (default: 84, Vietnam)")
    args = p.parse_args(argv)

    if not args.input.exists():
        p.error(f"file not found: {args.input}")
    sheet = int(args.sheet) if str(args.sheet).isdigit() else args.sheet
    output = args.output or args.input.with_name(f"{args.input.stem}_cleaned.xlsx")

    opts = Options(
        key_columns=args.key, date_columns=args.dates, number_columns=args.numbers,
        email_columns=args.emails, phone_columns=args.phones, category_columns=args.categories,
        group_by=args.group_by, sum_column=args.sum_column,
        dayfirst=not args.monthfirst, country_code=args.country_code,
    )
    try:
        df, report = clean(read_table(args.input, sheet), opts)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    try:
        write_report(df, report, summarize(df, opts), output)
    except OSError as e:
        print(f"error: cannot write {output}: {e.strerror or e} (is the file open in Excel?)", file=sys.stderr)
        return 1

    print(f"{report.rows_in} rows in -> {report.rows_out} rows out "
          f"(duplicates removed: {report.duplicates_removed}, blank rows removed: {report.blank_rows_removed})")
    print(f"{len(report.issues)} cells need review (see the Issues sheet)")
    print(f"Saved {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
