/**
 * Apps Script glue: reads the sheets, calls Logic.js, writes the Summary sheet,
 * and emails low-stock alerts. Copy Code.js and Logic.js into Extensions > Apps Script.
 */

const CONFIG = {
  ordersSheet: 'Orders',
  inventorySheet: 'Inventory',
  summarySheet: 'Summary',
  shopName: 'Demo Shop',
  // Leave empty to send alerts to the owner of the script.
  alertEmail: '',
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Shop Automation')
    .addItem('Refresh summary', 'refreshSummary')
    .addItem('Check low stock now', 'checkLowStock')
    .addSeparator()
    .addItem('Install daily triggers', 'installDailyTriggers')
    .addToUi();
}

function readObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
  const values = sheet.getDataRange().getValues();
  checkHeaders(sheetName, values[0] || []);
  return rowsToObjects(values);
}

function refreshSummary() {
  const ss = SpreadsheetApp.getActive();
  const summary = summarizeOrders(readObjects_(CONFIG.ordersSheet), ss.getSpreadsheetTimeZone());
  const sheet = ss.getSheetByName(CONFIG.summarySheet) || ss.insertSheet(CONFIG.summarySheet);
  sheet.clear();
  sheet.getCharts().forEach((c) => sheet.removeChart(c));

  const kpis = [
    ['Metric', 'Value'],
    ['Revenue', summary.revenue],
    ['Completed orders', summary.completed],
    ['Average order value', summary.averageOrder],
    ['Cancelled / refunded', summary.excluded],
    ['Last updated', new Date()],
  ];
  sheet.getRange(1, 1, kpis.length, 2).setValues(kpis);

  const productRows = [['Product', 'Qty sold', 'Revenue']].concat(
    summary.products.map((p) => [p.name, p.qty, p.revenue])
  );
  sheet.getRange(1, 4, productRows.length, 3).setValues(productRows);

  const dayRows = [['Day', 'Revenue']].concat(summary.days.map((d) => [d.day, d.revenue]));
  sheet.getRange(1, 8, dayRows.length, 2).setValues(dayRows);

  [sheet.getRange('A1:B1'), sheet.getRange('D1:F1'), sheet.getRange('H1:I1')].forEach((r) =>
    r.setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff')
  );
  sheet.getRange('B2').setNumberFormat('#,##0.00');
  sheet.getRange('B4').setNumberFormat('#,##0.00');
  sheet.getRange(2, 6, Math.max(productRows.length - 1, 1), 1).setNumberFormat('#,##0.00');
  sheet.getRange(2, 9, Math.max(dayRows.length - 1, 1), 1).setNumberFormat('#,##0.00');
  sheet.autoResizeColumns(1, 9);

  if (dayRows.length > 1) {
    const chart = sheet
      .newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(sheet.getRange(1, 8, dayRows.length, 2))
      // Right of the day table (column K), so it never covers the product list.
      .setPosition(1, 11, 0, 0)
      .setOption('title', 'Daily revenue')
      .setOption('legend', { position: 'none' })
      .build();
    sheet.insertChart(chart);
  }
}

function checkLowStock() {
  const lowStock = findLowStock(readObjects_(CONFIG.inventorySheet));
  if (lowStock.length === 0) return;
  const email = buildLowStockEmail(lowStock, CONFIG.shopName);
  const to = CONFIG.alertEmail || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(to, email.subject, email.body);
}

/** Runs the summary every morning and the stock check every evening. Safe to run twice. */
function installDailyTriggers() {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['refreshSummary', 'checkLowStock'].includes(t.getHandlerFunction()))
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('refreshSummary').timeBased().everyDays(1).atHour(7).create();
  ScriptApp.newTrigger('checkLowStock').timeBased().everyDays(1).atHour(18).create();
  SpreadsheetApp.getActive().toast('Daily triggers installed (7:00 summary, 18:00 stock check).');
}
