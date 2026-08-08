/**
 * API.gs
 * -----------------------------------------------------------------------------
 * Thin, versioned public API — the only functions exposed to google.script.run.
 * Every call is wrapped in `_safe` for uniform error shape + audit logging.
 *
 * Frontend always calls: google.script.run.API_<name>(payload).
 *
 * IMPORTANT: Each API_* entry MUST be a top-level `function` declaration.
 * google.script.run cannot invoke const/let bindings or object methods.
 * -----------------------------------------------------------------------------
 */

function _safe(fn) {
  return function (payload) {
    try {
      return { ok: true, data: fn(payload || {}) };
    } catch (err) {
      Helpers.logError('API', err);
      return { ok: false, error: String(err && err.message || err) };
    }
  };
}

// ---------- Bootstrap / session -------------------------------------------
function API_bootstrap(payload) {
  return _safe(function () {
    return {
      user: Auth.getCurrentUser(),
      auth: Auth.getAuthStatus(),
      config: {
        activityTypes: CONFIG.ACTIVITY_TYPES,
        features: CONFIG.FEATURES,
        appVersion: CONFIG.APP_VERSION
      }
    };
  })(payload);
}

function API_authStatus(payload)   { return _safe(function ()          { return Auth.getAuthStatus(); })(payload); }
function API_authPing(payload)     { return _safe(function ()          { return Auth.ping(); })(payload); }

// ---------- Courses --------------------------------------------------------
function API_listCourses(payload)      { return _safe(function ()          { return CourseService.listCourses(); })(payload); }
function API_getCourse(payload)        { return _safe(function (p)         { return CourseService.getCourse(p.id); })(payload); }
function API_createCourse(payload)     { return _safe(function (p)         { return CourseService.createCourse(p); })(payload); }
function API_updateCourse(payload)     { return _safe(function (p)         { return CourseService.updateCourse(p.id, p.patch); })(payload); }
function API_duplicateCourse(payload)  { return _safe(function (p)         { return CourseService.duplicateCourse(p.id); })(payload); }
function API_archiveCourse(payload)    { return _safe(function (p)         { return CourseService.archiveCourse(p.id); })(payload); }
function API_deleteCourse(payload)     { return _safe(function (p)         { return CourseService.deleteCourse(p.id); })(payload); }

// ---------- Activities -----------------------------------------------------
function API_listActivities(payload)   { return _safe(function (p)         { return ActivityService.listActivities(p.courseId, p); })(payload); }
function API_getActivity(payload)      { return _safe(function (p)         { return ActivityService.getActivity(p.id); })(payload); }
function API_createActivity(payload)   { return _safe(function (p)         { return ActivityService.createActivity(p); })(payload); }
function API_updateActivity(payload)   { return _safe(function (p)         { return ActivityService.updateActivity(p.id, p.patch); })(payload); }
function API_duplicateActivity(payload){ return _safe(function (p)         { return ActivityService.duplicateActivity(p.id); })(payload); }
function API_deleteActivity(payload)   { return _safe(function (p)         { return ActivityService.deleteActivity(p.id); })(payload); }
function API_getEmbedCode(payload)     { return _safe(function (p)         { return ActivityService.getEmbedCode(p.id); })(payload); }

// ---------- Student side (called from the iframe) --------------------------
function API_getActivityForStudent(payload) { return _safe(function (p)    { return ActivityService.getActivityForStudent(p.id); })(payload); }
function API_submitResponse(payload)   { return _safe(function (p)         { return ResponseService.submitResponse(p); })(payload); }
function API_toggleLike(payload)       { return _safe(function (p)         { return ResponseService.toggleLike(p); })(payload); }
function API_addComment(payload)       { return _safe(function (p)         { return ResponseService.addComment(p); })(payload); }
function API_listComments(payload)     { return _safe(function (p)         { return ResponseService.listComments(p.activityId); })(payload); }
function API_listPeerResponses(payload){ return _safe(function (p)        { return ResponseService.listPeerResponses(p); })(payload); }
function API_getChecklistStats(payload){ return _safe(function (p)         { return ResponseService.getChecklistStats(p.activityId); })(payload); }
function API_leaderboard(payload)      { return _safe(function (p)         { return GamificationService.leaderboard(p.courseId); })(payload); }
function API_myProgress(payload)       { return _safe(function (p)         { return GamificationService.myProgress(p.studentId); })(payload); }

// ---------- Lecturer analytics --------------------------------------------
function API_listResponses(payload)    { return _safe(function (p)         { return ResponseService.listResponses(p.activityId); })(payload); }
function API_listCourseResponses(payload) { return _safe(function (p)      { return ResponseService.listCourseResponses(p.courseId); })(payload); }
function API_courseAnalytics(payload)  { return _safe(function (p)         { return AnalyticsService.courseAnalytics(p.courseId); })(payload); }
function API_globalStats(payload)      { return _safe(function ()          { return AnalyticsService.globalStats(); })(payload); }
function API_aiSummary(payload)        { return _safe(function (p)         { return AIService.summarizeResponses(p.activityId); })(payload); }
function API_aiSentiment(payload)      { return _safe(function (p)         { return AIService.sentimentBreakdown(p.activityId); })(payload); }

// ---------- Notifications --------------------------------------------------
function API_notifications(payload)    { return _safe(function ()          { return NotificationService.inbox(); })(payload); }
function API_markRead(payload)         { return _safe(function (p)         { return NotificationService.markRead(p.id); })(payload); }
function API_announce(payload)         { return _safe(function (p)         { return NotificationService.announce(p.courseId, p.title, p.body); })(payload); }

// ---------- Admin ----------------------------------------------------------
function API_seedDemo(payload)         { return _safe(function ()          { return SeedData.seedAll(); })(payload); }
