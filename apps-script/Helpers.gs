/**
 * Helpers.gs
 * -----------------------------------------------------------------------------
 * Cross-cutting utilities: uuid, dates, sanitisation, safe JSON, logging.
 * -----------------------------------------------------------------------------
 */

const Helpers = (function () {

  function uuid() {
    return Utilities.getUuid();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  /** Basic HTML entity escape — server-side XSS defence for stored strings. */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** Recursively sanitise every string field in an object. */
  function sanitizeObject(obj) {
    if (obj == null) return obj;
    if (typeof obj === 'string') return escapeHtml(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
      const out = {};
      Object.keys(obj).forEach(function (k) { out[k] = sanitizeObject(obj[k]); });
      return out;
    }
    return obj;
  }

  /** Validate required fields — throws with a helpful message. */
  function requireFields(obj, fields) {
    fields.forEach(function (f) {
      if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
        throw new Error('Missing required field: ' + f);
      }
    });
  }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch (_) { return fallback == null ? null : fallback; }
  }

  function logError(context, err) {
    console.error('[ILM][' + context + ']', err && err.stack ? err.stack : err);
  }

  /** Human friendly date (used in UI helpers). */
  function daysAgo(iso) {
    const d = new Date(iso);
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  return {
    uuid, nowIso, escapeHtml, sanitizeObject,
    requireFields, safeParse, logError, daysAgo, clamp
  };
})();
