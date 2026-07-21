/**
 * Database.gs
 * -----------------------------------------------------------------------------
 * Google Sheets acts as our normalized database. This module provides a small
 * ORM-style layer: schema init, insert, update, findOne, findMany, delete.
 *
 * Design principles:
 *   - Single source of truth for schemas (SCHEMA below).
 *   - Every table has: id (PK), createdAt, updatedAt, createdBy, status.
 *   - Foreign keys are plain string columns — we validate on write.
 *   - Reads use batched getValues() calls; writes use appendRow / setValues.
 *   - A short-lived CacheService layer avoids re-reading hot tables.
 * -----------------------------------------------------------------------------
 */

const SCHEMA = {
  Users: [
    'id', 'email', 'name', 'role', 'picture',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Courses: [
    'id', 'name', 'code', 'description', 'semester', 'banner',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Modules: [
    'id', 'courseId', 'number', 'title', 'description',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Activities: [
    'id', 'courseId', 'moduleId', 'moduleNumber', 'sessionName',
    'type', 'title', 'body', 'tags', 'difficulty', 'estMinutes',
    'visibility', 'settings', // settings = JSON blob (activity-type specific)
    'pinned', 'scheduledAt', 'deadlineAt',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  ChecklistItems: [
    'id', 'activityId', 'position', 'label', 'icon', 'color', 'image',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Responses: [
    'id', 'activityId', 'courseId',
    'studentId', 'studentName', 'studentNumber', 'anonymous',
    'payload', // JSON: { text, checkedItemIds, score, ... }
    'sentiment', 'aiSummary',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Comments: [
    'id', 'activityId', 'responseId', 'parentId',
    'authorId', 'authorName', 'authorRole', 'body', 'pinned',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Likes: [
    'id', 'targetType', 'targetId', 'value', // +1 / -1
    'actorId', 'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Notifications: [
    'id', 'toUser', 'kind', 'title', 'body', 'link', 'read',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Analytics: [
    'id', 'courseId', 'activityId', 'metric', 'value', 'day',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  Settings: [
    'id', 'ownerEmail', 'key', 'value',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
  AuditLogs: [
    'id', 'action', 'actor', 'meta', 'createdAt'
  ],
  Gamification: [
    'id', 'studentId', 'xp', 'streak', 'lastActive', 'badges',
    'createdAt', 'updatedAt', 'createdBy', 'status'
  ],
};

const Database = (function () {

  // --------------------------------------------------------------------------
  // Bootstrapping
  // --------------------------------------------------------------------------

  function _props() { return PropertiesService.getScriptProperties(); }

  function getSpreadsheet() {
    const id = _props().getProperty(CONFIG.PROPS.DB_ID);
    if (id) {
      try { return SpreadsheetApp.openById(id); } catch (_) { /* recreate */ }
    }
    const ss = SpreadsheetApp.create(CONFIG.DB_NAME);
    _props().setProperty(CONFIG.PROPS.DB_ID, ss.getId());
    return ss;
  }

  function initDatabase() {
    const ss = getSpreadsheet();
    Object.keys(SCHEMA).forEach(function (sheetName) {
      let sh = ss.getSheetByName(sheetName);
      if (!sh) sh = ss.insertSheet(sheetName);
      const headers = SCHEMA[sheetName];
      const first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
      const missing = headers.some(function (h, i) { return first[i] !== h; });
      if (missing) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers])
          .setFontWeight('bold').setBackground('#111827').setFontColor('#ffffff');
        sh.setFrozenRows(1);
      }
    });
    // Remove default "Sheet1" if empty and not in schema
    const s1 = ss.getSheetByName('Sheet1');
    if (s1 && !SCHEMA['Sheet1'] && ss.getSheets().length > 1) ss.deleteSheet(s1);
    _props().setProperty(CONFIG.PROPS.INITIALIZED, '1');
    return ss.getId();
  }

  function resetDatabase() {
    const ss = getSpreadsheet();
    Object.keys(SCHEMA).forEach(function (name) {
      const sh = ss.getSheetByName(name);
      if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    });
  }

  // --------------------------------------------------------------------------
  // CRUD primitives
  // --------------------------------------------------------------------------

  function _sheet(name) {
    const sh = getSpreadsheet().getSheetByName(name);
    if (!sh) throw new Error('Unknown sheet: ' + name);
    return sh;
  }

  function _readAll(name) {
    const sh = _sheet(name);
    const last = sh.getLastRow();
    if (last < 2) return [];
    const headers = SCHEMA[name];
    const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
    return values.map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
  }

  function insert(name, obj) {
    const sh = _sheet(name);
    const headers = SCHEMA[name];
    if (!obj.id) obj.id = Helpers.uuid();
    if (!obj.createdAt) obj.createdAt = Helpers.nowIso();
    if (!obj.updatedAt) obj.updatedAt = obj.createdAt;
    if (!obj.status)    obj.status    = 'active';
    const row = headers.map(function (h) {
      const v = obj[h];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    sh.appendRow(row);
    _invalidate(name);
    return obj;
  }

  function bulkInsert(name, rows) {
    if (!rows || !rows.length) return [];
    const sh = _sheet(name);
    const headers = SCHEMA[name];
    const now = Helpers.nowIso();
    const values = rows.map(function (obj) {
      if (!obj.id) obj.id = Helpers.uuid();
      if (!obj.createdAt) obj.createdAt = now;
      if (!obj.updatedAt) obj.updatedAt = now;
      if (!obj.status)    obj.status    = 'active';
      return headers.map(function (h) {
        const v = obj[h];
        if (v === undefined || v === null) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
    });
    sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    _invalidate(name);
    return rows;
  }

  function findOne(name, where) {
    const rows = findMany(name, where, { limit: 1 });
    return rows[0] || null;
  }

  function findMany(name, where, opts) {
    where = where || {};
    opts = opts || {};
    const rows = _readAll(name).filter(function (r) {
      if (opts.includeDeleted !== true && r.status === CONFIG.STATUS.DELETED) return false;
      return Object.keys(where).every(function (k) { return r[k] === where[k]; });
    });
    if (opts.sort) {
      rows.sort(function (a, b) {
        const av = a[opts.sort], bv = b[opts.sort];
        return opts.desc ? (bv > av ? 1 : bv < av ? -1 : 0) : (av > bv ? 1 : av < bv ? -1 : 0);
      });
    }
    if (opts.offset) rows.splice(0, opts.offset);
    if (opts.limit)  rows.length = Math.min(rows.length, opts.limit);
    return rows;
  }

  function update(name, id, patch) {
    const sh = _sheet(name);
    const headers = SCHEMA[name];
    const last = sh.getLastRow();
    if (last < 2) throw new Error(name + ' is empty');
    const idCol = headers.indexOf('id') + 1;
    const ids = sh.getRange(2, idCol, last - 1, 1).getValues().map(function (r) { return r[0]; });
    const idx = ids.indexOf(id);
    if (idx === -1) throw new Error(name + ' row not found: ' + id);
    const rowNum = idx + 2;
    const row = sh.getRange(rowNum, 1, 1, headers.length).getValues()[0];
    const current = {};
    headers.forEach(function (h, i) { current[h] = row[i]; });
    const merged = Object.assign({}, current, patch, { updatedAt: Helpers.nowIso() });
    const newRow = headers.map(function (h) {
      const v = merged[h];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    sh.getRange(rowNum, 1, 1, headers.length).setValues([newRow]);
    _invalidate(name);
    return merged;
  }

  function softDelete(name, id) {
    return update(name, id, { status: CONFIG.STATUS.DELETED });
  }

  // --------------------------------------------------------------------------
  // Cache invalidation hooks
  // --------------------------------------------------------------------------
  function _invalidate(name) {
    try { CacheService.getScriptCache().remove('tbl:' + name); } catch (_) {}
  }

  return {
    initDatabase, resetDatabase, getSpreadsheet,
    insert, bulkInsert, findOne, findMany, update, softDelete
  };
})();
