/**
 * Pure business logic: no SpreadsheetApp calls, so it runs in Apps Script
 * and in Node (for tests) unchanged.
 */

const REQUIRED_COLUMNS = {
  Orders: ['Date', 'Product', 'Qty', 'Unit Price', 'Status'],
  Inventory: ['Product', 'Stock', 'Reorder Level'],
};

/** Throws a readable error when a sheet is missing expected headers. */
function checkHeaders(sheetName, headerRow) {
  const have = headerRow.map((h) => String(h).trim());
  const missing = (REQUIRED_COLUMNS[sheetName] || []).filter((c) => !have.includes(c));
  if (missing.length) {
    throw new Error(`Sheet "${sheetName}" is missing column(s): ${missing.join(', ')}`);
  }
}

/** Turns a 2D sheet range (header row first) into objects keyed by header. */
function rowsToObjects(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim());
  return values
    .slice(1)
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

/**
 * Reads numbers typed as text: "$2.00", "1,250,000", "35.000 ₫", "3,50".
 * Returns null for blanks and text that is not a number.
 */
function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value === null || value === undefined ? '' : value).trim();
  let s = raw.replace(/[^0-9.,\-]/g, '');
  if (!/\d/.test(s)) return null;
  const vnd = /₫|vnđ|vnd|\dđ/i.test(raw);
  if (s.includes('.') && s.includes(',')) {
    // Whichever separator comes last is the decimal point.
    s = s.lastIndexOf('.') > s.lastIndexOf(',') ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    const tail = s.slice(s.lastIndexOf(',') + 1);
    s = tail.length === 3 ? s.replace(/,/g, '') : s.replace(/,(?=[^,]*$)/, '.').replace(/,/g, '');
  } else if (s.includes('.') && (vnd || s.split('.').length > 2)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toNumber(value) {
  const n = parseNumber(value);
  return n === null ? 0 : n;
}

const EXCLUDED_STATUS = /^(cancell?ed|refund(ed)?|void(ed)?)$/;

/** yyyy-mm-dd in the given IANA time zone, so daily totals follow the shop's day. */
function dayKey(date, timeZone) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  if (typeof Utilities !== 'undefined') {
    return Utilities.formatDate(d, timeZone || 'UTC', 'yyyy-MM-dd');
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Summarises completed orders.
 * Cancelled or refunded orders are excluded from revenue but counted separately.
 */
function summarizeOrders(orders, timeZone) {
  const byProduct = {};
  const byDay = {};
  let revenue = 0;
  let completed = 0;
  let excluded = 0;

  orders.forEach((o) => {
    const status = String(o['Status'] || '').trim().toLowerCase();
    if (EXCLUDED_STATUS.test(status)) {
      excluded += 1;
      return;
    }
    const qty = toNumber(o['Qty']);
    const amount = qty * toNumber(o['Unit Price']);
    const product = String(o['Product'] || 'Unknown').trim();
    const day = dayKey(o['Date'], timeZone) || 'Unknown date';

    byProduct[product] = byProduct[product] || { qty: 0, revenue: 0 };
    byProduct[product].qty += qty;
    byProduct[product].revenue += amount;
    byDay[day] = (byDay[day] || 0) + amount;
    revenue += amount;
    completed += 1;
  });

  const products = Object.keys(byProduct)
    .map((name) => ({ name, qty: byProduct[name].qty, revenue: byProduct[name].revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  const days = Object.keys(byDay)
    .sort()
    .map((day) => ({ day, revenue: byDay[day] }));

  return {
    revenue,
    completed,
    excluded,
    averageOrder: completed ? revenue / completed : 0,
    products,
    days,
  };
}

/**
 * Products whose stock is at or below their reorder level.
 * Rows with a blank or non-numeric Stock / Reorder Level are skipped, not alerted.
 */
function findLowStock(inventory) {
  return inventory
    .map((item) => ({
      product: String(item['Product'] || '').trim(),
      stock: parseNumber(item['Stock']),
      reorderLevel: parseNumber(item['Reorder Level']),
    }))
    .filter((item) => item.product && item.stock !== null && item.reorderLevel !== null)
    .filter((item) => item.stock <= item.reorderLevel)
    .sort((a, b) => a.stock - a.reorderLevel - (b.stock - b.reorderLevel));
}

function buildLowStockEmail(lowStock, shopName) {
  const lines = lowStock.map(
    (i) => `- ${i.product}: ${i.stock} left (reorder at ${i.reorderLevel})`
  );
  return {
    subject: `[${shopName}] ${lowStock.length} product(s) need restocking`,
    body: ['These products are at or below their reorder level:', '', ...lines].join('\n'),
  };
}

if (typeof module !== 'undefined') {
  module.exports = { checkHeaders, rowsToObjects, parseNumber, toNumber, dayKey, summarizeOrders, findLowStock, buildLowStockEmail };
}
