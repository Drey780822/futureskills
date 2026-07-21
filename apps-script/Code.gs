/**
 * Code.gs
 * -----------------------------------------------------------------------------
 * Entry point for the ILM web app.
 *
 * Routes:
 *   ?view=lecturer  -> Full lecturer dashboard (requires Google auth)
 *   ?view=student   -> Student iframe view (identified by localStorage fingerprint)
 *   ?view=embed     -> Returns embeddable snippet (documented in README)
 *
 * The doGet router intentionally stays thin — all logic lives in service files.
 * -----------------------------------------------------------------------------
 */

function doGet(e) {
  try {
    // Ensure the Sheets database exists on first request.
    Database.initDatabase();

    const view = (e && e.parameter && e.parameter.view) || 'lecturer';
    const activityId = (e && e.parameter && e.parameter.activityId) || '';

    let template;
    if (view === 'student') {
      template = HtmlService.createTemplateFromFile('ui/Student');
      template.activityId = activityId;
      return template.evaluate()
        .setTitle(CONFIG.APP_NAME + ' — Student')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // Default: lecturer dashboard
    template = HtmlService.createTemplateFromFile('ui/Index');
    template.appName = CONFIG.APP_NAME;
    template.appVersion = CONFIG.APP_VERSION;
    template.user = Auth.getCurrentUser();
    return template.evaluate()
      .setTitle(CONFIG.APP_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    Helpers.logError('doGet', err);
    return HtmlService.createHtmlOutput(
      '<h1>Setup required</h1><p>' + Helpers.escapeHtml(err.message) + '</p>'
    );
  }
}

/** Include partial HTML files inside templates: <?!= include('ui/Styles') ?> */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * onInstall / onOpen — for the Sheets-container add-on flavour (optional).
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('ILM Admin')
      .addItem('Initialize Database', 'ILM_menuInit')
      .addItem('Seed Demo Data',      'ILM_menuSeed')
      .addItem('Reset Database',      'ILM_menuReset')
      .addToUi();
  } catch (_) { /* not attached to a spreadsheet */ }
}

function ILM_menuInit()  { Database.initDatabase();  SpreadsheetApp.getUi().alert('Database initialized'); }
function ILM_menuSeed()  { SeedData.seedAll();       SpreadsheetApp.getUi().alert('Demo data seeded'); }
function ILM_menuReset() { Database.resetDatabase(); SpreadsheetApp.getUi().alert('Database reset'); }
