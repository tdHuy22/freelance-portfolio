const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./Logic.js');

const orders = L.rowsToObjects([
  ['Date', 'Order ID', 'Customer', 'Product', 'Qty', 'Unit Price', 'Status'],
  ['2026-10-01T09:00:00Z', 'A1', 'An', 'Latte', 2, 3.5, 'Completed'],
  ['2026-10-01T10:00:00Z', 'A2', 'Binh', 'Croissant', 1, '$2.00', 'Completed'],
  ['2026-10-02T08:00:00Z', 'A3', 'Chi', 'Latte', 1, 3.5, 'cancelled'],
  ['2026-10-02T23:30:00Z', 'A4', 'Dung', 'Latte', 3, 3.5, 'Completed'],
  ['', '', '', '', '', '', ''],
]);

test('rowsToObjects skips blank rows', () => {
  assert.equal(orders.length, 4);
  assert.equal(orders[0]['Product'], 'Latte');
});

test('summarizeOrders excludes cancelled orders and parses prices', () => {
  const s = L.summarizeOrders(orders, 'UTC');
  assert.equal(s.completed, 3);
  assert.equal(s.excluded, 1);
  assert.equal(s.revenue, 7 + 2 + 10.5);
  assert.deepEqual(s.products[0], { name: 'Latte', qty: 5, revenue: 17.5 });
});

test('daily totals follow the shop time zone', () => {
  // 23:30 UTC on Oct 2 is already Oct 3 in Ho Chi Minh City (UTC+7).
  const s = L.summarizeOrders(orders, 'Asia/Ho_Chi_Minh');
  assert.deepEqual(s.days.map((d) => d.day), ['2026-10-01', '2026-10-03']);
});

test('findLowStock returns items at or below reorder level, most urgent first', () => {
  const inv = L.rowsToObjects([
    ['Product', 'Stock', 'Reorder Level'],
    ['Milk', 2, 10],
    ['Beans', 5, 5],
    ['Cups', 300, 100],
  ]);
  assert.deepEqual(
    L.findLowStock(inv).map((i) => i.product),
    ['Milk', 'Beans']
  );
});

test('buildLowStockEmail lists every product', () => {
  const email = L.buildLowStockEmail([{ product: 'Milk', stock: 2, reorderLevel: 10 }], 'Demo');
  assert.match(email.subject, /1 product/);
  assert.match(email.body, /Milk: 2 left \(reorder at 10\)/);
});

test('US spelling "Canceled" and "Refund" are excluded too', () => {
  const rows = L.rowsToObjects([
    ['Date', 'Product', 'Qty', 'Unit Price', 'Status'],
    ['2026-10-01', 'Tea', 1, 2, 'Canceled'],
    ['2026-10-01', 'Tea', 1, 2, 'refund'],
    ['2026-10-01', 'Tea', 1, 2, 'Completed'],
  ]);
  const s = L.summarizeOrders(rows, 'UTC');
  assert.equal(s.excluded, 2);
  assert.equal(s.revenue, 2);
});

test('parseNumber reads US, EU and VND text', () => {
  const cases = { '$2.00': 2, '1,250,000': 1250000, '35.000 ₫': 35000, '1.250.000': 1250000, '3,50': 3.5, '1.250,75': 1250.75, '': null, 'n/a': null };
  for (const [raw, expected] of Object.entries(cases)) assert.equal(L.parseNumber(raw), expected, raw);
});

test('blank or text stock values never trigger an alert', () => {
  const inv = L.rowsToObjects([
    ['Product', 'Stock', 'Reorder Level'],
    ['Tea', '', 5],
    ['Sugar', 'n/a', 5],
    ['Milk', 1, 5],
  ]);
  assert.deepEqual(L.findLowStock(inv).map((i) => i.product), ['Milk']);
});

test('checkHeaders names the missing columns', () => {
  assert.throws(() => L.checkHeaders('Orders', ['Date', 'Product', 'Qty']), /missing column\(s\): Unit Price, Status/);
  assert.doesNotThrow(() => L.checkHeaders('Inventory', ['Product', 'Stock', 'Reorder Level']));
});
