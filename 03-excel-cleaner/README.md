# Excel Cleaner

A Python command-line tool that turns a messy CSV or Excel export into a clean, review-ready Excel report.

**Before → after** (from `sample-data/`)

| Problem in the export | What the tool does |
|---|---|
| `  An   Nguyen ` and `Order ID ` with stray spaces | Trims and collapses whitespace in cells and headers |
| Blank rows, the same order entered twice | Removes blank rows and duplicates (by key columns you choose) |
| `north`, `NORTH `, `North` | Normalises categories to `North` |
| `AN.NGUYEN@Example.com ` | Lower-cases emails, flags invalid ones |
| `0901 234 567`, `(028) 3822 1234`, `84933111222` | Converts phones to `+84…` international format, flags wrong lengths |
| `1,250,000`, `45.500 ₫`, `$45.50`, `1.250,75`, `(1,234.50)` | Parses numbers in US, EU, Vietnamese and accounting formats |
| `03/10/2026`, `2026/10/04`, `5 Oct 2026`, `2026-10-04T10:00+07:00` | Parses mixed date formats (day-first by default; year-first dates always read correctly; time zones dropped because Excel cannot store them) |
| `not a date`, `abc` in a number column | Does **not** crash: leaves the cell empty and lists it for review |
| Comma or semicolon CSV, text like `=== TOTAL ===` | Detects the separator; text starting with `=` stays text, never becomes a live formula |

The output workbook has three sheets:

- **Cleaned**: the clean data, styled, with frozen headers.
- **Summary**: counts of what was changed, an optional group-by table and a bar chart.
- **Issues**: every cell that needs a human look, with its original spreadsheet row number (a CSV cell that contains a line break shifts later row numbers by one).

## Usage

```bash
uv sync
uv run excel-cleaner sample-data/customers_messy.csv -o sample-data/customers_cleaned.xlsx \
  --key "Order ID" --dates "Order Date" --numbers Amount --emails Email --phones Phone \
  --categories Region --group-by Region --sum Amount
```

```
7 rows in -> 5 rows out (duplicates removed: 1, blank rows removed: 1)
4 cells need review (see the Issues sheet)
```

Options: `--sheet` for Excel input, `--monthfirst` for US-style dates, `--country-code` for phone numbers outside Vietnam.

## Tests

```bash
uv run pytest
```

## Built with

Python 3.11, pandas, openpyxl. Logic is split into small, tested steps (`cleaning.py`), a pipeline (`pipeline.py`) and a thin CLI (`cli.py`), so it is easy to add client-specific rules.
