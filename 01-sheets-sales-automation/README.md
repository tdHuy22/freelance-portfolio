# Google Sheets Sales & Stock Automation

A Google Apps Script add-on for small shops that track orders and stock in Google Sheets.

**What it does**

- Builds a **Summary** sheet from raw orders: total revenue, completed orders, average order value, revenue per product, revenue per day, and a daily revenue chart.
- Leaves cancelled / canceled, refunded and void orders out of revenue, but counts them.
- Reads prices typed as text in US, EU or Vietnamese format (`$2.00`, `1,250,000`, `35.000 ₫`).
- Stops with a clear message if a sheet is missing a required column.
- Groups daily totals by the spreadsheet's own time zone, so a late-night order lands on the right day.
- Emails the owner a list of products at or below their reorder level (rows with blank stock values are skipped, not alerted).
- Adds a **Shop Automation** menu and installs daily triggers (summary at 7:00, stock check at 18:00).

## Setup (5 minutes)

1. Create a Google Sheet with two tabs, `Orders` and `Inventory`, and import the files in `sample-data/` (File → Import → Upload → *Replace current sheet*).
2. Open **Extensions → Apps Script**, create two files `Code.gs` and `Logic.gs`, and paste in `Code.js` and `Logic.js`.
3. Edit `CONFIG` in `Code.gs` (shop name, alert email).
4. Reload the sheet. Use **Shop Automation → Refresh summary**. Google asks for permission the first time.
5. Optional: **Shop Automation → Install daily triggers**.

Expected columns:

| Orders | Inventory |
|---|---|
| Date, Order ID, Customer, Product, Qty, Unit Price, Status | Product, Stock, Reorder Level |

## How it is built

- `Logic.js` holds all calculations as plain functions with no Google API calls, so they are unit-tested in Node.
- `Code.js` is the thin layer that reads and writes sheets, sends mail, and manages triggers.

```bash
node --test
```

## Customising

Typical client requests that fit this structure: extra KPIs (top customers, refunds rate), weekly email reports, Slack or Telegram alerts instead of email, pulling orders from a form or a Shopify export.
