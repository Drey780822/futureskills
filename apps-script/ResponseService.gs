/**
 * ResponseService.gs
 * -----------------------------------------------------------------------------
 * Student submissions, comments, likes/dislikes.
 * Student identity comes from browser fingerprint + Local Storage (no login).
 * -----------------------------------------------------------------------------
 */

const ResponseService = (function () {

  function submitResponse(input) {
    Auth.checkRateLimit('response.submit');
    Helpers.requireFields(input, ['activityId', 'studentId']);
    const a = Database.findOne(CONFIG.SHEETS.ACTIVITIES, { id: input.activityId });
    if (!a || a.status === CONFIG.STATUS.DELETED) throw new Error('Activity not available');

    const settings = Helpers.safeParse(a.settings, {});
    const anonymous = !!settings.anonymous;

    const resp = Helpers.sanitizeObject({
      id: Helpers.uuid(),
      activityId: input.activityId,
      courseId: a.courseId,
      studentId: input.studentId,
      studentName: anonymous ? '' : (input.studentName || ''),
      studentNumber: anonymous ? '' : (input.studentNumber || ''),
      anonymous: anonymous,
      payload: JSON.stringify(input.payload || {}),
      sentiment: '', aiSummary: '',
      createdBy: input.studentId,
      status: 'active',
    });
    Database.insert(CONFIG.SHEETS.RESPONSES, resp);

    // Fire-and-forget: AI enrichment (placeholder).
    try { AIService.enrichResponseAsync(resp.id); } catch (_) {}

    // Gamification hook
    try { GamificationService.awardForResponse(input.studentId, a.type); } catch (_) {}

    // Notify lecturer
    try {
      NotificationService.push(a.createdBy, {
        kind: 'response.new',
        title: 'New response in "' + a.title + '"',
        body: 'A student just responded.',
        link: '?view=lecturer&activityId=' + a.id
      });
    } catch (_) {}

    return { ok: true, responseId: resp.id };
  }

  function listResponses(activityId) {
    const a = Database.findOne(CONFIG.SHEETS.ACTIVITIES, { id: activityId });
    Auth.requireOwner(a);
    const rows = Database.findMany(CONFIG.SHEETS.RESPONSES, { activityId: activityId }, {
      sort: 'createdAt', desc: true
    });
    return rows.map(function (r) {
      r.payloadParsed = Helpers.safeParse(r.payload, {});
      return r;
    });
  }

  /** Aggregated stats for the "after submission" screen on checklists. */
  function getChecklistStats(activityId) {
    const rows = Database.findMany(CONFIG.SHEETS.RESPONSES, { activityId: activityId });
    const scores = rows.map(function (r) {
      const p = Helpers.safeParse(r.payload, {});
      return Number(p.score || 0);
    }).filter(function (n) { return !isNaN(n); });
    if (!scores.length) return { count: 0, avg: 0, median: 0, min: 0, max: 0, distribution: [] };
    scores.sort(function (a, b) { return a - b; });
    const sum = scores.reduce(function (s, n) { return s + n; }, 0);
    const buckets = [0, 0, 0, 0, 0]; // 0-20,20-40,40-60,60-80,80-100
    scores.forEach(function (s) { buckets[Helpers.clamp(Math.floor(s / 20), 0, 4)]++; });
    return {
      count: scores.length,
      avg: Math.round(sum / scores.length),
      median: scores[Math.floor(scores.length / 2)],
      min: scores[0], max: scores[scores.length - 1],
      distribution: buckets
    };
  }

  // ---------------------------------------------------------------- Likes ---
  function toggleLike(input) {
    Helpers.requireFields(input, ['targetType', 'targetId', 'actorId', 'value']);
    const existing = Database.findMany(CONFIG.SHEETS.LIKES, {
      targetType: input.targetType, targetId: input.targetId, actorId: input.actorId
    });
    if (existing.length) {
      const cur = existing[0];
      if (cur.value === input.value) {
        Database.softDelete(CONFIG.SHEETS.LIKES, cur.id);
        return { removed: true };
      }
      Database.update(CONFIG.SHEETS.LIKES, cur.id, { value: input.value });
      return { updated: true };
    }
    Database.insert(CONFIG.SHEETS.LIKES, {
      id: Helpers.uuid(), targetType: input.targetType, targetId: input.targetId,
      value: input.value, actorId: input.actorId, createdBy: input.actorId
    });
    return { created: true };
  }

  // ------------------------------------------------------------- Comments ---
  function addComment(input) {
    Auth.checkRateLimit('comment.add');
    Helpers.requireFields(input, ['activityId', 'authorId', 'body']);
    const c = Helpers.sanitizeObject({
      id: Helpers.uuid(),
      activityId: input.activityId,
      responseId: input.responseId || '',
      parentId: input.parentId || '',
      authorId: input.authorId,
      authorName: input.authorName || 'Student',
      authorRole: input.authorRole || 'student',
      body: input.body,
      pinned: !!input.pinned,
      createdBy: input.authorId
    });
    Database.insert(CONFIG.SHEETS.COMMENTS, c);
    return c;
  }

  function listComments(activityId) {
    return Database.findMany(CONFIG.SHEETS.COMMENTS, { activityId: activityId }, {
      sort: 'createdAt', desc: true
    });
  }

  return {
    submitResponse, listResponses, getChecklistStats,
    toggleLike, addComment, listComments
  };
})();
